"use client";

import { GitCompare, Plus, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getConfidenceBadgeColor } from "@/lib/prediction-engine";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { STORAGE_KEYS, EMPTY_LIST } from "@/lib/constants";
import type { CompareItem } from "@/types";
import type { ConfidenceLevel } from "@/lib/constants";

export default function ComparePage() {
  const [items, saveItems] = useLocalStorageState<CompareItem[]>(
    STORAGE_KEYS.COMPARE,
    EMPTY_LIST,
  );

  const removeItem = (idx: number) => {
    saveItems(items.filter((_, i) => i !== idx));
  };

  const COMPARE_FIELDS = [
    { label: "Institute", key: "instituteName" },
    { label: "Branch", key: "branchName" },
    { label: "Type", key: "instituteType" },
    { label: "Closing Rank", key: "closingRank" },
    { label: "Opening Rank", key: "openingRank" },
    { label: "State", key: "state" },
    { label: "Quota", key: "quota" },
    { label: "Confidence", key: "confidence" },
    { label: "Year", key: "year" },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
            <GitCompare className="h-5 w-5 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Compare Colleges</h1>
        </div>
        <p className="text-white/50">
          Compare up to 4 colleges side by side. Add colleges from the
          predictor results.
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <GitCompare className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/60">No colleges to compare</h3>
          <p className="text-sm text-white/30 mt-2">
            Use the compare button on result cards to add colleges here.
          </p>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-medium text-white/50 w-40">Field</th>
                  {items.map((_, i) => (
                    <th key={i} className="text-left p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white/70">College {i + 1}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_FIELDS.map((field) => (
                  <tr key={field.key} className="border-b border-white/5">
                    <td className="p-4 text-sm text-white/50 font-medium">{field.label}</td>
                    {items.map((item, i) => {
                      const value = item[field.key as keyof CompareItem];
                      return (
                        <td key={i} className="p-4">
                          {field.key === "confidence" ? (
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold border",
                              getConfidenceBadgeColor(value as ConfidenceLevel)
                            )}>
                              {String(value)}
                            </span>
                          ) : field.key === "closingRank" || field.key === "openingRank" ? (
                            <span className="text-white font-semibold">
                              {Number(value).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-white/80 text-sm">{String(value)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
