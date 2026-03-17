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

  return (
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
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
