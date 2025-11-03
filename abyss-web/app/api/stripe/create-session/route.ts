import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { getPackageById } from '@/types/package';
import { validateStarknetAddress, validatePackage } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageId, recipientAddress } = body;

    // Validate inputs
    if (!validatePackage(packageId)) {
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    if (!validateStarknetAddress(recipientAddress)) {
      return NextResponse.json(
        { error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    // Get package details
    const pkg = getPackageById(packageId);
    if (!pkg) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    const baseUrl = env.baseUrl();

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.chips} CHIP Tokens`,
              description: `Purchase ${pkg.chips} CHIP tokens for the Abyss game`,
            },
            unit_amount: pkg.priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/purchase/${recipientAddress}?success=true`,
      cancel_url: `${baseUrl}/purchase/${recipientAddress}?canceled=true`,
      metadata: {
        recipientAddress,
        chipAmount: pkg.chips.toString(),
        packageId: pkg.id,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}
