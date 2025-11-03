import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { Account, RpcProvider, CallData, paymaster } from 'starknet';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.stripeWebhookSecret()
    );

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { recipientAddress, chipAmount, packageId } = session.metadata || {};

      console.log('Payment completed:', {
        sessionId: session.id,
        recipientAddress,
        chipAmount,
        packageId,
      });

      // Initialize Starknet provider and account
      const provider = new RpcProvider({
        nodeUrl: env.starknetRpcUrl(),
      });

      const account = new Account(
        provider,
        env.minterAddress(),
        env.minterPrivateKey(),
      );

      // Call mint function on CHIP contract
      const chipContractAddress = env.chipContractAddress();

      // Convert amount to u256 (represented as { low, high })
      // For small amounts, high is always 0
      const amount = {
        low: Number(chipAmount) * 10 ** 18 || '0',
        high: '0',
      };

      const calldata = CallData.compile([recipientAddress, amount]);

      const tx = await account.execute({
        contractAddress: chipContractAddress,
        entrypoint: 'mint',
        calldata,
      });

      console.log('Mint transaction hash:', tx.transaction_hash);

      return NextResponse.json({
        received: true,
        transactionHash: tx.transaction_hash
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
