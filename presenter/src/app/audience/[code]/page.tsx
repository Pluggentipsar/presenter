import Link from "next/link";
import { getPresentation } from "@/lib/mdx";
import { getSessionByCodeServer } from "@/lib/supabase-server";
import { AudiencePresentation } from "@/components/AudiencePresentation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return {
    title: `Publikläge · ${code}`,
    robots: { index: false, follow: false },
  };
}

export default async function AudiencePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getSessionByCodeServer(code);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <div className="w-full max-w-md text-center">
          <div className="text-xs uppercase tracking-[0.3em] text-accent">Publikläge</div>
          <h1 className="mt-2 text-2xl font-semibold">Ingen aktiv session</h1>
          <p className="mt-3 text-sm text-text-muted">
            Koden <span className="font-mono text-text">{code}</span> matchar ingen aktiv
            session. Kanske har föreläsningen avslutats eller så stavade du fel.
          </p>
          <Link
            href="/join"
            className="mt-6 inline-block rounded-full border border-accent bg-accent px-5 py-2 text-sm font-medium uppercase tracking-[0.2em] text-bg"
          >
            Tillbaka
          </Link>
        </div>
      </main>
    );
  }

  const presentation = getPresentation(session.slug);
  if (!presentation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-6 text-text">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-semibold">Presentationen kunde inte laddas</h1>
          <p className="mt-3 text-sm text-text-muted">
            Sessionen finns men materialet är inte tillgängligt.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AudiencePresentation
      source={presentation.content}
      session={session}
      presentationTitle={presentation.meta.title}
      theme={session.theme ?? presentation.meta.theme}
      deployMode={presentation.meta.deploy ?? "full"}
    />
  );
}
