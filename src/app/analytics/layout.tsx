import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cutoff Analytics",
  description:
    "Visualize JEE closing rank trends for NITs, IIITs, and GFTIs across 2024-2025.",
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
