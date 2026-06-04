import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "CSAB College Predictor 2025 — Predict NITs, IIITs, GFTIs",
  description:
    "Use official CSAB 2024-2025 cutoff data to predict colleges available through CSAB special rounds.",
  keywords: ["CSAB", "college predictor", "JEE", "NIT", "special round", "2025"],
};

export default function CSABPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold">
          <span className="gradient-text">CSAB College Predictor</span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Predict your eligible colleges through CSAB Special Rounds using
          official 2024 & 2025 cutoff data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Special Rounds", desc: "Seats remaining after JoSAA" },
          { title: "2024 & 2025 Data", desc: "Latest official CSAB cutoffs" },
          { title: "Smart Scoring", desc: "Confidence-based predictions" },
        ].map((item, i) => (
          <Card key={i} className="glass-hover p-6 text-center">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <p className="text-sm text-white/40 mt-2">{item.desc}</p>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Link href="/">
          <Button size="lg">
            <GraduationCap className="h-5 w-5" />
            Start Predicting
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <article className="prose prose-invert max-w-none">
        <h2 className="text-2xl font-bold gradient-text">What is CSAB?</h2>
        <p className="text-white/60">
          Central Seat Allocation Board (CSAB) conducts special counselling
          rounds for NITs, IIITs, and GFTIs after JoSAA counselling. These
          rounds fill seats that remain vacant after the main JoSAA process.
        </p>
      </article>
    </div>
  );
}
