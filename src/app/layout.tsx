import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CollegePredictor — JEE College & Branch Predictor",
    template: "%s | CollegePredictor",
  },
  description:
    "Predict your best colleges and branches through JoSAA & CSAB counselling. Uses official 2024-2025 cutoff data with AI-powered confidence scoring.",
  keywords: [
    "JEE",
    "college predictor",
    "JoSAA",
    "CSAB",
    "NIT",
    "IIIT",
    "GFTI",
    "cutoff",
    "rank predictor",
    "counselling",
  ],
  openGraph: {
    title: "CollegePredictor — JEE College & Branch Predictor",
    description:
      "Predict colleges through JoSAA & CSAB counselling with 2024-2025 data.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-mesh">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/[0.04] py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white/30 text-sm">
              <p>
                CollegePredictor © {new Date().getFullYear()} — Built with
                official JoSAA & CSAB 2024-2025 cutoff data
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
