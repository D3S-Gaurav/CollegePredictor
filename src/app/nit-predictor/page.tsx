import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "NIT Predictor 2025 — Predict Your Best NIT",
  description:
    "Find your best NIT based on JEE Main rank. Uses official 2024-2025 cutoff data from JoSAA and CSAB.",
  keywords: ["NIT predictor", "JEE", "NIT cutoff", "2025", "JoSAA"],
};

export default function NITPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold">
          <span className="gradient-text">NIT Predictor 2025</span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Find the best NIT for your rank. Filter by NIT in the predictor
          to see only National Institutes of Technology.
        </p>
      </div>
      <div className="text-center">
        <Link href="/">
          <Button size="lg">
            <GraduationCap className="h-5 w-5" />
            Predict NITs
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <article className="prose prose-invert max-w-none">
        <h2 className="text-2xl font-bold gradient-text">About NITs</h2>
        <p className="text-white/60">
          National Institutes of Technology (NITs) are premier engineering
          institutions in India. There are 31 NITs across the country,
          admitting students through JoSAA counselling based on JEE Main rank.
        </p>
      </article>
    </div>
  );
}
