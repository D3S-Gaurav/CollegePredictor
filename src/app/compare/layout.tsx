import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Colleges",
  description: "Compare up to 4 NITs, IIITs, and GFTIs side by side.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
