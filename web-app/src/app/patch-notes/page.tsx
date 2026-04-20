import type { Metadata } from "next";
import Link from "next/link";
import {
  PATCH_NOTE_ENTRIES,
  type PatchNoteCategory,
} from "@/lib/patchNotesIndex";

export const metadata: Metadata = {
  title: "Patch notes",
  description:
    "Index of Abyss balance updates, market changes, and patch notes.",
  openGraph: {
    title: "Abyss — Patch notes",
    description: "Changelog-style index of game updates and balance notes.",
  },
};

const CATEGORY_LABEL: Record<PatchNoteCategory, string> = {
  balance: "Balance",
  economy: "Economy",
  features: "Features",
};

function formatDisplayDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PatchNotesIndexPage() {
  const sorted = [...PATCH_NOTE_ENTRIES].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <div className="patch-notes-index-page">
      <div className="patch-notes-index-inner">
        <Link href="/" className="patch-notes-back">
          ← Home
        </Link>

        <header className="patch-notes-index-header">
          <p className="patch-notes-index-eyebrow">Abyss</p>
          <h1>Patch notes</h1>
          <p className="patch-notes-index-lede">
            Balance updates, economy changes, and release notes. New entries appear
            here first—click through for full details.
          </p>
        </header>

        <ul className="patch-notes-index-list" role="list">
          {sorted.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/patch-notes/${entry.id}`}
                className="patch-notes-index-card"
              >
                <div className="patch-notes-index-card-meta">
                  <div className="patch-notes-index-card-meta-left">
                    <span className="patch-notes-index-num">#{entry.id}</span>
                    <span
                      className={`patch-notes-index-pill patch-notes-index-pill--${entry.category}`}
                    >
                      {CATEGORY_LABEL[entry.category]}
                    </span>
                  </div>
                  <time dateTime={entry.publishedAt}>
                    {formatDisplayDate(entry.publishedAt)}
                  </time>
                </div>
                <h2 className="patch-notes-index-card-title">{entry.title}</h2>
                <p className="patch-notes-index-card-summary">{entry.summary}</p>
                <span className="patch-notes-index-card-cta">
                  Read update →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="patch-notes-index-footer">
          More categories will appear here as we ship updates.
        </p>
      </div>
    </div>
  );
}
