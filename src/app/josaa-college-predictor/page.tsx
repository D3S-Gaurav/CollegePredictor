import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "JoSAA College Predictor 2025 — Predict NITs, IIITs, GFTIs",
  description:
    "Use the official JoSAA 2024-2025 cutoff data to predict your best NITs, IIITs, and GFTIs. Enter your JEE rank to get instant predictions.",
  keywords: ["JoSAA", "college predictor", "JEE", "NIT", "IIIT", "2025", "cutoff"],
};

export default function JoSAAPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold">
          <span className="gradient-text">JoSAA College Predictor</span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Predict your eligible NITs, IIITs, and GFTIs through JoSAA Counselling
          using official 2024 & 2025 cutoff data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "100+ Institutes", desc: "NITs, IIITs, and GFTIs across India" },
          { title: "2024 & 2025 Data", desc: "Latest official cutoff rounds" },
          { title: "Smart Scoring", desc: "AI-powered confidence predictions" },
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
        <h2 className="text-2xl font-bold gradient-text">What is JoSAA?</h2>
        <p className="text-white/60">
          Joint Seat Allocation Authority (JoSAA) conducts the joint admission
          process for 23 IITs, 31 NITs, 26 IIITs, and other Government Funded
          Technical Institutions (GFTIs). It uses JEE Main and JEE Advanced
          scores for seat allocation across multiple counselling rounds.
        </p>
        <h2 className="text-2xl font-bold gradient-text mt-6">How does the predictor work?</h2>
        <p className="text-white/60">
          Our predictor uses official cutoff data from JoSAA 2024 and 2025
          rounds. Enter your JEE Main rank, category, gender, and home state
          to see all eligible colleges and branches sorted by a smart scoring
          algorithm that considers branch preferences and prediction confidence.
        </p>
      </article>
    </div>
  );
}
