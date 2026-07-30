"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Search,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, GENDERS } from "@/lib/constants";

interface TrendPoint {
  label: string;
  year: number;
  round: number;
  avgClosingRank: number;
  avgOpeningRank: number;
  minClosingRank: number;
  maxClosingRank: number;
}

/**
 * Analytics page with cutoff trend charts.
 * Users can search by branch and see 2024 vs 2025 closing rank trends.
 */
export default function AnalyticsPage() {
  const [branch, setBranch] = useState("Computer Science");
  const [counsellingType, setCounsellingType] = useState("JOSAA");
  const [category, setCategory] = useState("OPEN");
  const [gender, setGender] = useState("Gender-Neutral");
  const [institute, setInstitute] = useState("");
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [institutes, setInstitutes] = useState<string[]>([]);
  /* Starts true: the mount effect below fetches immediately, and seeding the
     initial value here avoids a synchronous setState inside that effect. */
  const [isLoading, setIsLoading] = useState(true);

  const buildParams = () =>
    new URLSearchParams({
      branch,
      counsellingType,
      category,
      gender,
      ...(institute && { institute }),
    });

  /** Manual refetch, triggered when the user changes a filter. */
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?${buildParams()}`);
      const data = await res.json();
      setTrends(data.trends || []);
      setInstitutes(data.institutes || []);
    } catch {
      setTrends([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load. Every state write happens after an await, and results are
  // discarded if the component unmounts mid-flight.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/analytics?${buildParams()}`);
        const data = await res.json();
        if (cancelled) return;
        setTrends(data.trends || []);
        setInstitutes(data.institutes || []);
      } catch {
        if (!cancelled) setTrends([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Filters are read once on mount; later changes go through fetchAnalytics.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">
            Cutoff Analytics
          </h1>
        </div>
        <p className="text-white/50">
          Visualize closing rank trends across years and rounds.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Branch
              </label>
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Computer Science"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Counselling
              </label>
              <Select value={counsellingType} onValueChange={setCounsellingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JOSAA">JoSAA</SelectItem>
                  <SelectItem value="CSAB">CSAB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Gender
              </label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">
                Institute
              </label>
              <Select value={institute} onValueChange={setInstitute}>
                <SelectTrigger>
                  <SelectValue placeholder="All institutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Institutes</SelectItem>
                  {institutes.map((inst) => (
                    <SelectItem key={inst} value={inst}>
                      {inst.substring(0, 50)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={fetchAnalytics}
            className="mt-4"
            disabled={isLoading}
          >
            <Search className="h-4 w-4" />
            {isLoading ? "Loading..." : "Analyze"}
          </Button>
        </CardContent>
      </Card>

      {/* Charts */}
      {trends.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Closing Rank Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                Closing Rank Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient
                        id="colorClosing"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#6366f1"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6366f1"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={12}
                      reversed
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="avgClosingRank"
                      name="Avg Closing Rank"
                      stroke="#6366f1"
                      fill="url(#colorClosing)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgOpeningRank"
                      name="Avg Opening Rank"
                      stroke="#06b6d4"
                      fill="transparent"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Min/Max Range */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                Closing Rank Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={12}
                      reversed
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="minClosingRank"
                      name="Min CR (Best)"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#10b981" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxClosingRank"
                      name="Max CR (Worst)"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#ef4444" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgClosingRank"
                      name="Average CR"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: "#6366f1" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        !isLoading && (
          <Card className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white/60">
              No trend data available
            </h3>
            <p className="text-sm text-white/30 mt-2">
              Import cutoff data via the Admin panel, then search for a
              branch to see trends.
            </p>
          </Card>
        )
      )}
    </div>
  );
}
