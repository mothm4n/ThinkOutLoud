import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationMenuDemo } from "@/components/navigation-menu-demo";
import { Toaster } from "@/components/ui/sonner";
import { CommandMenu } from "@/components/command-menu";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ThinkOutLoud",
  description: "Una aplicación moderna para pensar en voz alta",
  icons: {
    icon: [
      {
        url: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/icon.png',
        sizes: '16x16',
        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/icon.png',
        sizes: '180x180',
        type: 'image/png',
      }
    ],
    shortcut: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <NavigationMenuDemo />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
          <CommandMenu />
        </ThemeProvider>
      </body>
    </html>
  );
}
