/**
 * In-game item art uses the same paths as the Vite client: /images/item{n}.png
 * Defaults to the public game origin so patch notes work without copying 40+ PNGs.
 * Override: NEXT_PUBLIC_ITEM_IMAGE_ORIGIN=https://your.cdn.com (no trailing slash)
 * Serve locally: copy `client/public/images/item*.png` into `web-app/public/images/` and set
 * NEXT_PUBLIC_ITEM_IMAGE_ORIGIN="" to use relative /images/... (see getItemImageUrl below).
 */
const DEFAULT_ORIGIN = "https://play.abyssgame.fun";

export function getItemImageUrl(itemId: number): string {
  const raw = process.env.NEXT_PUBLIC_ITEM_IMAGE_ORIGIN;
  if (raw === "" || raw === "local") {
    return `/images/item${itemId}.png`;
  }
  const base = (raw ?? DEFAULT_ORIGIN).replace(/\/$/, "");
  return `${base}/images/item${itemId}.png`;
}
