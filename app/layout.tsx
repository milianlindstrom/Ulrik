import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { GlobalSearch } from "@/components/global-search";
import { MobileNav } from "@/components/mobile-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ulrik",
  description: "A minimal task management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <header className="border-b sticky top-0 bg-background z-40">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Link href="/kanban" className="text-xl font-bold">
                    Ulrik
                  </Link>
                  <div className="hidden md:flex gap-4">
                    <Link
                      href="/kanban"
                      className="text-sm hover:text-primary transition-colors"
                    >
                      Kanban
                    </Link>
                    <Link
                      href="/gantt"
                      className="text-sm hover:text-primary transition-colors"
                    >
                      Gantt
                    </Link>
                    <Link
                      href="/analytics"
                      className="text-sm hover:text-primary transition-colors"
                    >
                      Analytics
                    </Link>
                    <Link
                      href="/projects"
                      className="text-sm hover:text-primary transition-colors"
                    >
                      Projects
                    </Link>
                    <Link
                      href="/archive"
                      className="text-sm hover:text-primary transition-colors"
                    >
                      Archive
                    </Link>
                  </div>
                </div>
                <div className="hidden md:block text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl/⌘ F</kbd> Search
                  {" • "}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl/⌘ K</kbd> Quick Add
                </div>
                <MobileNav />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <GlobalSearch />
        </div>
      </body>
    </html>
  );
}
