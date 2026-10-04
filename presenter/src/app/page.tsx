import type { Metadata } from "next";
import { LibraryHome, type Scope } from "@/components/library/LibraryHome";
import { getLibraryDecks, isLibraryReadOnly, readLibrary } from "@/lib/library.server";
import { themes } from "@/themes";

// Biblioteket läser content/ och bibliotek.json vid varje besök: en ny
// föreläsning eller en flyttad mapp ska synas direkt, utan ombyggnad.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Presenter · Bibliotek" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ mapp?: string | string[]; vy?: string | string[] }>;
}) {
  const query = await searchParams;
  const library = readLibrary();
  const folder = first(query.mapp);
  const view = first(query.vy);
  const initialScope: Scope =
    folder && library.folders.some((f) => f.id === folder)
      ? { kind: "folder", id: folder }
      : view === "kommande" ? { kind: "upcoming" }
      : view === "fasta" ? { kind: "pinned" }
      : view === "osorterat" ? { kind: "unsorted" }
      : view === "arkiv" ? { kind: "archive" }
      : { kind: "all" };

  return (
    <LibraryHome
      decks={getLibraryDecks()}
      initialLibrary={library}
      initialScope={initialScope}
      readOnly={isLibraryReadOnly()}
      today={new Date().toISOString().slice(0, 10)}
      themes={Object.keys(themes)}
    />
  );
}
