/* eslint-disable @next/next/no-page-custom-font */
import "./styles/globals.scss";
import "./styles/markdown.scss";
import "./styles/highlight.scss";
import { getClientConfig } from "./config/client";
import { type Metadata } from "next";

const BRAND = {
  name: "SentralChat",
  tagline: "Private AI. In your browser.",
  description:
    "Private AI. In your browser. Chat with open models running locally—no server required.",
  url: "https://sentral-chat.vercel.app",
  theme: {
    light: "#FAFAFF", // Paper
    dark: "#0B0F19", // Ink
    main: "#7C3AED", // Primary main
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: BRAND.name,
  description: BRAND.description,
  keywords: [
    "SentralChat",
    "local AI",
    "private AI",
    "browser AI",
    "LLM",
    "WebLLM",
    "offline",
    "no server",
  ],
  authors: [{ name: "Sentralis" }],
  publisher: "Sentralis",
  creator: "Sentralis",
  robots: "index, follow",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.theme.light },
    { media: "(prefers-color-scheme: dark)", color: BRAND.theme.dark },
  ],
  appleWebApp: {
    title: BRAND.name,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    url: BRAND.url,
    title: BRAND.name,
    description: BRAND.description,
    siteName: BRAND.name,
    images: [
      {
        // Keep existing asset path for now (no logo changes requested)
        url: `${BRAND.url}/mlc-logo.png`,
        width: 360,
        height: 360,
        alt: `${BRAND.name} - ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.description,
    images: [`${BRAND.url}/mlc-logo.png`],
  },
  alternates: {
    canonical: BRAND.url,
  },
};

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    worker-src 'self';
    connect-src 'self' blob: data: https: http:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={cspHeader.replace(/\n/g, "")}
        />
        <meta name="config" content={JSON.stringify(getClientConfig())} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />

        {/* Icons */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* main theme accent for pinned tab / tiles */}
        <link
          rel="mask-icon"
          href="/safari-pinned-tab.svg"
          color={BRAND.theme.main}
        />
        <meta name="msapplication-TileColor" content={BRAND.theme.main} />

        {/* Make theme-color match brand (overrides any prior hardcoded value) */}
        <meta name="theme-color" content={BRAND.theme.light} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: BRAND.name,
              url: BRAND.url,
              description: BRAND.description,
              applicationCategory: "Artificial Intelligence",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              operatingSystem: "Web Browser",
              creator: {
                "@type": "Organization",
                name: "Sentralis",
              },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
