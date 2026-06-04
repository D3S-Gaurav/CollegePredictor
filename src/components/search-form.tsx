"use client";

import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  GENDERS,
  INDIAN_STATES,
  INSTITUTE_TYPES,
  BRANCH_GROUPS,
} from "@/lib/constants";
import type { SearchFilters } from "@/types";

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
  counsellingType: "JOSAA" | "CSAB";
  availableBranches: string[];
}

/**
 * Multi-field search form with branch preferences,
 * advanced filters, and branch group quick-filters.
 */
export function SearchForm({
  onSearch,
  isLoading,
  counsellingType,
  availableBranches,
}: SearchFormProps) {
  const [rank, setRank] = useState("");
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [homeState, setHomeState] = useState("");
  const [year, setYear] = useState<"2024" | "2025" | "both">("both");
  const [round, setRound] = useState("all");
  const [branchPreferences, setBranchPreferences] = useState<string[]>([]);
  const [branchGroup, setBranchGroup] = useState("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [instituteType, setInstituteType] = useState<string[]>([]);
  const [stateFilter, setStateFilter] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [branchSearch, setBranchSearch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rank || parseInt(rank) <= 0) return;

    onSearch({
      rank: parseInt(rank),
      category,
      gender,
      homeState,
      year,
      round,
      counsellingType,
      branchPreferences,
      branchGroup,
      instituteType,
      stateFilter,
      confidenceFilter: confidenceFilter as SearchFilters["confidenceFilter"],
    });
  };

  const toggleBranchPreference = (branch: string) => {
    setBranchPreferences((prev) =>
      prev.includes(branch)
        ? prev.filter((b) => b !== branch)
        : [...prev, branch]
    );
  };

  const toggleInstituteType = (type: string) => {
    setInstituteType((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const applyBranchGroup = (group: string) => {
    setBranchGroup(group);
    if (group === "all") {
      setBranchPreferences([]);
    } else {
      const groupBranches =
        BRANCH_GROUPS[group as keyof typeof BRANCH_GROUPS] || [];
      setBranchPreferences([...groupBranches]);
    }
  };

  const filteredBranches = availableBranches.filter((b) =>
    b.toLowerCase().includes(branchSearch.toLowerCase())
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Primary Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rank */}
            <div className="space-y-2">
              <label
                htmlFor="rank-input"
                className="text-sm font-medium text-white/70"
              >
                JEE Main Rank *
              </label>
              <Input
                id="rank-input"
                type="number"
                placeholder="Enter your rank"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                min={1}
                required
                className="text-lg font-semibold"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Gender
              </label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g === "Gender-Neutral" ? "Male" : "Female"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Home State */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Home State
              </label>
              <Select value={homeState} onValueChange={setHomeState}>
                <SelectTrigger id="state-select">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Year & Round */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Year</label>
              <Select
                value={year}
                onValueChange={(v) =>
                  setYear(v as "2024" | "2025" | "both")
                }
              >
                <SelectTrigger id="year-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both (2024 & 2025)</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Round
              </label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger id="round-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rounds</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((r) => (
                    <SelectItem key={r} value={r.toString()}>
                      Round {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Branch Group Quick Filters */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/70">
              Quick Branch Filters
            </label>
            <div className="flex flex-wrap gap-2">
              {["all", "CSE Related", "Circuital", "Core Engineering"].map(
                (group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => applyBranchGroup(group)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer",
                      branchGroup === group
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500/50 shadow-lg shadow-blue-500/20"
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {group === "all" ? "Show All" : group}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Branch Preferences */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white/70">
                Branch Preferences (ordered)
              </label>
              {branchPreferences.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBranchPreferences([]);
                    setBranchGroup("all");
                  }}
                  className="text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Selected branches */}
            {branchPreferences.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {branchPreferences.map((branch, idx) => (
                  <Badge
                    key={branch}
                    className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1 pr-1 cursor-pointer"
                    onClick={() => toggleBranchPreference(branch)}
                  >
                    <span className="text-blue-400/60 mr-1">{idx + 1}.</span>
                    {branch}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Branch search and list */}
            <div className="space-y-2">
              <Input
                placeholder="Search branches..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="max-h-32 overflow-y-auto rounded-xl border border-white/5 bg-white/[0.02] p-2 space-y-1">
                {filteredBranches.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => toggleBranchPreference(branch)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer",
                      branchPreferences.includes(branch)
                        ? "bg-blue-500/20 text-blue-400"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {branch}
                  </button>
                ))}
                {filteredBranches.length === 0 && (
                  <p className="text-center text-white/30 text-sm py-2">
                    No branches found
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Advanced Filters
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="space-y-4 animate-fade-in-up border-t border-white/5 pt-4">
              {/* Institute Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Institute Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {INSTITUTE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleInstituteType(type)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all border cursor-pointer",
                        instituteType.includes(type)
                          ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* State Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Filter by Institute State
                </label>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger id="state-filter-select">
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Prediction Confidence
                </label>
                <div className="flex flex-wrap gap-2">
                  {["all", "SAFE", "LIKELY", "DREAM"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setConfidenceFilter(level)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all border cursor-pointer",
                        confidenceFilter === level
                          ? level === "SAFE"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : level === "LIKELY"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : level === "DREAM"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-white/10 text-white border-white/20"
                          : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {level === "all" ? "Show All" : level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading || !rank}
            className="w-full sm:w-auto"
            id="predict-button"
          >
            <Search className="h-5 w-5" />
            {isLoading ? "Predicting..." : "Predict Colleges"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
