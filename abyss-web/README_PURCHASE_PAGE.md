# Abyss CHIP Purchase Page

A Next.js web application that allows users to purchase CHIP ERC20 tokens using either Stripe (credit card) or Starknet wallet (crypto).

## Features Implemented

✅ **Package Selection**: Three pricing tiers (5/$2.50, 12/$10, 40/$20)
✅ **Stripe Payment Integration**: Credit card payment with Stripe Checkout
✅ **Starknet Wallet Integration**: Connect ArgentX/Braavos wallets
✅ **Responsive Design**: Mobile, tablet, and desktop layouts
✅ **Abyss Design System**: Matches abyss-mobile aesthetic (retro/pixelated style)
✅ **Error Handling**: User-friendly error messages
✅ **Type-Safe**: Full TypeScript implementation
✅ **Validation**: Address and package validation

## Project Structure

```
abyss-web/
├── app/
│   ├── api/
│   │   └── stripe/
│   │       ├── create-session/route.ts  # Stripe checkout session API
│   │       └── webhook/route.ts          # Stripe payment webhook
│   ├── purchase/[address]/page.tsx       # Main purchase page
│   ├── layout.tsx                         # Root layout with fonts
│   └── globals.css                        # Global styles + Tailwind
├── components/
│   ├── ui/
│   │   ├── PixelButton.tsx               # Retro-styled button
│   │   ├── PixelCard.tsx                 # Retro-styled card
│   │   └── LoadingSpinner.tsx            # Loading indicator
│   ├── PackageSelector.tsx                # Package selection UI
│   ├── PaymentMethodSelector.tsx          # Payment method buttons
│   ├── WalletConnector.tsx                # Starknet wallet connection
│   └── ErrorDisplay.tsx                   # Error message display
├── lib/
│   ├── theme.ts                           # Theme constants
│   ├── validation.ts                      # Address/package validation
│   ├── env.ts                             # Environment variable access
│   ├── stripe.ts                          # Stripe server SDK
│   ├── stripe-client.ts                   # Stripe client SDK
│   └── starknet.ts                        # Starknet wallet utilities
├── types/
│   ├── package.ts                         # Package type definitions
│   ├── payment.ts                         # Payment type definitions
│   └── error.ts                           # Error type definitions
└── public/
    ├── fonts/ramagothicbold.ttf          # Custom font from abyss-mobile
    └── images/
        ├── abyss-logo.png                 # Logo from abyss-mobile
        └── bg-welcome.png                 # Background image
```

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Starknet Configuration
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io
CHIP_CONTRACT_ADDRESS=0x...
MINTER_PRIVATE_KEY=0x...
MINTER_ADDRESS=0x...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Get Stripe Keys

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Set up a webhook endpoint pointing to `http://your-domain/api/stripe/webhook`
4. Subscribe to the `checkout.session.completed` event
5. Copy the webhook secret

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 5. Build for Production

```bash
npm run build
npm start
```

## Usage

### Accessing the Purchase Page

Navigate to: `http://localhost:3000/purchase/[STARKNET_ADDRESS]`

Replace `[STARKNET_ADDRESS]` with a valid Starknet address (0x followed by 64 hex characters).

Example:
```
http://localhost:3000/purchase/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### Payment Flow

**Stripe Payment (Credit Card):**
1. User selects a package
2. Clicks "Pay with Card"
3. Redirected to Stripe Checkout
4. Completes payment
5. Redirected back with success message
6. Webhook triggers minting (backend implementation needed)

**Starknet Wallet Payment:**
1. User clicks "Connect Wallet"
2. Connects ArgentX or Braavos wallet
3. Selects a package
4. Clicks "Pay with Wallet"
5. Approves transaction in wallet
6. Transaction confirmed on Starknet
7. Backend detects payment and mints tokens (implementation needed)

## What's Implemented vs. What's Next

### ✅ Fully Implemented

- Frontend purchase page UI
- Package selection
- Stripe checkout session creation
- Stripe webhook handler (basic structure)
- Starknet wallet connection
- Address validation
- Error handling UI
- Responsive design
- Type definitions

### 🔧 Needs Implementation

These backend features require your specific contract details:

1. **Minting Service** (`lib/minting-service.ts`)
   - Connect to your CHIP contract
   - Implement `mint()` function calls
   - Retry logic for failed mints

2. **Payment Logging** (`lib/payment-logger.ts`)
   - Store payment records
   - Track minting status

3. **Pending Mints Queue** (`lib/queue-storage.ts`)
   - Queue system for failed mints
   - Retry mechanism

4. **Wallet Payment Verification** (`lib/starknet-verification.ts`)
   - Verify Starknet transactions
   - Validate payment amounts

5. **Wallet Payment API Route** (`app/api/wallet/payment/route.ts`)
   - Handle crypto payments
   - Trigger minting after verification

### Implementation Guide

To complete the backend:

1. Deploy the CHIP contract to Starknet (see `contracts/src/contracts/chip.cairo`)
2. Grant MINTER_ROLE to your backend service address
3. Implement the minting service using the contract address
4. Set up a database or file storage for payment logs
5. Implement the wallet payment verification using Starknet.js
6. Test the complete flow on testnet before deploying to mainnet

## Design System

The application uses the exact design system from abyss-mobile:

- **Colors**: Black background (#000000), Orange primary (#FF841C), White text (#FFFFFF)
- **Fonts**: Ramagothic (titles), Press Start 2P (body text)
- **Style**: Pixel-art/retro aesthetic with chunky borders and shadows
- **Assets**: Copied directly from abyss-mobile

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Payments**: Stripe, Starknet
- **Blockchain**: Starknet (Cairo smart contracts)
- **Fonts**: Google Fonts (Press Start 2P), Custom (Ramagothic)

## API Routes

### POST `/api/stripe/create-session`

Creates a Stripe Checkout session.

**Request:**
```json
{
  "packageId": "starter" | "standard" | "premium",
  "recipientAddress": "0x..."
}
```

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST `/api/stripe/webhook`

Receives Stripe webhook events.

**Headers:**
- `stripe-signature`: Webhook signature for verification

**Body:** Stripe event object

## Testing

### Test with Stripe Test Mode

1. Use Stripe test API keys
2. Use test card: 4242 4242 4242 4242
3. Any future expiry date and CVC

### Test Wallet Connection

1. Install ArgentX or Braavos browser extension
2. Connect to Starknet testnet
3. Test the wallet connection flow

## Troubleshooting

**Build errors about environment variables:**
- The build will show warnings about missing environment variables
- This is expected during development
- The app will still build and run
- Environment variables are only required when the respective features are used

**Wallet connection issues:**
- Make sure you have ArgentX or Braavos installed
- Check that the wallet extension is enabled
- Try refreshing the page

**Stripe webhook not receiving events:**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Make sure webhook endpoint is publicly accessible in production

## Production Deployment

1. Deploy to Vercel, Netlify, or your preferred host
2. Set environment variables in your hosting platform
3. Update `NEXT_PUBLIC_BASE_URL` to your production domain
4. Configure Stripe webhook to point to your production URL
5. Switch to Stripe live API keys
6. Deploy CHIP contract to Starknet mainnet
7. Update contract addresses in environment variables

## Support

For issues or questions:
- Check the project specification in `/project-specs/chip-purchase-page/`
- Review the design document for architecture details
- Check the tasks document for implementation status

## License

Part of the Abyss game project.
