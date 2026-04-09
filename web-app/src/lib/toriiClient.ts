import * as torii from "@dojoengine/torii-wasm";

let clientInstance: torii.ToriiClient | null = null;
let clientPromise: Promise<torii.ToriiClient> | null = null;

export async function initToriiClient(): Promise<torii.ToriiClient> {
    if (clientInstance) return clientInstance;
    if (clientPromise) return clientPromise;

    const toriiUrl = process.env.NEXT_PUBLIC_TORII_URL || "http://localhost:8080";

    const worldAddress = process.env.NEXT_PUBLIC_WORLD_ADDRESS || "0x0";

    clientPromise = (async () => {
        const client = new torii.ToriiClient({
            toriiUrl,
            worldAddress,
        });
        clientInstance = client;
        return client;
    })();

    return clientPromise;
}
