"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Upload,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  Loader2,
  LogIn,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ImportStats {
  counsellingType: string;
  year: number;
  count: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
  error?: string;
}

/**
 * Helper to set the admin-token cookie for proxy auth.
 * Uses a short-lived cookie (8 hours) scoped to /admin paths.
 */
function setAdminCookie(token: string) {
  const maxAge = 8 * 60 * 60; // 8 hours
  document.cookie = `admin-token=${encodeURIComponent(token)};path=/;max-age=${maxAge};SameSite=Strict`;
}

function clearAdminCookie() {
  document.cookie = "admin-token=;path=/;max-age=0;SameSite=Strict";
}

/**
 * Admin panel for uploading and managing cutoff data.
 * Requires authentication via ADMIN_SECRET env var.
 * Supports CSV and XLSX file uploads with validation.
 */
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState<ImportStats[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [counsellingType, setCounsellingType] = useState("JOSAA");
  const [year, setYear] = useState("2024");
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/import");
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      setStats(data.stats || []);
      setTotalCount(data.totalCount || 0);
    } catch {
      setStats([]);
    }
  }, []);

  // Check if already authenticated (cookie exists and is valid)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/import");
        if (res.ok) {
          setIsAuthenticated(true);
          const data = await res.json();
          setStats(data.stats || []);
          setTotalCount(data.totalCount || 0);
        }
      } catch {
        // Not authenticated
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    // Set the cookie and verify
    setAdminCookie(tokenInput);

    try {
      const res = await fetch("/api/admin/import");
      if (res.ok) {
        setIsAuthenticated(true);
        const data = await res.json();
        setStats(data.stats || []);
        setTotalCount(data.totalCount || 0);
      } else {
        clearAdminCookie();
        setAuthError("Invalid admin token.");
      }
    } catch {
      clearAdminCookie();
      setAuthError("Authentication failed.");
    }
  };

  const handleLogout = () => {
    clearAdminCookie();
    setIsAuthenticated(false);
    setTokenInput("");
    setStats([]);
    setTotalCount(0);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setLastResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("counsellingType", counsellingType);
    formData.append("year", year);

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setLastResult(data);
      fetchStats();
    } catch (error) {
      setLastResult({
        success: false,
        imported: 0,
        skipped: 0,
        total: 0,
        errors: [(error as Error).message],
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (ct: string, yr: number) => {
    const key = `${ct}-${yr}`;
    if (!confirm(`Delete all ${ct} ${yr} records?`)) return;

    setIsDeleting(key);
    try {
      await fetch("/api/admin/import", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counsellingType: ct, year: yr }),
      });
      fetchStats();
    } catch {
      alert("Delete failed");
    } finally {
      setIsDeleting(null);
    }
  };

  // Login gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              Admin Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="admin-token-input"
                  className="text-sm font-medium text-white/70"
                >
                  Admin Token
                </label>
                <input
                  id="admin-token-input"
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter ADMIN_SECRET"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                  autoFocus
                />
              </div>
              {authError && (
                <p className="text-red-400 text-sm flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {authError}
                </p>
              )}
              <Button type="submit" className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Authenticate
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-white/50 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
        <p className="text-white/50">Upload and manage cutoff data.</p>
      </div>

      {/* Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-blue-400" />
            Database Records
            <Badge variant="secondary" className="ml-2">
              {totalCount.toLocaleString()} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-white/40 text-sm">No data imported yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.map((s) => (
                <div
                  key={`${s.counsellingType}-${s.year}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <div>
                    <span className="font-medium text-white">{s.counsellingType}</span>
                    <span className="text-white/40 ml-2">{s.year}</span>
                    <p className="text-sm text-white/50 mt-0.5">
                      {s.count.toLocaleString()} records
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isDeleting === `${s.counsellingType}-${s.year}`}
                    onClick={() => handleDelete(s.counsellingType, s.year)}
                  >
                    {isDeleting === `${s.counsellingType}-${s.year}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-400" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 text-emerald-400" />
            Import Cutoff Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Counselling Type</label>
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
              <label className="text-sm font-medium text-white/70">Year</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex-1">
              <div className="flex items-center justify-center px-6 py-8 border-2 border-dashed border-white/10 rounded-2xl hover:border-blue-500/30 hover:bg-white/[0.02] transition-all cursor-pointer">
                <div className="text-center">
                  <FileSpreadsheet className="h-8 w-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/60">
                    {isUploading ? (
                      <span className="flex items-center gap-2 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </span>
                    ) : (
                      <>
                        <span className="text-blue-400 font-medium">Click to upload</span>
                        {" "}CSV or XLSX file
                      </>
                    )}
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    Official JoSAA / CSAB cutoff data files
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Result */}
          {lastResult && (
            <div className={`p-4 rounded-xl border ${
              lastResult.success
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}>
              <div className="flex items-start gap-3">
                {lastResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-medium text-white text-sm">
                    {lastResult.success
                      ? `Imported ${lastResult.imported} of ${lastResult.total} records`
                      : `Import failed`}
                  </p>
                  {lastResult.skipped > 0 && (
                    <p className="text-xs text-white/50">
                      {lastResult.skipped} rows skipped
                    </p>
                  )}
                  {lastResult.errors.length > 0 && (
                    <div className="text-xs text-red-400/80 space-y-0.5 mt-2">
                      {lastResult.errors.map((err, i) => (
                        <p key={i}>{err}</p>
                      ))}
                    </div>
                  )}
                  {lastResult.error && (
                    <p className="text-xs text-red-400">{lastResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
