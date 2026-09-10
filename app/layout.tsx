import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = { title: "Universal POS", description: "Universal POS" };

const themeBoot = `
(function(){
  try {
    var k='pos_theme';
    var pref=localStorage.getItem(k);
    if(pref!=='light'&&pref!=='dark'&&pref!=='system') pref='system';
    var dark=pref==='dark'||(pref==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme=dark?'dark':'light';
    document.documentElement.style.colorScheme=dark?'dark':'light';
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            {children}
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
