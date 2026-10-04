"use client";

import { useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { updatePresentationCuts, updateSlideProp } from "@/lib/edit-actions";
import type { CutDef } from "@/lib/types";
import type { SlideMeta } from "@/lib/extract-slide-types";

/**
 * VersionsPanel — M-lägets editor för versioner/cuts.
 *
 * Skapa namngivna versioner (kortare bågar) och bocka in vilka slides som ska
 * vara MED i varje version. Membership lagras som `cutSkip`-prop på sliden
 * (roundtrip-säker via parseMdx/serializeMdx) — bock AV = sliden läggs till i
 * den versionens cutSkip. Versionslistan lagras i frontmatter (`cuts:`).
 *
 * Joel tänker "inkludera"; källan lagrar "borttagen ur" — panelen översätter.
 * Live cyklar K mellan full och versionerna (se SlideViewer).
 */
export function VersionsPanel({
  slug,
  cuts,
  slideMetas,
  onGoTo,
}: {
  slug: string;
  cuts: CutDef[];
  slideMetas: SlideMeta[];
  onGoTo?: (index0: number) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Optimistisk bock-state per "slideIndex:cutId" så bockarna inte studsar
  // tillbaka medan servern skriver + revaliderar.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) console.error("Versioner:", res.error);
      else router.refresh();
    });

  const createVersion = () => {
    const name = newName.trim();
    if (!name) return;
    const id = ensureUniqueId(slugify(name), cuts);
    setNewName("");
    run(() => updatePresentationCuts(slug, [...cuts, { id, name }]));
  };

  const deleteVersion = (id: string) => {
    if (editingId === id) setEditingId(null);
    run(() => updatePresentationCuts(slug, cuts.filter((c) => c.id !== id)));
  };

  const toggleMembership = (i: number, cutId: string, include: boolean) => {
    setOptimistic((o) => ({ ...o, [`${i}:${cutId}`]: include }));
    const current = slideMetas[i]?.cutSkip ?? [];
    const next = include
      ? current.filter((c) => c !== cutId)
      : Array.from(new Set([...current, cutId]));
    run(() => updateSlideProp(slug, i, "cutSkip", next.join(" ")));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Skapa version */}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createVersion();
          }}
          placeholder="Ny version, t.ex. 40 min…"
          style={inputStyle}
        />
        <button
          type="button"
          onClick={createVersion}
          disabled={!newName.trim() || pending}
          style={primaryBtnStyle(!newName.trim() || pending)}
        >
          Skapa
        </button>
      </div>

      {cuts.length === 0 ? (
        <p style={mutedStyle}>
          Inga versioner än. Skapa en — sen cyklar <Kbd>K</Kbd> mellan full och
          dina versioner under presentationen.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {cuts.map((c) => {
            const isEditing = editingId === c.id;
            const dropped = slideMetas.filter((m) =>
              m?.cutSkip?.includes(c.id),
            ).length;
            const kept = slideMetas.length - dropped;
            return (
              <div key={c.id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                      {c.name}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {"  "}· {kept}/{slideMetas.length} slides
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : c.id)}
                      style={ghostBtnStyle}
                    >
                      {isEditing ? "Klar" : "Välj slides"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteVersion(c.id)}
                      title={`Ta bort versionen "${c.name}"`}
                      style={{ ...ghostBtnStyle, color: "var(--accent-alert, #E63946)" }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div style={listStyle}>
                    {slideMetas.map((m, i) => {
                      const key = `${i}:${c.id}`;
                      const included =
                        optimistic[key] ?? !(m?.cutSkip ?? []).includes(c.id);
                      return (
                        <div key={i} style={rowStyle}>
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={(e) =>
                              toggleMembership(i, c.id, e.target.checked)
                            }
                            style={{ accentColor: "var(--accent)", cursor: "pointer" }}
                          />
                          <button
                            type="button"
                            onClick={() => onGoTo?.(i)}
                            style={{
                              ...rowLabelStyle,
                              cursor: onGoTo ? "pointer" : "default",
                              opacity: included ? 1 : 0.5,
                            }}
                          >
                            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                              {String(i + 1).padStart(2, "0")}
                            </span>{" "}
                            {m.primaryText || m.templateName}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        padding: "0 0.3rem",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "3px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.75em",
      }}
    >
      {children}
    </kbd>
  );
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "version"
  );
}

function ensureUniqueId(base: string, cuts: CutDef[]): string {
  const ids = new Set(cuts.map((c) => c.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// ── styles ───────────────────────────────────────────────────────────────

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "0.4rem",
  padding: "0.45rem 0.6rem",
  color: "var(--text)",
  fontFamily: "var(--font-body)",
  fontSize: "0.85rem",
};

const primaryBtnStyle = (disabled: boolean): CSSProperties => ({
  background: disabled ? "rgba(255,255,255,0.08)" : "var(--accent)",
  color: disabled ? "var(--text-muted)" : "#0a0908",
  border: "none",
  borderRadius: "0.4rem",
  padding: "0.45rem 0.9rem",
  fontWeight: 600,
  fontSize: "0.8rem",
  cursor: disabled ? "default" : "pointer",
  whiteSpace: "nowrap",
});

const ghostBtnStyle: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "0.35rem",
  padding: "0.3rem 0.6rem",
  color: "var(--text)",
  fontSize: "0.75rem",
  cursor: "pointer",
};

const mutedStyle: CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "0.82rem",
  lineHeight: 1.5,
  margin: 0,
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.5rem",
  background: "rgba(255,255,255,0.025)",
  overflow: "hidden",
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.5rem",
  padding: "0.55rem 0.7rem",
};

const listStyle: CSSProperties = {
  maxHeight: "38vh",
  overflowY: "auto",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  padding: "0.3rem 0.5rem 0.5rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.1rem",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.18rem 0.2rem",
};

const rowLabelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  textAlign: "left",
  background: "transparent",
  border: "none",
  color: "var(--text)",
  fontSize: "0.8rem",
  fontFamily: "var(--font-body)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  padding: 0,
};
