"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionByCode } from "@/lib/audience-session";

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill från ?code=
  useEffect(() => {
    const fromUrl = searchParams.get("code");
    if (fromUrl) {
      const digits = fromUrl.replace(/\D/g, "").slice(0, 6);
      setCode(digits);
    }
  }, [searchParams]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\D/g, "");
    if (trimmed.length !== 6) {
      setError("Koden är 6 siffror.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await getSessionByCode(trimmed);
      if (!session) {
        setError("Ingen aktiv session med den koden. Dubbelkolla siffrorna.");
        setBusy(false);
        return;
      }
      router.push(`/audience/${trimmed}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
          if (error) setError(null);
        }}
        placeholder="123 456"
        className="rounded-lg border border-white/15 bg-bg-surface/60 px-4 py-4 text-center font-mono text-3xl tracking-[0.4em] text-text outline-none transition-colors focus:border-accent"
        aria-label="Sessionskod"
      />
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="rounded-full border border-accent bg-accent px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-bg transition-colors hover:bg-accent/90 disabled:opacity-40"
      >
        {busy ? "Ansluter…" : "Anslut"}
      </button>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      <p className="text-center text-xs text-text-muted">
        Du kan också scanna QR-koden på skärmen.
      </p>
    </form>
  );
}
