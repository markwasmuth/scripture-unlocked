import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
export const metadata: Metadata = { title: "Scripture Unlocked - Interactive Bible Study", description: "Verse-by-verse KJV Bible studies with Strong's Concordance. Created by Mark Wasmuth.", manifest: "/manifest.json", appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Scripture Unlocked" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, themeColor: "#14142E" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return (<html lang="en"><head><link rel="icon" href="/favicon.ico" /></head><body className="antialiased">{children}</body></html>); }
