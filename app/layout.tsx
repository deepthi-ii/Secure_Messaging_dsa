import type { Metadata, Viewport } from "next";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LabProvider } from "@/lib/store/lab-store";

export const metadata: Metadata = {
  title: { default: "SecureMessage Lab", template: "%s · SecureMessage Lab" },
  description:
    "An educational simulation of a secure messaging protocol: SHA-256 Merkle batch integrity, session key rotation and replay attack detection.",
};

export const viewport: Viewport = { themeColor: "#0a1220", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <LabProvider>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
          <Toaster />
        </LabProvider>
      </body>
    </html>
  );
}
