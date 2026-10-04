"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { EditableText } from "@/lib/inline-edit";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useInlineEdit } from "@/lib/inline-edit";
import type { Interaction, InteractionResponse } from "@/lib/interactions";
import { withAlpha } from "@/lib/gradient-presets";
import { usePublishedLive } from "@/lib/published-live";

/**
 * LiveReflection — open-ended textinmatning från publiken via Supabase.
 *
 * Bygger på samma pattern som LivePoll men för fri-textsvar:
 *   1. Skapar/hittar en `reflection`-interaktion baserad på pollKey
 *   2. Lyssnar på `interaction_responses` via realtime
 *   3. Visar svaren som ett växande "wall of cards" där nya svar dimper in
 *
 * Använd för:
 * - "Vad vill du att jag inte missar idag?"
 * - "Vilken elev tänkte du på i bikupan?"
 * - Vilken som helst öppen reflektion där publikens röster ska synas live
 *
 * MDX-format:
 *
 *   <LiveReflection
 *     chapter="§ I · Inledning"
 *     title="Vad vill du att jag inte missar idag?"
 *     subtitle="Skanna QR-koden, skriv ditt svar — jag bockar av allt jag tar upp."
 *     pollKey="missa-inte"
 *     placeholder="Något du verkligen hoppas vi pratar om…"
 *   />
 */

interface LiveReflectionProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Unik nyckel — kort och beskrivande, t.ex. "missa-inte". */
  pollKey: string;
  /** Placeholder som visas i editor-läget för redigerbarhet. */
  placeholder?: string;
  /** Visa max antal kort (de senaste). Default 24. */
  maxCards?: number | string;
  background?: string;
  accent?: string;
  overlay?: number | string;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(
      1,
      a + 0.1
    )})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

const CARD_TINTS = [
  "rgba(180,118,58,0.10)",
  "rgba(103,212,205,0.08)",
  "rgba(233,179,107,0.10)",
  "rgba(156,143,255,0.08)",
  "rgba(244,166,205,0.10)",
];

// När en bakgrundsbild används läggs en mörk scrim över hela sliden (se
// resolveBackground). Scrimen är temaoberoende mörk, så texten ovanpå måste
// vara fast ljus — annars blir var(--text) (nästan svart) oläslig på ljust tema.
const SCRIM_TEXT = "rgba(245,246,250,0.92)";
const SCRIM_TEXT_MUTED = "rgba(245,246,250,0.6)";

