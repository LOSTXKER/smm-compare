"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Trophy, TrendingDown, TrendingUp, Minus, ShieldAlert, ExternalLink } from "lucide-react";

interface GroupDetail {
  groupId: string;
  label: string;
  platform: string;
  serviceType: string;
  ourRate: number;
  theirRate: number;
  diffPercent: number;
}

interface PlatformBreakdown {
  cheaper: number;
  expensive: number;
  total: number;
}

interface CompetitorStat {
  id: string;
  name: string;
  slug: string;
  currency: string;
  totalServices: number;
  totalComparable: number;
  cheaperThanUs: number;
  moreExpensive: number;
  samePrice: number;
  avgDiffPercent: number;
  platformBreakdown: Record<string, PlatformBreakdown>;
  exclusiveServices: string[];
  exclusiveCount: number;
  cheaperGroups: GroupDetail[];
  expensiveGroups: GroupDetail[];
}

interface CompetitorData {
  owner: { name: string } | null;
  competitors: CompetitorStat[];
  platforms: string[];
}

type DialogType = "cheaper" | "expensive" | "exclusive" | null;

export default function CompetitorsPage() {
  const [data, setData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("");
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedComp, setSelectedComp] = useState<CompetitorStat | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (platform) params.set("platform", platform);
    fetch(`/api/competitors?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [platform]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDialog = (comp: CompetitorStat, type: DialogType) => {
    setSelectedComp(comp);
    setDialogType(type);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data || data.competitors.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          ยังไม่มีข้อมูลคู่แข่ง กรุณาเพิ่มผู้ให้บริการและซิงค์ข้อมูลก่อน
        </CardContent>
      </Card>
    );
  }

  const cheapest = data.competitors.reduce((a, b) =>
    a.avgDiffPercent > b.avgDiffPercent ? a : b
  );
  const mostExpensive = data.competitors.reduce((a, b) =>
    a.avgDiffPercent < b.avgDiffPercent ? a : b
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">จัดอันดับคู่แข่ง</h1>
          <p className="text-muted-foreground">
            เปรียบเทียบราคาของ {data.owner?.name} กับคู่แข่งทุกเจ้า
          </p>
        </div>
        <Select
          value={platform || "all"}
          onValueChange={(v) => setPlatform(!v || v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ทุก Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุก Platform</SelectItem>
            {data.platforms.map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Trophy className="h-4 w-4 text-yellow-500" />
              คู่แข่งที่ถูกที่สุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{cheapest.name}</p>
            <p className="text-sm text-green-500">
              ถูกกว่าเราเฉลี่ย {Math.abs(cheapest.avgDiffPercent).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-red-500" />
              คู่แข่งที่แพงที่สุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{mostExpensive.name}</p>
            <p className="text-sm text-red-500">
              แพงกว่าเราเฉลี่ย {Math.abs(mostExpensive.avgDiffPercent).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4 text-blue-500" />
              จำนวนคู่แข่ง
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{data.competitors.length} เจ้า</p>
            <p className="text-sm text-muted-foreground">ที่กำลังติดตาม</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking table */}
      <Card>
        <CardHeader>
          <CardTitle>อันดับคู่แข่ง (เรียงตามราคาเฉลี่ยเทียบกับเรา)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>คู่แข่ง</TableHead>
                <TableHead className="text-center">บริการที่เทียบได้</TableHead>
                <TableHead className="text-center">ถูกกว่าเรา</TableHead>
                <TableHead className="text-center">แพงกว่าเรา</TableHead>
                <TableHead className="text-center">ราคาเท่ากัน</TableHead>
                <TableHead className="text-right">ราคาเฉลี่ยเทียบเรา</TableHead>
                <TableHead className="text-center">บริการเฉพาะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.competitors.map((comp, idx) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{comp.name}</TableCell>
                  <TableCell className="text-center">{comp.totalComparable}</TableCell>
                  <TableCell className="text-center">
                    <button
                      className="text-red-500 font-medium hover:underline cursor-pointer"
                      onClick={() => openDialog(comp, "cheaper")}
                    >
                      {comp.cheaperThanUs}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      className="text-green-500 font-medium hover:underline cursor-pointer"
                      onClick={() => openDialog(comp, "expensive")}
                    >
                      {comp.moreExpensive}
                    </button>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {comp.samePrice}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        comp.avgDiffPercent > 0
                          ? "font-medium text-green-500"
                          : comp.avgDiffPercent < 0
                            ? "font-medium text-red-500"
                            : "text-muted-foreground"
                      }
                    >
                      {comp.avgDiffPercent > 0 ? (
                        <TrendingUp className="mr-1 inline h-3 w-3" />
                      ) : comp.avgDiffPercent < 0 ? (
                        <TrendingDown className="mr-1 inline h-3 w-3" />
                      ) : (
                        <Minus className="mr-1 inline h-3 w-3" />
                      )}
                      {comp.avgDiffPercent > 0 ? "+" : ""}
                      {comp.avgDiffPercent.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {comp.exclusiveCount > 0 ? (
                      <button onClick={() => openDialog(comp, "exclusive")} className="cursor-pointer">
                        <Badge variant="secondary" className="hover:bg-accent cursor-pointer">
                          {comp.exclusiveCount}
                        </Badge>
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Platform breakdown per competitor */}
      {data.competitors.map((comp) => {
        const platforms = Object.entries(comp.platformBreakdown);
        if (platforms.length === 0) return null;
        return (
          <Card key={comp.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{comp.name} — แยกตาม Platform</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(comp, "cheaper")}
                  >
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                    ถูกกว่า ({comp.cheaperThanUs})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(comp, "expensive")}
                  >
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    แพงกว่า ({comp.moreExpensive})
                  </Button>
                  {comp.exclusiveCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(comp, "exclusive")}
                    >
                      เฉพาะ ({comp.exclusiveCount})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {platforms.map(([plat, stats]) => {
                  const cheaperPct = stats.total > 0 ? Math.round((stats.cheaper / stats.total) * 100) : 0;
                  return (
                    <div key={plat} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{plat}</span>
                        <Badge variant="outline" className="text-xs">{stats.total} กลุ่ม</Badge>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{ width: `${cheaperPct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                        <span className="text-red-500">{stats.cheaper} ถูกกว่า</span>
                        <span className="text-green-500">{stats.expensive} แพงกว่า</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Detail Dialog */}
      <DetailDialog
        comp={selectedComp}
        type={dialogType}
        ownerName={data.owner?.name || "เรา"}
        onClose={() => { setDialogType(null); setSelectedComp(null); }}
      />
    </div>
  );
}

