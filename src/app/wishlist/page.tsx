"use client";

import { Bookmark, Trash2, Download, MapPin, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getConfidenceBadgeColor } from "@/lib/prediction-engine";
import { useLocalStorageState } from "@/lib/use-local-storage-state";
import { STORAGE_KEYS, EMPTY_LIST } from "@/lib/constants";
import type { WishlistItem } from "@/types";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useLocalStorageState<WishlistItem[]>(
    STORAGE_KEYS.WISHLIST,
    EMPTY_LIST,
  );

  const removeItem = (id: string) => {
    setWishlist(wishlist.filter((w) => w.id !== id));
  };

  const clearAll = () => {
    setWishlist(EMPTY_LIST);
  };

  const exportList = () => {
    if (wishlist.length === 0) return;
    const headers = ["Institute", "Branch", "Type", "State", "Opening Rank", "Closing Rank", "Confidence", "Added"];
    const rows = wishlist.map((w) => [
      w.instituteName, w.branchName, w.instituteType, w.state,
      w.openingRank, w.closingRank, w.confidence, w.addedAt,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-college-wishlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Bookmark className="h-5 w-5 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">My Wishlist</h1>
          </div>
          <p className="text-white/50">{wishlist.length} colleges saved</p>
        </div>
        {wishlist.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportList}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="destructive" size="sm" onClick={clearAll}>
              <Trash2 className="h-4 w-4" /> Clear All
            </Button>
          </div>
        )}
      </div>

      {wishlist.length === 0 ? (
        <Card className="p-12 text-center">
          <Bookmark className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/60">No saved colleges</h3>
          <p className="text-sm text-white/30 mt-2">
            Bookmark colleges from the predictor to build your wishlist.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {wishlist.map((item, index) => (
            <Card
              key={item.id}
              className="glass-hover p-5 opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "forwards" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-white">{item.instituteName}</h3>
                  <p className="text-blue-400 text-sm font-medium">{item.branchName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[11px]">{item.instituteType}</Badge>
                    <Badge variant="outline" className="text-[11px]">
                      <MapPin className="h-3 w-3 mr-1" />{item.state}
                    </Badge>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                      getConfidenceBadgeColor(item.confidence)
                    )}>
                      <Award className="h-3 w-3 inline mr-1" />{item.confidence}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-white/50">
                    <span>OR: <strong className="text-white">{item.openingRank.toLocaleString()}</strong></span>
                    <span>CR: <strong className="text-white">{item.closingRank.toLocaleString()}</strong></span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeItem(item.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
