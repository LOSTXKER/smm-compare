"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchService {
  id: string;
  externalId: string;
  name: string;
  rate: string;
  currency: string;
  platform: string | null;
  serviceType: string | null;
  groupId: string | null;
  groupLabel: string | null;
}

interface SearchGroup {
  provider: string;
  isOwner: boolean;
  services: SearchService[];
}

interface SearchResult {
  results: SearchGroup[];
  total: number;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback((q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const handleCustom = () => setOpen(true);

    window.addEventListener("keydown", handleKey);
    document.addEventListener("open-search", handleCustom);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("open-search", handleCustom);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl mx-4">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาบริการทุกเว็บ... (ชื่อ, ID, หมวดหมู่)"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="ml-2 text-sm text-muted-foreground">กำลังค้นหา...</span>
            </div>
          )}

          {!loading && results && results.results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              ไม่พบบริการที่ตรงกับ &quot;{query}&quot;
            </p>
          )}

          {!loading && results && results.results.length > 0 && (
            <div className="space-y-3">
              <p className="px-2 text-xs text-muted-foreground">พบ {results.total} บริการ</p>
              {results.results.map((group) => (
                <div key={group.provider}>
                  <p className="mb-1 px-2 text-xs font-semibold text-muted-foreground">
                    {group.isOwner && <span className="mr-1">&#11088;</span>}
                    {group.provider} ({group.services.length})
                  </p>
                  <div className="space-y-0.5">
                    {group.services.slice(0, 10).map((svc) => (
                      <Link
                        key={svc.id}
                        href={svc.groupId ? `/services/${svc.groupId}` : "#"}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm">{svc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {svc.platform && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {svc.platform}
                              </Badge>
                            )}
                            {svc.serviceType && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                {svc.serviceType}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              ID: {svc.externalId}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm">
                          {Number(svc.rate).toFixed(2)} {svc.currency}
                        </span>
                      </Link>
                    ))}
                    {group.services.length > 10 && (
                      <p className="px-3 py-1 text-xs text-muted-foreground">
                        ...อีก {group.services.length - 10} บริการ
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !results && query.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</p>
              <p className="mt-1 text-xs text-muted-foreground">ค้นหาด้วยชื่อบริการ, ID, หรือหมวดหมู่</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
