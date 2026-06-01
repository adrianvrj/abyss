import { getToriiUrl } from "@/config";

type ChainLike = bigint | string | undefined | null;

// Use Torii's HTTP SQL endpoint. The gRPC executeSql client mishandles the
// u256 columns (price / token_id), so we query over HTTP and parse the hex
// strings ourselves.
async function executeSqlHttp(query: string, chainId?: ChainLike): Promise<unknown[]> {
  const base = getToriiUrl(chainId).replace(/\/$/, "");
  const url = `${base}/sql?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Torii SQL request failed: ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

type ListingRow = {
  listing_id?: string | number | null;
  seller?: string | number | null;
  token_id?: string | number | null;
  charm_id?: string | number | null;
  price?: string | number | null;
  active?: string | number | boolean | null;
  created_at?: string | number | null;
};

export interface MarketListing {
  listingId: number;
  seller: string;
  tokenId: bigint;
  charmId: number;
  price: bigint;
  active: boolean;
  createdAt: number;
}

function toBigIntish(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined || value === "") {
    return 0n;
  }
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function toNumberish(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  try {
    return Number(BigInt(value));
  } catch {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}

function toBool(value: string | number | boolean | null | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return value === "1" || value === "true" || value === "0x1";
}

function mapRow(row: ListingRow): MarketListing {
  return {
    listingId: toNumberish(row.listing_id),
    seller: row.seller != null ? `0x${toBigIntish(row.seller).toString(16)}` : "",
    tokenId: toBigIntish(row.token_id),
    charmId: toNumberish(row.charm_id),
    price: toBigIntish(row.price),
    active: toBool(row.active),
    createdAt: toNumberish(row.created_at),
  };
}

const SELECT_COLUMNS =
  'listing_id, seller, token_id, charm_id, price, active, created_at';

/** All currently active listings, newest first. */
export async function getActiveListings(chainId?: ChainLike): Promise<MarketListing[]> {
  try {
    const rows = (await executeSqlHttp(
      `SELECT ${SELECT_COLUMNS} FROM "ABYSS-CharmListing" WHERE active = 1;`,
      chainId,
    )) as ListingRow[];
    return rows
      .map(mapRow)
      .filter((l) => l.active && l.listingId > 0)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn("Failed to fetch active charm listings:", error);
    return [];
  }
}

/** Active listings owned by a given seller address. */
export async function getListingsBySeller(
  seller: string,
  chainId?: ChainLike,
): Promise<MarketListing[]> {
  const all = await getActiveListings(chainId);
  let target: bigint;
  try {
    target = BigInt(seller);
  } catch {
    return [];
  }
  return all.filter((l) => {
    try {
      return BigInt(l.seller) === target;
    } catch {
      return false;
    }
  });
}
