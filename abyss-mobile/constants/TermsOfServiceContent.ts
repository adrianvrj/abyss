export interface ToSSection {
  heading: string;
  content: string;
}

export interface ToSContent {
  version: string;
  title: string;
  lastUpdated: string;
  sections: ToSSection[];
}

export const CURRENT_TOS: ToSContent = {
  version: '1.0.0',
  title: 'Terms of Service',
  lastUpdated: 'January 2025',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      content: 'By accessing and using this application ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the App. Your continued use of the App constitutes acceptance of these terms and any future modifications.',
    },
    {
      heading: '2. Entertainment Purpose Only',
      content: 'This application is provided solely for entertainment purposes. All games, features, and activities are recreational in nature and involve NO real money, monetary value, or financial stakes whatsoever. Any tokens, points, or virtual currency used within the App have no real-world value and cannot be exchanged for money or goods. The games are purely for fun and amusement.',
    },
    {
      heading: '3. Wallet Creation and Data Privacy',
      content: 'A cryptographic wallet is created locally on your device for the purpose of game functionality. This wallet exists only to enable entertainment features within the App. We do NOT collect, store, or transmit any personal data to external servers. No user registration, email addresses, phone numbers, or personal information is required or collected. The wallet and all associated data remain exclusively on your device.',
    },
    {
      heading: '4. User Conduct',
      content: 'Users agree to use the App lawfully and in accordance with these Terms. You agree not to: (a) use the App for any illegal purpose; (b) attempt to gain unauthorized access to any part of the App or its systems; (c) interfere with or disrupt the App or servers; (d) attempt to reverse engineer or modify the App; (e) use the App in any manner that could damage, disable, or impair the service.',
    },
    {
      heading: '5. Limitation of Liability',
      content: 'THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP. You use the App at your own risk.',
    },
    {
      heading: '6. Intellectual Property',
      content: 'All content, trademarks, logos, graphics, code, and intellectual property rights in the App belong to the application provider or its licensors. You may not copy, modify, distribute, sell, or lease any part of the App without explicit written permission. You are granted a limited, non-exclusive, non-transferable license to use the App for personal entertainment purposes only.',
    },
    {
      heading: '7. Termination',
      content: 'We reserve the right to terminate or suspend your access to the App at our sole discretion, without notice, for any reason including but not limited to breach of these Terms. Upon termination, your right to use the App will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, and limitations of liability.',
    },
    {
      heading: '8. Changes to Terms',
      content: 'We may modify these Terms at any time. When we make changes, we will update the version number and last updated date. Your continued use of the App after modifications constitutes acceptance of the updated Terms. If you do not agree to the modified Terms, you must stop using the App.',
    },
    {
      heading: '9. Governing Law',
      content: 'These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the App shall be resolved in accordance with the governing jurisdiction. If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.',
    },
  ],
};

export default CURRENT_TOS;
