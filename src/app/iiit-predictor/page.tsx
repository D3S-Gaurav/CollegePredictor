import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "IIIT Predictor 2025 — Predict Your Best IIIT",
  description:
    "Find your best IIIT based on JEE Main rank. Official 2024-2025 cutoff data from JoSAA.",
  keywords: ["IIIT predictor", "JEE", "IIIT cutoff", "2025"],
};

export default function IIITPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold">
          <span className="gradient-text">IIIT Predictor 2025</span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Predict your eligible IIITs based on JEE Main rank and category.
        </p>
      </div>
      <div className="text-center">
        <Link href="/">
          <Button size="lg">
            <GraduationCap className="h-5 w-5" />
            Predict IIITs
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <article className="prose prose-invert max-w-none">
        <h2 className="text-2xl font-bold gradient-text">About IIITs</h2>
        <p className="text-white/60">
          Indian Institutes of Information Technology (IIITs) focus on IT
          and computer science education. There are 26 IIITs established
          under public-private partnership or fully government funded.
        </p>
      </article>
    </div>
  );
}
