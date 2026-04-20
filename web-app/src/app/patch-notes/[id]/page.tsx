import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPatchNoteById,
  PATCH_NOTE_ENTRIES,
} from "@/lib/patchNotesIndex";
import { PatchNotesContent } from "../PatchNotesContent";

type Props = {
  params: Promise<{ id: string }>;
};

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || String(n) !== raw) return null;
  return n;
}

export function generateStaticParams() {
  return PATCH_NOTE_ENTRIES.map((e) => ({ id: String(e.id) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: raw } = await params;
  const id = parseId(raw);
  const entry = id !== null ? getPatchNoteById(id) : undefined;
  if (!entry) {
    return { title: "Patch note" };
  }
  const base = `${entry.title} · Patch #${entry.id}`;
  return {
    title: base,
    description: entry.summary,
    openGraph: {
      title: `Abyss — ${base}`,
      description: entry.summary,
    },
  };
}

export default async function PatchNoteByIdPage({ params }: Props) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (id === null) notFound();

  const entry = getPatchNoteById(id);
  if (!entry) notFound();

  let content: React.ReactNode;
  switch (entry.variant) {
    case "items":
      content = <PatchNotesContent />;
      break;
    default:
      notFound();
  }

  return (
    <div className="patch-notes-page">
      <div className="patch-notes-inner">
        <nav className="patch-notes-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/patch-notes">Patch notes</Link>
          <span aria-hidden="true">/</span>
          <span className="patch-notes-breadcrumb-current">
            #{entry.id} · {entry.title}
          </span>
        </nav>
        {content}
      </div>
    </div>
  );
}
