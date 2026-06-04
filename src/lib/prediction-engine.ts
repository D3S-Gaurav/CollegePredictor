import { CONFIDENCE_THRESHOLDS, type ConfidenceLevel } from "./constants";

/**
 * Calculates prediction confidence based on user rank vs average closing rank.
 *
 * Uses 2024+2025 data to compute average, then classifies:
 * - SAFE:  rank <= 80% of avg closing rank
 * - LIKELY: rank <= 100% of avg closing rank
 * - DREAM: rank <= 120% of avg closing rank
 * - REACH: rank > 120% of avg closing rank (still shown but flagged)
 */
export function calculateConfidence(
  rank: number,
  closingRanks: number[]
): ConfidenceLevel {
  if (closingRanks.length === 0) return "REACH";

  const avgClosingRank =
    closingRanks.reduce((sum, r) => sum + r, 0) / closingRanks.length;

  if (rank <= avgClosingRank * CONFIDENCE_THRESHOLDS.SAFE) return "SAFE";
  if (rank <= avgClosingRank * CONFIDENCE_THRESHOLDS.LIKELY) return "LIKELY";
  if (rank <= avgClosingRank * CONFIDENCE_THRESHOLDS.DREAM) return "DREAM";
  return "REACH";
}

/**
 * Computes a composite score for result ranking.
 *
 * Score = College Tier Score + Branch Preference Score + Confidence Score
 * Higher score = better match for the user.
 */
export function calculateResultScore(params: {
  instituteType: string;
  branchName: string;
  confidence: ConfidenceLevel;
  branchPreferences: string[];
  closingRank: number;
  userRank: number;
}): number {
  const {
    instituteType,
    branchName,
    confidence,
    branchPreferences,
    closingRank,
    userRank,
  } = params;

  // College tier score (0-30)
  let collegeScore = 0;
  switch (instituteType) {
    case "NIT":
      collegeScore = 30;
      break;
    case "IIIT":
      collegeScore = 25;
      break;
    case "GFTI":
      collegeScore = 15;
      break;
  }

  // Branch preference score (0-40)
  let branchScore = 0;
  if (branchPreferences.length > 0) {
    const branchLower = branchName.toLowerCase();
    const idx = branchPreferences.findIndex((pref) =>
      branchLower.includes(pref.toLowerCase())
    );
    if (idx !== -1) {
      // Higher preference = higher score
      branchScore = Math.max(
        0,
        40 - (idx / branchPreferences.length) * 40
      );
    }
  } else {
    branchScore = 20; // Neutral when no preference set
  }

  // Confidence score (0-30)
  let confidenceScore = 0;
  switch (confidence) {
    case "SAFE":
      confidenceScore = 30;
      break;
    case "LIKELY":
      confidenceScore = 20;
      break;
    case "DREAM":
      confidenceScore = 10;
      break;
    case "REACH":
      confidenceScore = 0;
      break;
  }

  // Rank proximity bonus (0-10): closer rank = higher bonus
  const rankRatio = userRank / closingRank;
  const proximityBonus = Math.max(0, 10 * (1 - Math.abs(1 - rankRatio)));

  return collegeScore + branchScore + confidenceScore + proximityBonus;
}

/** Returns badge color class based on confidence level */
export function getConfidenceBadgeColor(level: ConfidenceLevel): string {
  switch (level) {
    case "SAFE":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "LIKELY":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "DREAM":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "REACH":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}
