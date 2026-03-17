"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingDown, Check, AlertTriangle } from "lucide-react";

interface Recommendation {
  groupId: string;
  label: string;
  platform: string;
  serviceType: string;
  ourRate: number;
  ourServiceName: string;
  cheapestRate: number;
  cheapestProvider: string;
  avgCompetitorRate: number;
  suggestedRate: number;
  diffFromCheapest: number;
  status: "good" | "ok" | "expensive";
  competitorCount: number;
}

interface PricingData {
  recommendations: Recommendation[];
  platforms: string[];
  summary: { total: number; expensive: number; ok: number; good: number };
}

export default function PricingPage() {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("");
  const [margin, setMargin] = useState("5");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (platform) params.set("platform", platform);
    params.set("margin", margin);
    fetch(`/api/pricing?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [platform, margin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecs = data?.recommendations.filter(
    (r) => statusFilter === "all" || r.status === statusFilter
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">แนะนำราคา</h1>
        <p className="text-muted-foreground">
          คำนวณราคาแนะนำให้ต่ำกว่าคู่แข่ง X% โดยอัตโนมัติ
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Platform</Label>
          <Select
            value={platform || "all"}
            onValueChange={(v) => setPlatform(!v || v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก Platform</SelectItem>
              {data?.platforms.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ส่วนลดจากราคาต่ำสุด (%)</Label>
          <Input
            type="number"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="w-24"
            min={0}
            max={50}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">สถานะ</Label>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="expensive">แพงกว่าคู่แข่ง</SelectItem>
              <SelectItem value="ok">ราคาพอได้</SelectItem>
              <SelectItem value="good">ราคาดี</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-red-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-500">
                <AlertTriangle className="h-4 w-4" />
                แพงกว่าคู่แข่ง
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{data.summary.expensive}</p>
              <p className="text-xs text-muted-foreground">ควรปรับลดราคา</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-500">
                <DollarSign className="h-4 w-4" />
                ราคาพอได้
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-500">{data.summary.ok}</p>
              <p className="text-xs text-muted-foreground">ถูกกว่าคู่แข่งแต่ยังสูงกว่าราคาแนะนำ</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-500">
                <Check className="h-4 w-4" />
                ราคาดี
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{data.summary.good}</p>
              <p className="text-xs text-muted-foreground">ต่ำกว่าราคาแนะนำ</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4" />
            รายการราคาแนะนำ ({filteredRecs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : filteredRecs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ไม่มีบริการที่ตรงกับเงื่อนไข
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>บริการ</TableHead>
                  <TableHead className="text-right">ราคาเรา</TableHead>
                  <TableHead className="text-right">ราคาต่ำสุด</TableHead>
                  <TableHead>เจ้าที่ถูกสุด</TableHead>
                  <TableHead className="text-right">ราคาแนะนำ</TableHead>
                  <TableHead className="text-right">ส่วนต่าง</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecs.map((rec) => (
                  <TableRow
                    key={rec.groupId}
                    className={
                      rec.status === "expensive"
                        ? "bg-red-500/5"
                        : rec.status === "good"
                          ? "bg-green-500/5"
                          : undefined
                    }
                  >
                    <TableCell>
                      <Link
                        href={`/services/${rec.groupId}`}
                        className="hover:underline"
                      >
                        <span className="text-sm font-medium">{rec.label}</span>
                      </Link>
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{rec.platform}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{rec.serviceType}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {rec.ourRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {rec.cheapestRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rec.cheapestProvider}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-primary">
                      {rec.suggestedRate.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          rec.diffFromCheapest > 0
                            ? "text-red-500 font-medium"
                            : rec.diffFromCheapest < 0
                              ? "text-green-500 font-medium"
                              : "text-muted-foreground"
                        }
                      >
                        {rec.diffFromCheapest > 0 ? "+" : ""}
                        {rec.diffFromCheapest.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {rec.status === "expensive" ? (
                        <Badge variant="destructive" className="text-xs">แพง</Badge>
                      ) : rec.status === "ok" ? (
                        <Badge variant="secondary" className="text-xs">พอได้</Badge>
                      ) : (
                        <Badge className="bg-green-600 text-white text-xs">ดี</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
