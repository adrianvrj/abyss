import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { Account, RpcProvider, CallData, paymaster } from 'starknet';

// This is critical for Stripe webhooks to work properly
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body as buffer first, then convert to string
    // This ensures the exact bytes are preserved for signature verification
    const buf = await request.arrayBuffer();
    const body = Buffer.from(buf).toString('utf8');
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    console.log('Webhook received:', {
      hasBody: !!body,
      bodyLength: body.length,
      hasSignature: !!signature,
    });

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.stripeWebhookSecret()
    );

    console.log('Webhook signature verified, event type:', event.type);

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
  } catch (error: any) {
    console.error('Webhook error:', error);

    // Log more details for signature verification errors
    if (error.type === 'StripeSignatureVerificationError') {
      console.error('Signature verification failed:', {
        message: error.message,
        header: error.header,
        payloadPreview: error.payload?.substring(0, 100),
      });
    }

    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 400 }
    );
  }
}