function DetailDialog({
  comp,
  type,
  ownerName,
  onClose,
}: {
  comp: CompetitorStat | null;
  type: DialogType;
  ownerName: string;
  onClose: () => void;
}) {
  if (!comp || !type) return null;

  const title =
    type === "cheaper"
      ? `${comp.name} ถูกกว่า${ownerName} (${comp.cheaperThanUs} กลุ่ม)`
      : type === "expensive"
        ? `${comp.name} แพงกว่า${ownerName} (${comp.moreExpensive} กลุ่ม)`
        : `บริการที่ ${comp.name} มีแต่${ownerName}ไม่มี (${comp.exclusiveCount})`;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1">
          {type === "exclusive" ? (
            <div className="space-y-1">
              {comp.exclusiveServices.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-sm">{label}</span>
                </div>
              ))}
              {comp.exclusiveServices.length === 0 && (
                <p className="py-4 text-center text-muted-foreground">ไม่มีบริการเฉพาะ</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>บริการ</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">ราคาเรา</TableHead>
                  <TableHead className="text-right">ราคา{comp.name}</TableHead>
                  <TableHead className="text-right">ส่วนต่าง</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(type === "cheaper" ? comp.cheaperGroups : comp.expensiveGroups).map(
                  (g, i) => (
                    <TableRow key={g.groupId}>
                      <TableCell className="font-mono text-muted-foreground text-xs">
                        {i + 1}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {g.label}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {g.platform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {g.ourRate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {g.theirRate.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            g.diffPercent < 0
                              ? "text-red-500 font-medium text-sm"
                              : "text-green-500 font-medium text-sm"
                          }
                        >
                          {g.diffPercent > 0 ? "+" : ""}
                          {g.diffPercent.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/services/${g.groupId}`} onClick={onClose}>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
