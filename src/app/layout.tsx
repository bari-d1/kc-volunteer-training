import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MotionProvider } from "@/components/ui/motion-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const description =
  "Onboarding and training for Kingdom Culture volunteers: who we are, what we believe and how we serve together.";

// Absolute base for social image URLs.
const siteUrl =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KC Volunteers' Onboarding",
    template: "%s | KC Volunteers",
  },
  description,
  applicationName: "KC Volunteers",
  openGraph: {
    type: "website",
    siteName: "KC Volunteers",
    title: "KC Volunteers' Onboarding",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "KC Volunteers' Onboarding",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* Reveal content starts hidden in server HTML; show it without JS. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col">
        <MotionProvider>
          <ToastProvider>{children}</ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
