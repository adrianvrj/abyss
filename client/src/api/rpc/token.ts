import { shortString } from "starknet";
import { getRpcProvider } from "@/api/rpc/provider";

type ChainLike = bigint | string | undefined | null;

function toBigIntHex(value: bigint) {
  return `0x${value.toString(16)}`;
}

export async function readUint256Balance(
  chainId: ChainLike,
  tokenAddress: string,
  accountAddress: string,
) {
  const provider = getRpcProvider(chainId);
  const result = await provider.callContract({
    contractAddress: tokenAddress,
    entrypoint: "balance_of",
    calldata: [accountAddress],
  });

  const low = BigInt(result[0] ?? "0");
  const high = BigInt(result[1] ?? "0");
  return low + (high << 128n);
}

export async function readTokenSymbol(chainId: ChainLike, tokenAddress: string) {
  const provider = getRpcProvider(chainId);

  try {
    const result = await provider.callContract({
      contractAddress: tokenAddress,
      entrypoint: "symbol",
      calldata: [],
    });

    const symbol = result[0];
    if (!symbol) {
      return "TOKEN";
    }

    return shortString.decodeShortString(
      symbol.startsWith("0x") ? symbol : toBigIntHex(BigInt(symbol)),
    );
  } catch {
    return "TOKEN";
  }
}

