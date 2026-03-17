"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalProviders: number;
  totalServices: number;
  totalGroups: number;
  comparableGroups: number;
  cheaperPercent: number;
  cheaperCount: number;
  moreExpensiveCount: number;
  topExpensive: {
    groupId: string;
    label: string;
    ourRate: number;
    cheapestRate: number;
    cheapestProvider: string;
    diffPercent: number;
  }[];
  nextAutoSync: {
    providerName: string;
    lastSyncedAt: string | null;
  } | null;
  latestSync: {
    providerName: string;
    servicesFound: number;
    priceChanges: number;
    normalized: number;
    error: string | null;
    createdAt: string;
  } | null;
}

export function SummaryStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "ผู้ให้บริการ",
      value: stats.totalProviders,
      sub: `${stats.totalServices} บริการทั้งหมด`,
    },
    {
      title: "กลุ่มบริการ",
      value: stats.totalGroups,
      sub: `${stats.comparableGroups} กลุ่มที่เปรียบเทียบได้`,
    },
    {
      title: "เราถูกกว่าคู่แข่ง",
      value: `${stats.cheaperPercent}%`,
      sub: `${stats.cheaperCount} จาก ${stats.comparableGroups} กลุ่ม`,
      highlight: stats.cheaperPercent >= 50 ? "green" : "red",
    },
    {
      title: "เราแพงกว่าคู่แข่ง",
      value: stats.moreExpensiveCount,
      sub: `จาก ${stats.comparableGroups} กลุ่ม`,
      highlight: "red" as const,
    },
  ];

  const syncInfo = stats.nextAutoSync;
  const lastSyncText = syncInfo?.lastSyncedAt
    ? formatRelativeTime(syncInfo.lastSyncedAt)
    : "ยังไม่เคย";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "text-2xl font-bold",
                  stat.highlight === "green" && "text-green-500",
                  stat.highlight === "red" && "text-red-500"
                )}
              >
                {stat.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {syncInfo && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span>
              ซิงค์อัตโนมัติทุก 1 ชั่วโมง
              {" \u00b7 "}
              ถัดไป: <strong className="text-foreground">{syncInfo.providerName}</strong>
              {" \u00b7 "}
              ซิงค์ล่าสุด: {lastSyncText}
            </span>
          </div>
          {stats.latestSync && (
            <div className="mt-2 flex items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
              <span>
                ล่าสุด: <strong className="text-foreground">{stats.latestSync.providerName}</strong>
                {" "}
                ({formatRelativeTime(stats.latestSync.createdAt)})
              </span>
              {stats.latestSync.error ? (
                <span className="text-red-500">ผิดพลาด: {stats.latestSync.error.slice(0, 50)}</span>
              ) : (
                <>
                  <span>{stats.latestSync.servicesFound} บริการ</span>
                  {stats.latestSync.priceChanges > 0 && (
                    <span className="text-amber-500">{stats.latestSync.priceChanges} ราคาเปลี่ยน</span>
                  )}
                  {stats.latestSync.normalized > 0 && (
                    <span className="text-blue-500">{stats.latestSync.normalized} AI ใหม่</span>
                  )}
                  {stats.latestSync.priceChanges === 0 && stats.latestSync.normalized === 0 && (
                    <span className="text-green-500">ไม่มีการเปลี่ยนแปลง</span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}
