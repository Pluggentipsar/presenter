"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useInlineEdit } from "@/lib/inline-edit";
import type { Interaction, InteractionResponse, QuizOption } from "@/lib/interactions";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";
import { usePublishedLive } from "@/lib/published-live";

type OptionTone = "neutral" | "danger" | "success" | "accent";

interface PollOption {
  label: string;
  tone: OptionTone;
  /** Kort beskrivning (valfritt) — syns under etiketten. */
  description?: string;
}

interface LivePollProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /**
   * Unik nyckel för denna poll inom presentationen.
   * Används för att koppla till interaction-rader i Supabase.
   * Bör vara kort och beskrivande, t.ex. "zone-check".
   */
  pollKey: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista. Format: `- Label · tone · Description`
   * Tones: neutral | danger | success | accent
   */
  children?: ReactNode;
}

// ============================================================================
// Parsing
// ============================================================================

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseOptions(children: ReactNode): PollOption[] {
  const out: PollOption[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 1) return;
    const label = parts[0].trim();
    const toneRaw = (parts[1] ?? "neutral").trim().toLowerCase();
    const tone: OptionTone =
      toneRaw === "danger" || toneRaw === "success" || toneRaw === "accent" || toneRaw === "neutral"
        ? (toneRaw as OptionTone)
        : "neutral";
    const description = parts.slice(2).join(" · ").trim() || undefined;
    out.push({ label, tone, description });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function toneColor(tone: OptionTone, accent: string): string {
  switch (tone) {
    case "danger":
      return "#E84D4D";
    case "success":
      return "#5FB85A";
    case "accent":
      return accent;
    default:
      // Neutral ton = primärtext, följer temat (mörk på ljust, ljus på mörkt).
      return "var(--text)";
  }
}

// ============================================================================
// Huvud-template
// ============================================================================

/**
 * LivePoll — realtidsröstning kopplad till Supabase.
 *
 * När en aktiv session finns:
 *   1. Templaten skapar (eller hittar) en `interaction` med matchande pollKey
 *   2. Lyssnar på `interaction_responses` via Supabase Realtime
 *   3. Visualiserar röstfördelning som växande staplar
 *
 * Utan session (eller Supabase-config) → visar "Kräver aktiv session"-state.
 *
 * OBS: I audience-vyn renderar LivePoll en statisk preview — själva röstningen
 * sker via `InteractionAudiencePanel` som redan finns inbyggd.
 */
export function LivePoll({
  chapter,
  title,
  subtitle,
  pollKey,
  background,
  accent = "var(--accent)",
  overlay = 0.55,
  children,
}: LivePollProps) {
  const options = useMemo(() => parseOptions(children), [children]);
  // En foto-bakgrund renderas med mörk scrim (se resolveBackground) → texten
  // måste vara fast ljus oavsett tema. Utan foto följer bakgrunden temat och
  // texten ska använda --text/--text-muted så den blir mörk på ljust tema.
  const photoBg = !!background && (background.startsWith("/") || background.startsWith("http"));
  const primaryText = photoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedText = photoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";
  const { editMode } = useInlineEdit();
  const published = usePublishedLive(pollKey);
  const [localResponses, setResponses] = useState<InteractionResponse[]>([]);
  // Initial state beräknas synkront så vi slipper setState i effect body.
  // editMode → "idle"; utan Supabase-config → "no-session"; annars → "searching".
  const [localState, setState] = useState<
    "idle" | "searching" | "no-session" | "active" | "error"
  >(() => {
    if (editMode) return "idle";
    return isSupabaseConfigured() ? "searching" : "no-session";
  });
  const [localSessionCode, setSessionCode] = useState<string | null>(null);
  const responses = published?.responses ?? localResponses;
  const state = published?.state ?? localState;
  const sessionCode = published?.sessionCode ?? localSessionCode;
  const isPublished = published !== null;

  // Hitta eller skapa interaction baserat på pollKey + aktiv session
  useEffect(() => {
    if (editMode || isPublished) {
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      return;
    }

    let cancelled = false;
    let activeChannel: ReturnType<typeof sb.channel> | null = null;

    (async () => {

      // Försök hitta aktiv session via localStorage.
      // use-presenter-session.ts lagrar under nyckeln `presenter-session:{slug}`.
      // Vi scannar alla nycklar med det prefixet och tar den nyaste som inte
      // har gått ut, så LivePoll funkar oavsett vilken slug som är aktiv.
      let sessionId: string | null = null;
      try {
        const LS_PREFIX = "presenter-session:";
        let best: { id: string; code?: string; expires_at: string } | null = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(LS_PREFIX)) continue;
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw) as {
              id?: string;
              code?: string;
              expires_at?: string;
            };
            if (!parsed?.id || !parsed?.expires_at) continue;
            if (new Date(parsed.expires_at).getTime() < Date.now()) continue;
            if (
              !best ||
              new Date(parsed.expires_at).getTime() > new Date(best.expires_at).getTime()
            ) {
              best = {
                id: parsed.id,
                code: parsed.code,
                expires_at: parsed.expires_at,
              };
            }
          } catch {
            // skip corrupt entries
          }
        }
        if (best) {
          sessionId = best.id;
          if (best.code) setSessionCode(best.code);
        }
      } catch {
        // ignore
      }

      if (!sessionId) {
        if (!cancelled) setState("no-session");
        return;
      }

      // Leta efter befintlig interaction med matchande prompt (vi använder pollKey
      // som prefix i prompten för att kunna matcha)
      const promptKey = `[${pollKey}]`;
      const { data: existing } = await sb
        .from("interactions")
        .select("*")
        .eq("session_id", sessionId)
        .ilike("prompt", `${promptKey}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      let current: Interaction | null = existing as Interaction | null;

      if (!current) {
        // Skapa ny interaction med pollKey i prompten
        const quizOptions: QuizOption[] = options.map((o) => ({ text: o.label }));
        const fullPrompt = `${promptKey} ${title ?? "Live-poll"}`;
        const { data: created, error } = await sb
          .from("interactions")
          .insert({
            session_id: sessionId,
            type: "quiz",
            prompt: fullPrompt,
            options: quizOptions,
            slide_index: null,
          })
          .select("*")
          .single();
        if (error || !created) {
          if (!cancelled) setState("error");
          return;
        }
        current = created as Interaction;
      }

      if (cancelled) return;
      setState("active");

      // Hämta befintliga svar
      const { data: existingResponses } = await sb
        .from("interaction_responses")
        .select("*")
        .eq("interaction_id", current.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (existingResponses) setResponses(existingResponses as InteractionResponse[]);

      if (cancelled) return;

      // Unik kanal per mount så vi aldrig återanvänder en redan-subscribad
      const nonce =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10);
      const channel = sb.channel(`poll:${current.id}:${nonce}`);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interaction_responses",
          filter: `interaction_id=eq.${current.id}`,
        },
        (payload) => {
          setResponses((prev) => [...prev, payload.new as InteractionResponse]);
        }
      );
      channel.subscribe();
      activeChannel = channel;
    })();

    return () => {
      cancelled = true;
      if (activeChannel) {
        const sb2 = getSupabase();
        if (sb2) sb2.removeChannel(activeChannel);
      }
    };
  }, [pollKey, editMode, options, title, isPublished]);

  // Räkna röster per option
  const voteCounts = useMemo(() => {
    const counts = new Array(options.length).fill(0);
    for (const r of responses) {
      if (typeof r.option_index === "number" && r.option_index >= 0 && r.option_index < counts.length) {
        counts[r.option_index]++;
      }
    }
    return counts;
  }, [responses, options.length]);

  const totalVotes = voteCounts.reduce((a, b) => a + b, 0);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedText,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Totalröster + session-kod i övre vänster */}
      {state === "active" ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            flexDirection: "column",
            gap: "0.3rem",
            zIndex: 3,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--room-caption, clamp(0.7rem, 0.85vw, 0.9rem))",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
            }}
          >
            ● Live · {totalVotes} röster
          </div>
          {sessionCode ? (
            <div data-session-label
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--room-caption, clamp(0.65rem, 0.8vw, 0.8rem))",
                color: mutedText,
                letterSpacing: "0.18em",
              }}
            >
              session {sessionCode}
            </div>
          ) : null}
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1rem, 2vh, 1.8rem)",
          zIndex: 2,
        }}
      >
        {/* Rubrik */}
        <div style={{ flexShrink: 0 }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2rem, 3.8vw, 3.5rem)",
                lineHeight: 1,
                letterSpacing: "-0.025em",
                color: primaryText,
                margin: 0,
                textShadow: photoBg ? "0 6px 30px rgba(0,0,0,0.5)" : "none",
              }}
            >
              <EditableText path="title" value={title}>
                {title}
              </EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "var(--room-body, clamp(1rem, 1.3vw, 1.35rem))",
                color: mutedText,
                margin: "0.4rem 0 0 0",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Staplar */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.7rem, 1.2vh, 1rem)",
            justifyContent: "center",
            minHeight: 0,
          }}
        >
          {options.map((option, i) => {
            const count = voteCounts[i];
            const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
            const color = toneColor(option.tone, accent);
            return (
              <PollBar
                key={i}
                option={option}
                color={color}
                count={count}
                pct={pct}
                delay={0.5 + i * 0.12}
                showLive={state === "active"}
                mutedText={mutedText}
                countText={primaryText}
                idleCountText={photoBg ? "rgba(245,246,250,0.3)" : "var(--text-muted)"}
              />
            );
          })}
        </div>

        {/* Status-overlay */}
        <AnimatePresence>
          {state === "no-session" ? (
            <StatusMessage
              key="no-session"
              message="Live-poll kräver aktiv session"
              subtle="Starta publikläget (M-tangenten) för att aktivera röstning"
            />
          ) : null}
          {state === "searching" ? (
            <StatusMessage key="searching" message="Kopplar upp…" subtle="" />
          ) : null}
          {state === "error" ? (
            <StatusMessage
              key="error"
              message="Kunde inte starta live-poll"
              subtle="Kontrollera att sessionen är aktiv"
            />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// PollBar — en rad med label + växande stapel + räknare
// ============================================================================

interface PollBarProps {
  option: PollOption;
  color: string;
  count: number;
  pct: number;
  delay: number;
  showLive: boolean;
  /** Dämpad text för beskrivningen — temabunden eller fast ljus på foto. */
  mutedText: string;
  /** Räknarfärg när live (primärtext). */
  countText: string;
  /** Räknarfärg innan live (dämpad placeholder). */
  idleCountText: string;
}

function PollBar({
  option,
  color,
  count,
  pct,
  delay,
  showLive,
  mutedText,
  countText,
  idleCountText,
}: PollBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "1.2rem",
        alignItems: "center",
      }}
    >
      {/* Label */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          minWidth: "14rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "var(--room-body, clamp(1.1rem, 1.5vw, 1.6rem))",
            color,
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          {option.label}
        </div>
        {option.description ? (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "var(--room-detail, clamp(0.75rem, 0.9vw, 0.95rem))",
              color: mutedText,
              lineHeight: 1.3,
            }}
          >
            {option.description}
          </div>
        ) : null}
      </div>

      {/* Stapel */}
      <div
        style={{
          position: "relative",
          height: "clamp(2.5rem, 4vh, 3.5rem)",
          background: "var(--bg-surface)",
          borderRadius: "0.4rem",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <motion.div data-glow=""
          initial={{ width: 0 }}
          animate={{ width: `${showLive ? pct : 0}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${withAlpha(color, 0.8)} 0%, ${color} 80%, ${withAlpha(color, 0.87)} 100%)`,
            boxShadow: `0 0 20px ${withAlpha(color, 0.4)}, inset 0 0 12px ${withAlpha(color, 0.27)}`,
            borderRadius: "0.4rem",
          }}
        />
      </div>

      {/* Räknare */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: "var(--room-body, clamp(1.1rem, 1.6vw, 1.7rem))",
          color: showLive ? countText : idleCountText,
          minWidth: "4.5rem",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {showLive ? count : "—"}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Status message overlay
// ============================================================================

function StatusMessage({ message, subtle }: { message: string; subtle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        background: withAlpha("var(--bg-surface)", 0.92),
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 4,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--room-body, clamp(0.8rem, 1.1vw, 1.2rem))",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "#EC7E26",
          fontWeight: 700,
        }}
      >
        {message}
      </div>
      {subtle ? (
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "var(--room-body, clamp(0.9rem, 1.2vw, 1.2rem))",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "28em",
          }}
        >
          {subtle}
        </div>
      ) : null}
    </motion.div>
  );
}
