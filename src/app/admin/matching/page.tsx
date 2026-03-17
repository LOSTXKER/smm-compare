"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  rate: string;
  provider: {
    name: string;
    isOwner: boolean;
    currency: string;
  };
  normalized: {
    platform: string;
    serviceType: string;
    quality: string | null;
    speed: string | null;
    refillDays: number | null;
    geoTarget: string | null;
  } | null;
}

interface ServiceGroup {
  id: string;
  label: string;
  platform: string;
  serviceType: string;
  verified: boolean;
  services: Service[];
}

interface GroupsResponse {
  groups: ServiceGroup[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    platforms: string[];
    serviceTypes: string[];
  };
}

export default function MatchingPage() {
  const [data, setData] = useState<GroupsResponse | null>(null);
  const [allGroups, setAllGroups] = useState<{ id: string; label: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchProgress, setMatchProgress] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [mode, setMode] = useState<"detailed" | "broad">("detailed");
  const [page, setPage] = useState(1);

  const fetchAllGroups = useCallback(() => {
    fetch(`/api/services?limit=1000`)
      .then((r) => r.json())
      .then((d) => {
        if (d.groups) {
          setAllGroups(
            d.groups.map((g: ServiceGroup) => ({ id: g.id, label: g.label }))
          );
        }
      })
      .catch(console.error);
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (platform) params.set("platform", platform);
    params.set("page", String(page));
    params.set("limit", "10");
    params.set("mode", mode);

    fetch(`/api/services?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [platform, page, mode]);

  useEffect(() => {
    fetchData();
    fetchAllGroups();
  }, [fetchData, fetchAllGroups]);

  const handleRunMatching = async () => {
    setMatching(true);
    setMatchProgress("กำลังเริ่มจับคู่...");

    try {
      const res = await fetch("/api/match/stream", { method: "POST" });

      if (!res.body) {
        toast.error("ไม่สามารถเชื่อมต่อได้");
        setMatching(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(dataLine.slice(6));
            if (event.detail) setMatchProgress(event.detail);

            if (event.type === "done") {
              toast.success(event.detail);
              fetchData();
              fetchAllGroups();
            } else if (event.type === "error") {
              toast.error(event.detail);
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      toast.error("จับคู่ล้มเหลว");
    } finally {
      setMatching(false);
      setMatchProgress("");
    }
  };

  const handleVerify = async (groupId: string, verified: boolean) => {
    try {
      await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", groupId, verified }),
      });
      toast.success(verified ? "ยืนยันกลุ่มแล้ว" : "ยกเลิกการยืนยัน");
      fetchData();
    } catch {
      toast.error("อัพเดทสถานะล้มเหลว");
    }
  };

  const handleReassign = async (
    serviceId: string,
    newGroupId: string | null
  ) => {
    try {
      await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reassign", serviceId, newGroupId }),
      });
      toast.success("ย้ายบริการแล้ว");
      fetchData();
    } catch {
      toast.error("ย้ายบริการล้มเหลว");
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">จับคู่บริการ</h1>
            <p className="text-muted-foreground">
              ตรวจสอบและแก้ไขการจัดกลุ่มบริการที่ AI สร้างขึ้น
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border bg-muted p-0.5">
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "detailed"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => { setMode("detailed"); setPage(1); }}
              >
                ละเอียด
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "broad"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => { setMode("broad"); setPage(1); }}
              >
                ภาพรวม
              </button>
            </div>
            <Select
              value={platform || "all"}
              onValueChange={(v) => {
                setPlatform(!v || v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุก Platform</SelectItem>
                {data?.filters.platforms.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col items-end gap-1">
              <Button onClick={handleRunMatching} disabled={matching}>
                {matching ? "กำลังจับคู่..." : "รันการจับคู่"}
              </Button>
              {matching && matchProgress && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  {matchProgress}
                </span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-24 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data && data.groups.length > 0 ? (
          <div className="space-y-4">
            {data.groups.map((group) => (
              <MatchGroupCard
                key={group.id}
                group={group}
                allGroups={allGroups}
                onVerify={handleVerify}
                onReassign={handleReassign}
                isBroadMode={mode === "broad"}
              />
            ))}

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ก่อนหน้า
                </Button>
                <span className="text-sm text-muted-foreground">
                  หน้า {page} จาก {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  ถัดไป
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              ยังไม่มีกลุ่มบริการ กรุณาซิงค์ข้อมูลก่อน แล้วค่อยรันการจับคู่
            </CardContent>
          </Card>
        )}
    </div>
  );
}

function MatchGroupCard({
  group,
  allGroups,
  onVerify,
  onReassign,
  isBroadMode,
}: {
  group: ServiceGroup;
  allGroups: { id: string; label: string }[];
  onVerify: (groupId: string, verified: boolean) => void;
  onReassign: (serviceId: string, newGroupId: string | null) => void;
  isBroadMode: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{group.label}</CardTitle>
            <Badge variant="outline">{group.platform}</Badge>
            <Badge variant="secondary">{group.serviceType}</Badge>
            {isBroadMode && (
              <Badge className="bg-blue-600 text-white">
                {group.services.length} บริการ
              </Badge>
            )}
            {!isBroadMode && group.verified && (
              <Badge className="bg-green-600 text-white">ยืนยันแล้ว</Badge>
            )}
          </div>
          {!isBroadMode && (
            <Button
              variant={group.verified ? "outline" : "default"}
              size="sm"
              onClick={() => onVerify(group.id, !group.verified)}
            >
              {group.verified ? "ยกเลิกยืนยัน" : "ยืนยัน"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ผู้ให้บริการ</TableHead>
              <TableHead>ชื่อบริการ</TableHead>
              <TableHead>คุณสมบัติ (AI)</TableHead>
              <TableHead className="text-right">ราคา</TableHead>
              {!isBroadMode && (
                <TableHead className="text-right">ย้ายไปกลุ่ม</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">
                  {service.provider.isOwner && (
                    <span className="mr-1">&#11088;</span>
                  )}
                  {service.provider.name}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {service.name}
                </TableCell>
                <TableCell>
                  {service.normalized ? (
                    <div className="flex flex-wrap gap-1">
                      {service.normalized.quality && (
                        <Badge variant="outline" className="text-xs">
                          {service.normalized.quality}
                        </Badge>
                      )}
                      {service.normalized.speed && (
                        <Badge variant="outline" className="text-xs">
                          {service.normalized.speed}
                        </Badge>
                      )}
                      {service.normalized.refillDays && (
                        <Badge variant="outline" className="text-xs">
                          {service.normalized.refillDays}d refill
                        </Badge>
                      )}
                      {service.normalized.geoTarget && (
                        <Badge variant="outline" className="text-xs">
                          {service.normalized.geoTarget}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      ยังไม่วิเคราะห์
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(service.rate).toFixed(2)} {service.provider.currency}
                </TableCell>
                {!isBroadMode && (
                  <TableCell className="text-right">
                    <Select
                      onValueChange={(v: string | null) => {
                        if (v) {
                          onReassign(service.id, v === "none" ? null : v);
                        }
                      }}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="ย้ายไปกลุ่ม..." />
                      </SelectTrigger>
                      <SelectContent className="max-w-xs">
                        <SelectItem value="none">นำออกจากกลุ่ม</SelectItem>
                        {allGroups
                          .filter((g) => g.id !== group.id)
                          .map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
