'use client';

import { useState, useCallback, useRef } from 'react';
import { Provider } from 'starknet';
import { CONTRACTS } from '@/lib/constants';
import { ParsedEvents, parseReceiptEvents } from '@/utils/gameEvents';

// Transaction types for the cart
export type CartTransaction =
    | { type: 'buy_item'; sessionId: number; marketSlot: number; itemId: number; price: number }
    | { type: 'sell_item'; sessionId: number; itemId: number; sellPrice: number }
    | { type: 'refresh_market'; sessionId: number; cost: number }
    | { type: 'activate_relic'; sessionId: number }
    | { type: 'spin'; sessionId: number };

export interface TransactionCartState {
    transactions: CartTransaction[];
    pendingScore: number; // Optimistic score changes
    pendingSpins: number; // Optimistic spin changes
}

/**
 * Hook for managing a transaction cart with multicall execution
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTransactionCart(account: any, provider: Provider) {
    const [cart, setCart] = useState<CartTransaction[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const lastReceiptRef = useRef<ParsedEvents | null>(null);

    // Add transaction to cart
    const addToCart = useCallback((tx: CartTransaction) => {
        setCart(prev => [...prev, tx]);
    }, []);

    // Remove transaction from cart
    const removeFromCart = useCallback((index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Clear cart
    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    // Calculate optimistic score/spins changes from cart
    const getOptimisticChanges = useCallback(() => {
        let scoreChange = 0;
        let spinsChange = 0;

        for (const tx of cart) {
            switch (tx.type) {
                case 'buy_item':
                    scoreChange -= tx.price;
                    break;
                case 'sell_item':
                    scoreChange += tx.sellPrice;
                    break;
                case 'refresh_market':
                    scoreChange -= tx.cost;
                    break;
            }
        }

        return { scoreChange, spinsChange };
    }, [cart]);

    // Build multicall from cart
    const buildMulticall = useCallback((sessionId: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const calls: any[] = [];

        // If cart has a spin, we need to add VRF request first
        const hasSpin = cart.some(tx => tx.type === 'spin');

        if (hasSpin && account) {
            calls.push({
                contractAddress: CONTRACTS.CARTRIDGE_VRF,
                entrypoint: 'request_random',
                calldata: [
                    CONTRACTS.ABYSS_GAME,
                    '0', // Source::Nonce variant
                    account.address,
                ],
            });
        }

        // Add all cart transactions in order
        for (const tx of cart) {
            switch (tx.type) {
                case 'buy_item':
                    calls.push({
                        contractAddress: CONTRACTS.ABYSS_GAME,
                        entrypoint: 'buy_item_from_market',
                        calldata: [tx.sessionId.toString(), tx.marketSlot.toString()],
                    });
                    break;
                case 'sell_item':
                    calls.push({
                        contractAddress: CONTRACTS.ABYSS_GAME,
                        entrypoint: 'sell_item',
                        calldata: [tx.sessionId.toString(), tx.itemId.toString(), '1'],
                    });
                    break;
                case 'refresh_market':
                    calls.push({
                        contractAddress: CONTRACTS.ABYSS_GAME,
                        entrypoint: 'refresh_market',
                        calldata: [tx.sessionId.toString()],
                    });
                    break;
                case 'activate_relic':
                    calls.push({
                        contractAddress: CONTRACTS.ABYSS_GAME,
                        entrypoint: 'activate_relic',
                        calldata: [tx.sessionId.toString()],
                    });
                    break;
                case 'spin':
                    calls.push({
                        contractAddress: CONTRACTS.ABYSS_GAME,
                        entrypoint: 'request_spin',
                        calldata: [tx.sessionId.toString()],
                    });
                    break;
            }
        }

        return calls;
    }, [cart, account]);

    // Execute cart as multicall
    const executeCart = useCallback(async (sessionId: number): Promise<ParsedEvents | null> => {
        if (!account || cart.length === 0) return null;

        setIsExecuting(true);
        try {
            const calls = buildMulticall(sessionId);
            const tx = await account.execute(calls);
            const receipt = await provider.waitForTransaction(tx.transaction_hash);

            // Parse events from receipt
            const parsedEvents = parseReceiptEvents(receipt);
            lastReceiptRef.current = parsedEvents;

            // Clear cart after successful execution
            clearCart();

            return parsedEvents;
        } catch (error) {
            console.error('Cart execution failed:', error);
            throw error;
        } finally {
            setIsExecuting(false);
        }
    }, [account, cart, buildMulticall, provider, clearCart]);

    // Quick action: Buy and spin in one transaction
    const buyAndSpin = useCallback(async (
        sessionId: number,
        purchases: { marketSlot: number; itemId: number; price: number }[]
    ): Promise<ParsedEvents | null> => {
        // Build cart with purchases + spin
        const newCart: CartTransaction[] = [
            ...purchases.map(p => ({
                type: 'buy_item' as const,
                sessionId,
                marketSlot: p.marketSlot,
                itemId: p.itemId,
                price: p.price,
            })),
            { type: 'spin' as const, sessionId },
        ];

        setCart(newCart);

        // Execute immediately
        if (!account) return null;

        setIsExecuting(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allCalls: any[] = [
                {
                    contractAddress: CONTRACTS.CARTRIDGE_VRF,
                    entrypoint: 'request_random',
                    calldata: [CONTRACTS.ABYSS_GAME, '0', account.address],
                },
                ...purchases.map(p => ({
                    contractAddress: CONTRACTS.ABYSS_GAME,
                    entrypoint: 'buy_item_from_market',
                    calldata: [sessionId.toString(), p.marketSlot.toString()],
                })),
                {
                    contractAddress: CONTRACTS.ABYSS_GAME,
                    entrypoint: 'request_spin',
                    calldata: [sessionId.toString()],
                },
            ];

            const tx = await account.execute(allCalls);
            const receipt = await provider.waitForTransaction(tx.transaction_hash);

            const parsedEvents = parseReceiptEvents(receipt);
            lastReceiptRef.current = parsedEvents;
            clearCart();

            return parsedEvents;
        } catch (error) {
            console.error('Buy and spin failed:', error);
            throw error;
        } finally {
            setIsExecuting(false);
        }
    }, [account, provider, clearCart]);

    // Quick action: Activate relic and spin in one transaction
    const activateRelicAndSpin = useCallback(async (sessionId: number): Promise<ParsedEvents | null> => {
        if (!account) return null;

        setIsExecuting(true);
        try {
            const calls = [
                {
                    contractAddress: CONTRACTS.CARTRIDGE_VRF,
                    entrypoint: 'request_random',
                    calldata: [CONTRACTS.ABYSS_GAME, '0', account.address],
                },
                {
                    contractAddress: CONTRACTS.ABYSS_GAME,
                    entrypoint: 'activate_relic',
                    calldata: [sessionId.toString()],
                },
                {
                    contractAddress: CONTRACTS.ABYSS_GAME,
                    entrypoint: 'request_spin',
                    calldata: [sessionId.toString()],
                },
            ];

            const tx = await account.execute(calls);
            const receipt = await provider.waitForTransaction(tx.transaction_hash);

            const parsedEvents = parseReceiptEvents(receipt);
            lastReceiptRef.current = parsedEvents;

            return parsedEvents;
        } catch (error) {
            console.error('Activate relic and spin failed:', error);
            throw error;
        } finally {
            setIsExecuting(false);
        }
    }, [account, provider]);

    return {
        cart,
        isExecuting,
        lastParsedEvents: lastReceiptRef.current,
        addToCart,
        removeFromCart,
        clearCart,
        getOptimisticChanges,
        executeCart,
        buyAndSpin,
        activateRelicAndSpin,
        parseReceiptEvents,
    };
}
