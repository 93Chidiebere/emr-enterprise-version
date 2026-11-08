import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { EMRProvider } from "@/context/EMRContext";
import { FormA11yEnhancer } from "@/components/shared/FormA11yEnhancer";

export const metadata: Metadata = {
  title: "Trinity University Hospital EHR — Clinical Data Flow Simulator",
  description:
    "Clinical/Hospital Data Flow EHR simulator for Trinity University undergraduates and healthcare simulation training.",
  icons: {
    icon: "/trinity-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-charcoal flex flex-col font-sans">
        <AuthProvider>
          <EMRProvider>{children}</EMRProvider>
          <FormA11yEnhancer />
        </AuthProvider>
      </body>
    </html>
  );
}