function isImageBackground(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

export function LiveReflection({
  chapter,
  title,
  subtitle,
  pollKey,
  placeholder = "Skriv din reflektion…",
  maxCards = 24,
  background,
  accent = "var(--accent)",
  overlay = 0.55,
}: LiveReflectionProps) {
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const maxCardsNum = typeof maxCards === "string" ? parseInt(maxCards, 10) : maxCards;
  const { editMode } = useInlineEdit();
  // Mörk scrim aktiv → texten ligger på mörkt och måste vara fast ljus,
  // oavsett tema. Utan bild följer texten temat (var(--text) etc.).
  const overImage = isImageBackground(background);
  const textColor = overImage ? SCRIM_TEXT : "var(--text)";
  const mutedColor = overImage ? SCRIM_TEXT_MUTED : "var(--text-muted)";

  const published = usePublishedLive(pollKey);
  const [localResponses, setResponses] = useState<InteractionResponse[]>([]);
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

  // Hitta session + skapa/hitta interaction
  useEffect(() => {
    if (editMode || isPublished) return;
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    // Håll kanal-ref:en tillgänglig för cleanup. Behövs eftersom Supabase
    // returnerar SAMMA kanal vid återanvänt namn — och det tillåter inte
    // nya .on()-callbacks efter .subscribe().
    let activeChannel: ReturnType<typeof sb.channel> | null = null;

    (async () => {
      // Hämta session från localStorage (samma logik som LivePoll)
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
              new Date(parsed.expires_at).getTime() >
                new Date(best.expires_at).getTime()
            ) {
              best = {
                id: parsed.id,
                code: parsed.code,
                expires_at: parsed.expires_at,
              };
            }
          } catch {
            // skip
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

      // Hitta befintlig interaction med matchande prompt-prefix
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
        const fullPrompt = `${promptKey} ${title ?? "Reflektion"}`;
        const { data: created, error } = await sb
          .from("interactions")
          .insert({
            session_id: sessionId,
            type: "reflection",
            prompt: fullPrompt,
            options: null,
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
      if (existingResponses) {
        setResponses(existingResponses as InteractionResponse[]);
      }

      if (cancelled) return;

      // Skapa en unik kanal per mount. Två .on() innan .subscribe() för
      // INSERT + UPDATE (audience kan uppdatera sitt svar). Använd nonce
      // i kanal-namnet så vi aldrig återanvänder en redan-subscribad kanal.
      const nonce =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10);
      const channel = sb.channel(`reflection:${current.id}:${nonce}`);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interaction_responses",
          filter: `interaction_id=eq.${current.id}`,
        },
        (payload) => {
          setResponses((prev) => {
            const existing = prev.find(
              (r) => r.id === (payload.new as InteractionResponse).id
            );
            if (existing) return prev;
            return [...prev, payload.new as InteractionResponse];
          });
        }
      );
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "interaction_responses",
          filter: `interaction_id=eq.${current.id}`,
        },
        (payload) => {
          setResponses((prev) =>
            prev.map((r) =>
              r.id === (payload.new as InteractionResponse).id
                ? (payload.new as InteractionResponse)
                : r
            )
          );
        }
      );
      channel.subscribe();
      activeChannel = channel;
    })();

    return () => {
      cancelled = true;
      // Städa upp kanalen så nästa mount kan registrera fresh callbacks
      if (activeChannel) {
        const sb2 = getSupabase();
        if (sb2) sb2.removeChannel(activeChannel);
      }
    };
  }, [pollKey, editMode, title, isPublished]);

  // Filtrera bort tomma svar och behåll de senaste
  const visibleResponses = useMemo(() => {
    const withText = responses.filter(
      (r) => typeof r.text === "string" && r.text.trim().length > 0
    );
    // Sortera nyast först
    withText.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return withText.slice(0, maxCardsNum);
  }, [responses, maxCardsNum]);

  const totalCount = responses.filter(
    (r) => typeof r.text === "string" && r.text.trim().length > 0
  ).length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {/* Atmosfär */}
      <div className="ambient-accent"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 50% at 50% 30%, ${withAlpha(accent, 0.1)} 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

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
            fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedColor,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Live-indikator + count */}
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
              fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
              fontSize: "var(--room-caption, clamp(0.7rem, 0.85vw, 0.9rem))",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
            }}
          >
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ marginRight: "0.3em" }}
            >
              ●
            </motion.span>
            Live · {totalCount} svar{totalCount > visibleResponses.length ? ` · ${visibleResponses.length} senaste visas` : ""}
          </div>
          {sessionCode ? (
            <div data-session-label
              style={{
                fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
                fontSize: "var(--room-caption, clamp(0.65rem, 0.8vw, 0.8rem))",
                color: mutedColor,
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
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(2rem, 4vw, 4rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1rem, 2vh, 1.8rem)",
          zIndex: 2,
        }}
      >
        {/* Rubrik + subtitle */}
        <div style={{ flexShrink: 0 }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              style={{
                fontFamily: "var(--font-display, Fraunces, serif)",
                fontWeight: 600,
                fontSize: "clamp(1.7rem, 3vw, 2.8rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: textColor,
                margin: 0,
                maxWidth: "55rem",
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
                fontFamily: "var(--font-body, Inter, system-ui, sans-serif)",
                fontSize: "var(--room-body, clamp(0.95rem, 1.3vw, 1.25rem))",
                color: mutedColor,
                marginTop: "0.55rem",
                maxWidth: "48rem",
                lineHeight: 1.45,
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Wall of responses */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            position: "relative",
          }}
        >
          {state === "no-session" ? (
            <EmptyState
              title="Ingen aktiv session"
              body="Starta presenter-session via menyn (M) för att samla in svar live."
              overImage={overImage}
            />
          ) : state === "active" && visibleResponses.length === 0 ? (
            <EmptyState
              title="Väntar på första svaret…"
              body="Skanna QR-koden och skriv en rad från bordet."
              accent={accent}
              overImage={overImage}
            />
          ) : state === "idle" ? (
            <EditorPreview placeholder={placeholder} overImage={overImage} />
          ) : (
            <ResponseWall
              responses={visibleResponses}
              accent={accent}
              overImage={overImage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- subcomponents ----------

function ResponseWall({
  responses,
  accent,
  overImage,
}: {
  responses: InteractionResponse[];
  accent: string;
  overImage: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(var(--room-response-width, 280px), 100%), 1fr))",
        gap: "clamp(0.5rem, 1vw, 0.85rem)",
        alignContent: "start",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <AnimatePresence initial={false}>
        {responses.map((r, i) => (
          <ResponseCard
            key={r.id}
            text={r.text ?? ""}
            featured={r.featured}
            tintIndex={i}
            accent={accent}
            overImage={overImage}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ResponseCard({
  text,
  featured,
  tintIndex,
  accent,
  overImage,
}: {
  text: string;
  featured: boolean;
  tintIndex: number;
  accent: string;
  overImage: boolean;
}) {
  const tint = CARD_TINTS[tintIndex % CARD_TINTS.length];
  return (
    <motion.div data-card=""
      layout
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45, ease: [0.22, 1.2, 0.36, 1] }}
      style={{
        background: featured
          ? `linear-gradient(180deg, ${withAlpha(accent, 0.13)}, ${withAlpha(accent, 0.05)})`
          : tint,
        border: featured
          ? `1.5px solid ${withAlpha(accent, 0.53)}`
          : overImage
          ? "1px solid rgba(255,255,255,0.14)"
          : "1px solid rgba(0,0,0,0.10)",
        borderRadius: "0.75rem",
        padding: "clamp(0.7rem, 1.1vw, 1rem) clamp(0.85rem, 1.3vw, 1.1rem)",
        boxShadow: featured
          ? `0 0 28px ${withAlpha(accent, 0.27)}`
          : overImage
          ? "0 2px 14px rgba(0,0,0,0.35)"
          : "0 2px 14px rgba(0,0,0,0.12)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display, Fraunces, serif)",
          fontWeight: featured ? 600 : 500,
          fontSize: "var(--room-detail, clamp(0.85rem, 1.05vw, 1.05rem))",
          lineHeight: 1.4,
          color: overImage ? SCRIM_TEXT : "var(--text)",
          letterSpacing: "-0.005em",
          // Begränsa höjd så väldigt långa svar inte tar över
          display: "-webkit-box",
          WebkitLineClamp: 5,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          wordBreak: "break-word",
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}

function EmptyState({
  title,
  body,
  accent,
  overImage,
}: {
  title: string;
  body: string;
  accent?: string;
  overImage: boolean;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display, Fraunces, serif)",
          fontWeight: 500,
          fontSize: "var(--room-body, clamp(1.2rem, 1.8vw, 1.6rem))",
          color: accent ?? (overImage ? SCRIM_TEXT : "var(--text)"),
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body, Inter, system-ui, sans-serif)",
          fontSize: "var(--room-caption, clamp(0.85rem, 1.05vw, 1rem))",
          color: overImage ? SCRIM_TEXT_MUTED : "var(--text-muted)",
          maxWidth: "32rem",
          lineHeight: 1.4,
        }}
      >
        {body}
      </div>
    </div>
  );
}

function EditorPreview({
  placeholder,
  overImage,
}: {
  placeholder: string;
  overImage: boolean;
}) {
  // Visar 3 dummy-kort med placeholder så det ser ut som det kommer göra live
  const samples = [
    placeholder,
    "Exempel: AI och bedömning",
    "Exempel: Tillgänglighet",
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(var(--room-response-width, 280px), 100%), 1fr))",
        gap: "clamp(0.5rem, 1vw, 0.85rem)",
        alignContent: "start",
        height: "100%",
        overflow: "hidden",
        opacity: 0.45,
      }}
    >
      {samples.map((s, i) => (
        <div
          key={i}
          style={{
            background: CARD_TINTS[i % CARD_TINTS.length],
            border: overImage
              ? "1px dashed rgba(255,255,255,0.22)"
              : "1px dashed rgba(0,0,0,0.18)",
            borderRadius: "0.75rem",
            padding: "1rem",
            fontFamily: "var(--font-display, Fraunces, serif)",
            fontStyle: "italic",
            fontSize: "var(--room-detail, clamp(0.85rem, 1.05vw, 1.05rem))",
            color: overImage ? SCRIM_TEXT_MUTED : "var(--text-muted)",
            lineHeight: 1.4,
          }}
        >
          {s}
        </div>
      ))}
    </div>
  );
}
