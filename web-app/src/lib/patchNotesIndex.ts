/**
 * Patch note entries for /patch-notes index.
 * Public URLs use numeric ids: /patch-notes/1, /patch-notes/2, …
 */
export type PatchNoteCategory = "balance" | "economy" | "features";

/** Which long-form body to render for this entry */
export type PatchNoteVariant = "items";

export type PatchNoteEntry = {
  /** Stable id used in URLs: /patch-notes/{id} */
  id: number;
  title: string;
  summary: string;
  category: PatchNoteCategory;
  /** ISO date (YYYY-MM-DD) for sorting / display */
  publishedAt: string;
  variant: PatchNoteVariant;
};

export const PATCH_NOTE_ENTRIES: PatchNoteEntry[] = [
  {
    id: 1,
    title: "Item balance & market",
    summary:
      "Full stat table: seven/diamond/cherry/lemon runs, anti-coin rework, retired shop pool, diamond CHIP tiers, instant spins, La Biblia scaling, Tricky Dice.",
    category: "balance",
    publishedAt: "2026-04-01",
    variant: "items",
  },
];

export function getPatchNoteById(id: number): PatchNoteEntry | undefined {
  return PATCH_NOTE_ENTRIES.find((e) => e.id === id);
}
