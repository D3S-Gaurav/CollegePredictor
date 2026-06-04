import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Upload and manage JEE cutoff data for the College Predictor.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
