"use client";

import { useMemo, useState } from "react";
import { QrCode } from "./QrCode";
import type { AudienceSession } from "@/lib/audience-session";
import { updateAudienceNav } from "@/lib/audience-session";

interface AudiencePanelProps {
  supportsAudience: boolean;
  session: AudienceSession | null;
  starting: boolean;
  error: string | null;
  onStart: () => void;
  onEnd: () => void;
}

export function AudiencePanel({
  supportsAudience,
  session,
  starting,
  error,
  onStart,
  onEnd,
}: AudiencePanelProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [allowBack, setAllowBack] = useState(session?.allow_back ?? true);
  const [allowForward, setAllowForward] = useState(session?.allow_forward ?? false);

  const toggleAllowBack = async () => {
    if (!session) return;
    const next = !allowBack;
    setAllowBack(next);
    await updateAudienceNav(session.id, { allow_back: next });
  };

  const toggleAllowForward = async () => {
    if (!session) return;
    const next = !allowForward;
    setAllowForward(next);
    await updateAudienceNav(session.id, { allow_forward: next });
  };

  const joinUrl = useMemo(() => {
    if (!session) return "";
    if (typeof window === "undefined") return `/join?code=${session.code}`;
    return `${window.location.origin}/join?code=${session.code}`;
  }, [session]);

  if (!supportsAudience) {
    return (
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-text-muted">Publikläge</h2>
        <div className="rounded-lg border border-white/10 bg-bg-surface/40 p-4 text-sm text-text-muted">
          Publikläge kräver att <code className="text-text">NEXT_PUBLIC_SUPABASE_URL</code> och
          <code className="ml-1 text-text">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> är satta i
          <code className="ml-1 text-text">.env.local</code>.
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-xs uppercase tracking-[0.3em] text-text-muted">Publikläge</h2>

      {!session && (
        <div className="rounded-lg border border-white/10 bg-bg-surface/40 p-5">
          <p className="text-sm text-text-muted">
            Starta publikläge så får åhörarna en sessionskod, kan följa presentationen live,
            ta anteckningar och ställa frågor.
          </p>
          <button
            onClick={onStart}
            disabled={starting}
            className="mt-4 rounded-full border border-accent bg-accent/10 px-5 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
          >
            {starting ? "Startar…" : "Starta publikläge"}
          </button>
          {error && <div className="mt-3 text-xs text-red-400">{error}</div>}
        </div>
      )}

      {session && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-bg-surface/40 p-5 md:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center rounded-md bg-white p-3">
            <QrCode value={joinUrl} size={180} alt={`QR-kod till ${joinUrl}`} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-text-muted">Sessionskod</div>
              <div className="mt-1 font-mono text-5xl tracking-[0.3em] text-text">
                {session.code}
              </div>
            </div>
            <div className="text-sm text-text-muted">
              Scanna QR-koden eller gå till{" "}
              <span className="text-text">
                {joinUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
              </span>{" "}
              och skriv in koden.
            </div>
            {/* Publikens navigationstillstånd */}
            <div className="mt-1 rounded-md border border-white/10 bg-black/20 p-3">
              <div className="mb-2 text-[0.65rem] uppercase tracking-[0.25em] text-text-muted/70">
                Publikens navigation
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleAllowBack}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    allowBack
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-white/15 text-text-muted hover:border-accent/40 hover:text-text"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{
                    background: allowBack ? "currentColor" : "transparent",
                    border: allowBack ? "none" : "1px solid currentColor",
                  }} />
                  Bakåt
                </button>
                <button
                  type="button"
                  onClick={toggleAllowForward}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    allowForward
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-white/15 text-text-muted hover:border-accent/40 hover:text-text"
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{
                    background: allowForward ? "currentColor" : "transparent",
                    border: allowForward ? "none" : "1px solid currentColor",
                  }} />
                  Framåt
                </button>
              </div>
              <div className="mt-2 text-[0.7rem] text-text-muted/60">
                Framåt blockeras alltid om publiken når din aktuella slide — så de kan aldrig spoila.
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {!confirmEnd && (
                <button
                  onClick={() => setConfirmEnd(true)}
                  className="rounded-full border border-white/15 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted transition-colors hover:border-red-400 hover:text-red-400"
                >
                  Avsluta session
                </button>
              )}
              {confirmEnd && (
                <>
                  <button
                    onClick={() => {
                      onEnd();
                      setConfirmEnd(false);
                    }}
                    className="rounded-full border border-red-400 bg-red-500/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    Bekräfta avsluta
                  </button>
                  <button
                    onClick={() => setConfirmEnd(false)}
                    className="rounded-full border border-white/15 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted"
                  >
                    Avbryt
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
