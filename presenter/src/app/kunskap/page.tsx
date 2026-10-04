import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KunskapApp } from "@/components/kunskap/KunskapApp";
import { kunskapEnabled } from "@/lib/kunskap/valv.server";

/**
 * Kunskapsbanken (2 oktober 2026): föreläsningsmappens wiki, grafen och redigeringen i appen.
 * Finns bara i den lokala verkstaden; en publik värd svarar 404. Se docs/KUNSKAPSBANKEN.md.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Presenter · Kunskapsbanken" };

export default function KunskapPage() {
  if (!kunskapEnabled()) notFound();
  return (
    <Suspense fallback={null}>
      <KunskapApp />
    </Suspense>
  );
}
