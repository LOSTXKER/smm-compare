"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PriceHistoryEntry {
  rate: string;
  recordedAt: string;
}

interface ProviderHistory {
  serviceId: string;
  providerName: string;
  providerSlug: string;
  isOwner: boolean;
  currentRate: string;
  history: PriceHistoryEntry[];
}

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

const TIME_RANGES = [
  { label: "7 วัน", days: 7 },
  { label: "30 วัน", days: 30 },
  { label: "90 วัน", days: 90 },
];

export function PriceChart({ groupId }: { groupId: string }) {
  const [data, setData] = useState<ProviderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/services/history?groupId=${groupId}&days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupId, days]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  // Deduplicate: pick one representative service per provider (cheapest rate)
  const providerMap = new Map<string, ProviderHistory>();
  for (const d of data) {
    const existing = providerMap.get(d.providerSlug);
    if (
      !existing ||
      Number(d.currentRate) < Number(existing.currentRate) ||
      d.history.length > existing.history.length
    ) {
      providerMap.set(d.providerSlug, d);
    }
  }
  const uniqueProviders = Array.from(providerMap.values());

  const providersWithHistory = uniqueProviders.filter(
    (d) => d.history.length > 0
  );

  if (providersWithHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ประวัติราคา</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            ยังไม่มีประวัติราคา
            ข้อมูลจะปรากฏเมื่อระบบซิงค์และตรวจพบการเปลี่ยนแปลงราคา
          </p>
        </CardContent>
      </Card>
    );
  }

  const allDates = new Set<string>();
  providersWithHistory.forEach((p) =>
    p.history.forEach((h) => {
      allDates.add(new Date(h.recordedAt).toLocaleDateString("th-TH"));
    })
  );

  const sortedDates = Array.from(allDates).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const chartData = sortedDates.map((date) => {
    const point: Record<string, string | number> = { date };
    providersWithHistory.forEach((p) => {
      const entry = p.history.find(
        (h) => new Date(h.recordedAt).toLocaleDateString("th-TH") === date
      );
      if (entry) {
        point[p.providerName] = Number(entry.rate);
      }
    });
    return point;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">ประวัติราคา</CardTitle>
        <div className="flex rounded-lg border bg-muted p-0.5">
          {TIME_RANGES.map((range) => (
            <button
              key={range.days}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                days === range.days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {providersWithHistory.map((p, i) => (
              <Line
                key={p.providerSlug}
                type="monotone"
                dataKey={p.providerName}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={p.isOwner ? 3 : 1.5}
                dot={{ r: 3 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
