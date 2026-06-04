"use client";

import {
  MapPin,
  GraduationCap,
  Bookmark,
  BookmarkCheck,
  GitCompare,
  TrendingUp,
  Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getConfidenceBadgeColor } from "@/lib/prediction-engine";
import type { PredictionResult, WishlistItem } from "@/types";

interface ResultCardProps {
  result: PredictionResult;
  index: number;
  isBookmarked?: boolean;
  isComparing?: boolean;
  onBookmark?: (result: PredictionResult) => void;
  onCompare?: (result: PredictionResult) => void;
}

/**
 * Individual result card displaying college-branch prediction
 * with confidence badge, rank details, and action buttons.
 */
export function ResultCard({
  result,
  index,
  isBookmarked,
  isComparing,
  onBookmark,
  onCompare,
}: ResultCardProps) {
  const confidenceColor = getConfidenceBadgeColor(result.confidence);

  return (
    <Card
      className={cn(
        "glass-hover p-5 transition-all duration-300 opacity-0 animate-fade-in-up group",
        result.confidence === "SAFE" && "border-emerald-500/10",
        result.confidence === "DREAM" && "border-amber-500/10"
      )}
      style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s`, animationFillMode: "forwards" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Left: College & Branch Info */}
        <div className="flex-1 space-y-3">
          {/* Institute name */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10">
              <GraduationCap className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm sm:text-base leading-snug line-clamp-2">
                {result.instituteName}
              </h3>
              <p className="text-blue-400 text-sm font-medium mt-0.5">
                {result.branchName}
              </p>
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[11px]">
              {result.instituteType}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              <MapPin className="h-3 w-3 mr-1" />
              {result.state}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {result.quota}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {result.category}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {result.gender === "Gender-Neutral" ? "Male" : "Female"}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {result.year}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              R{result.round}
            </Badge>
          </div>
        </div>

        {/* Right: Ranks & Confidence */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
          {/* Confidence badge */}
          <div
            className={cn(
              "px-3 py-1.5 rounded-full border text-xs font-bold tracking-wide",
              confidenceColor,
              result.confidence === "SAFE" && "animate-pulse-safe",
              result.confidence === "DREAM" && "animate-pulse-dream"
            )}
          >
            <Award className="h-3 w-3 inline mr-1" />
            {result.confidence}
          </div>

          {/* Rank details */}
          <div className="text-right space-y-0.5">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-3 w-3 text-white/40" />
              <span className="text-white/50 text-xs">OR:</span>
              <span className="font-semibold text-white">
                {result.openingRank.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-3 w-3 text-white/40 rotate-180" />
              <span className="text-white/50 text-xs">CR:</span>
              <span className="font-semibold text-white">
                {result.closingRank.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1">
            {onBookmark && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onBookmark(result)}
                aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-blue-400" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
            )}
            {onCompare && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                  isComparing && "opacity-100"
                )}
                onClick={() => onCompare(result)}
                aria-label={isComparing ? "Remove from compare" : "Compare"}
              >
                <GitCompare
                  className={cn(
                    "h-4 w-4",
                    isComparing && "text-indigo-400"
                  )}
                />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-white/30">
          <span>Match Score</span>
          <span>{result.score.toFixed(1)}/100</span>
        </div>
        <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000"
            style={{ width: `${Math.min(result.score, 100)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
