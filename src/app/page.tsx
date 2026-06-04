"use client";

import { useState, useCallback, useEffect } from "react";
import {
  GraduationCap,
  TrendingUp,
  Search,
  Database,
  Download,
  FileText,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchForm } from "@/components/search-form";
import { ResultCard } from "@/components/result-card";
import type { SearchFilters, PredictionResult, PredictionResponse, WishlistItem } from "@/types";

/**
 * Main predictor page.
 * Features JoSAA/CSAB mode toggle, search form, and paginated result cards.
 */
export default function HomePage() {
  const [counsellingType, setCounsellingType] = useState<"JOSAA" | "CSAB">(
    "JOSAA"
  );
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(
    null
  );
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [compareList, setCompareList] = useState<PredictionResult[]>([]);

  // Load branches for the current counselling type
  useEffect(() => {
    fetch(`/api/branches?counsellingType=${counsellingType}`)
      .then((res) => res.json())
      .then((data) => setAvailableBranches(data))
      .catch(() => setAvailableBranches([]));
  }, [counsellingType]);

  // Load wishlist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("college-predictor-wishlist");
      if (stored) setWishlist(JSON.parse(stored));
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleSearch = useCallback(
    async (filters: SearchFilters, pageNum = 1) => {
      setIsLoading(true);
      setHasSearched(true);
      if (pageNum === 1) setCurrentFilters(filters);

      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...filters, page: pageNum, pageSize: 50 }),
        });

        const data: PredictionResponse = await res.json();
        if (pageNum === 1) {
          setResults(data.results);
        } else {
          setResults((prev) => [...prev, ...data.results]);
        }
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
        setPage(pageNum);
      } catch (error) {
        console.error("Search failed:", error);
        if (pageNum === 1) setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const [loadMoreNode, setLoadMoreNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loadMoreNode || isLoading || page >= totalPages) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && currentFilters) {
        handleSearch(currentFilters, page + 1);
      }
    });
    
    observer.observe(loadMoreNode);
    return () => observer.disconnect();
  }, [loadMoreNode, isLoading, page, totalPages, currentFilters, handleSearch]);



  const handleBookmark = (result: PredictionResult) => {
    const id = `${result.instituteName}-${result.branchName}-${result.year}`;
    setWishlist((prev) => {
      const exists = prev.find((w) => w.id === id);
      let updated: WishlistItem[];
      if (exists) {
        updated = prev.filter((w) => w.id !== id);
      } else {
        updated = [
          ...prev,
          {
            id,
            instituteName: result.instituteName,
            branchName: result.branchName,
            instituteType: result.instituteType,
            closingRank: result.closingRank,
            openingRank: result.openingRank,
            state: result.state,
            confidence: result.confidence,
            addedAt: new Date().toISOString(),
          },
        ];
      }
      localStorage.setItem(
        "college-predictor-wishlist",
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const handleCompare = (result: PredictionResult) => {
    setCompareList((prev) => {
      if (prev.find((c) => c.id === result.id)) {
        return prev.filter((c) => c.id !== result.id);
      }
      if (prev.length >= 4) return prev; // Max 4
      return [...prev, result];
    });
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = [
      "Institute",
      "Branch",
      "Type",
      "State",
      "Quota",
      "Category",
      "Gender",
      "Opening Rank",
      "Closing Rank",
      "Year",
      "Round",
      "Confidence",
      "Score",
    ];
    const rows = results.map((r) => [
      r.instituteName,
      r.branchName,
      r.instituteType,
      r.state,
      r.quota,
      r.category,
      r.gender,
      r.openingRank,
      r.closingRank,
      r.year,
      r.round,
      r.confidence,
      r.score.toFixed(1),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `college-predictions-${counsellingType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (results.length === 0) return;
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text(`College Predictions — ${counsellingType}`, 14, 20);
    doc.setFontSize(10);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      28
    );

    autoTable(doc, {
      startY: 35,
      head: [
        [
          "Institute",
          "Branch",
          "Type",
          "State",
          "OR",
          "CR",
          "Year",
          "Round",
          "Confidence",
        ],
      ],
      body: results.map((r) => [
        r.instituteName.substring(0, 40),
        r.branchName.substring(0, 30),
        r.instituteType,
        r.state,
        r.openingRank,
        r.closingRank,
        r.year,
        r.round,
        r.confidence,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`college-predictions-${counsellingType}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
          <Database className="h-3.5 w-3.5" />
          Powered by Official 2024-2025 Cutoff Data
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="gradient-text">JEE College Predictor</span>
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto">
          Predict your best colleges and branches through JoSAA &amp; CSAB
          counselling with AI-powered confidence scoring.
        </p>
      </div>

      {/* Counselling Type Toggle */}
      <div className="flex justify-center">
        <Tabs
          value={counsellingType}
          onValueChange={(v) => {
            setCounsellingType(v as "JOSAA" | "CSAB");
            setResults([]);
            setHasSearched(false);
          }}
        >
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="JOSAA" className="px-8">
              <GraduationCap className="h-4 w-4 mr-2" />
              JoSAA
            </TabsTrigger>
            <TabsTrigger value="CSAB" className="px-8">
              <TrendingUp className="h-4 w-4 mr-2" />
              CSAB
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Search Form */}
      <SearchForm
        onSearch={handleSearch}
        isLoading={isLoading}
        counsellingType={counsellingType}
        availableBranches={availableBranches}
      />

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {isLoading ? (
                  "Searching..."
                ) : (
                  <>
                    <span className="gradient-text">{totalCount}</span>{" "}
                    colleges found
                  </>
                )}
              </h2>
              <p className="text-sm text-white/40">
                Sorted by match score • {counsellingType} Mode
              </p>
            </div>

            {results.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCSV}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPDF}
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            )}
          </div>

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                      <div className="flex gap-2">
                        {[...Array(4)].map((_, j) => (
                          <div
                            key={j}
                            className="h-5 w-12 bg-white/5 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result, index) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  index={index}
                  isBookmarked={wishlist.some(
                    (w) =>
                      w.id ===
                      `${result.instituteName}-${result.branchName}-${result.year}`
                  )}
                  isComparing={compareList.some((c) => c.id === result.id)}
                  onBookmark={handleBookmark}
                  onCompare={handleCompare}
                />
              ))}
            </div>
          )}

          {/* No results */}
          {!isLoading && results.length === 0 && hasSearched && (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white/60">
                No colleges found
              </h3>
              <p className="text-sm text-white/30 mt-2 max-w-md mx-auto">
                Try adjusting your rank, category, or branch preferences.
                Make sure cutoff data has been imported via the Admin panel.
              </p>
            </Card>
          )}

          {/* Infinite Scroll Sentinel */}
          {page < totalPages && (
            <div 
              ref={setLoadMoreNode} 
              className="flex justify-center p-6 text-white/40 text-sm font-medium tracking-wide animate-pulse"
            >
              Loading more...
            </div>
          )}
        </div>
      )}

      {/* Stats Cards (shown before search) */}
      {!hasSearched && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
          {[
            {
              icon: GraduationCap,
              label: "Institutes",
              desc: "NITs, IIITs & GFTIs",
              color: "from-blue-500/20 to-indigo-500/20",
            },
            {
              icon: TrendingUp,
              label: "Data Points",
              desc: "2024 & 2025 Cutoffs",
              color: "from-cyan-500/20 to-blue-500/20",
            },
            {
              icon: Search,
              label: "Smart Scoring",
              desc: "AI Confidence Ranking",
              color: "from-indigo-500/20 to-purple-500/20",
            },
          ].map((stat, i) => (
            <Card
              key={i}
              className="glass-hover p-6 text-center opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.15}s`, animationFillMode: "forwards" }}
            >
              <div
                className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${stat.color} mb-3`}
              >
                <stat.icon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {stat.label}
              </h3>
              <p className="text-sm text-white/40 mt-1">{stat.desc}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
