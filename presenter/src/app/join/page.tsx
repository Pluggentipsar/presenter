import { Suspense } from "react";
import { JoinForm } from "@/components/JoinForm";

export const metadata = {
  title: "Anslut till föreläsning",
  description: "Skriv in sessionskoden för att följa med live.",
};

export default function JoinPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-accent">Publikläge</div>
          <h1 className="mt-2 text-2xl font-semibold">Anslut till föreläsningen</h1>
          <p className="mt-2 text-sm text-text-muted">
            Skriv in 6-siffrorkoden som visas på skärmen.
          </p>
        </div>
        <Suspense fallback={null}>
          <JoinForm />
        </Suspense>
      </div>
    </main>
  );
}
