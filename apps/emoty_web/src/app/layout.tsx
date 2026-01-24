import type { Metadata, Viewport } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { ClientProviders } from '@/components/ClientProviders';

export const metadata: Metadata = {
  title: 'Emoty - Emoji Pattern Creator',
  description: 'Create beautiful emoji patterns with AI assistance. Make concentric square patterns, save favorites, and share your creativity.',
  keywords: 'emoji, patterns, AI, creativity, design, art',
  authors: [{ name: 'Emoty Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'Emoty - Emoji Pattern Creator',
    description: 'Create beautiful emoji patterns with AI assistance',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'fr_FR'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7B61FF'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Font Awesome for icons */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        {/* ARIA live regions for announcements */}
        <div
          id="aria-live-announcer"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        <div
          id="aria-live-announcer-assertive"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        />

        <ClientProviders>
          <main id="main-content">
            {children}
          </main>
        </ClientProviders>

        {/* Bootstrap JS for interactive components */}
        <script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
          crossOrigin="anonymous"
          async
        />
      </body>
    </html>
  );
}