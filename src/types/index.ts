import type { ConfidenceLevel } from "@/lib/constants";

/** Search form state */
export interface SearchFilters {
  rank: number;
  category: string;
  gender: string;
  homeState: string;
  year: "2024" | "2025" | "both";
  round: "all" | string;
  counsellingType: "JOSAA" | "CSAB";
  branchPreferences: string[];
  branchGroup: string;
  instituteType: string[];
  stateFilter: string;
  confidenceFilter: ConfidenceLevel | "all";
}

/** Prediction result displayed to user */
export interface PredictionResult {
  id: number;
  instituteName: string;
  instituteType: string;
  branchName: string;
  state: string;
  quota: string;
  category: string;
  gender: string;
  openingRank: number;
  closingRank: number;
  year: number;
  round: number;
  confidence: ConfidenceLevel;
  score: number;
  counsellingType: string;
}

/** API response structure */
export interface PredictionResponse {
  results: PredictionResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** College comparison item */
export interface CompareItem {
  instituteName: string;
  branchName: string;
  instituteType: string;
  closingRank: number;
  openingRank: number;
  state: string;
  quota: string;
  confidence: ConfidenceLevel;
  year: number;
}

/** Bookmark/Wishlist item */
export interface WishlistItem {
  id: string;
  instituteName: string;
  branchName: string;
  instituteType: string;
  closingRank: number;
  openingRank: number;
  state: string;
  confidence: ConfidenceLevel;
  addedAt: string;
}

/** Analytics trend data */
export interface TrendData {
  year: number;
  closingRank: number;
  openingRank: number;
  round: number;
}

/** Admin import log */
export interface ImportLog {
  id: string;
  counsellingType: string;
  year: number;
  filename: string;
  recordCount: number;
  status: "success" | "error" | "partial";
  message: string;
  importedAt: string;
}
