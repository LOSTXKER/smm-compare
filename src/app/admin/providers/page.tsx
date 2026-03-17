"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  slug: string;
  apiUrl: string;
  apiKey: string;
  isOwner: boolean;
  currency: string;
  active: boolean;
  lastSyncedAt: string | null;
  _count: { services: number };
  healthChecks: { status: string; responseMs: number | null }[];
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Provider | null>(null);

  // Sync progress state
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncStep, setSyncStep] = useState("");
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);
  const [syncProgressStep, setSyncProgressStep] = useState("");
  const [syncLogs, setSyncLogs] = useState<{ time: string; msg: string; type: string }[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [syncLogs]);

  const fetchProviders = () => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSync = async (provider: Provider) => {
    setSyncingId(provider.id);
    setSyncDialogOpen(true);
    setSyncStep("กำลังเริ่ม...");
    setSyncProgress(0);
    setSyncTotal(0);
    setSyncProgressStep("");
    setSyncLogs([]);

    const addLog = (msg: string, type = "info") => {
      const time = new Date().toLocaleTimeString("th-TH");
      setSyncLogs((prev) => [...prev.slice(-100), { time, msg, type }]);
    };

    addLog(`เริ่มซิงค์ ${provider.name}`);

    try {
      const res = await fetch("/api/sync/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider.id }),
      });

      if (!res.body) {
        addLog("ไม่สามารถเชื่อมต่อ stream ได้", "error");
        setSyncingId(null);
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

            switch (event.type) {
              case "step":
                setSyncStep(event.detail);
                addLog(event.detail);
                break;
              case "progress":
                setSyncProgress(event.current);
                setSyncTotal(event.total);
                setSyncProgressStep(event.step);
                break;
              case "provider_done":
                if (event.result.error) {
                  addLog(`ผิดพลาด: ${event.result.error}`, "error");
                } else {
                  addLog(
                    `สำเร็จ: ${event.result.servicesFound} บริการ, ${event.result.priceChanges} ราคาเปลี่ยน, ${event.result.normalized} วิเคราะห์ใหม่`,
                    "success"
                  );
                }
                break;
              case "matching":
                setSyncStep(event.detail);
                addLog(event.detail);
                break;
              case "done":
                addLog(
                  `จับคู่ ${event.matchResult.matched} บริการ, กลุ่มใหม่ ${event.matchResult.newGroups}`,
                  "success"
                );
                break;
            }
          } catch { /* skip */ }
        }
      }

      toast.success(`ซิงค์ ${provider.name} เสร็จสิ้น`);
      fetchProviders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSyncLogs((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString("th-TH"), msg: `เกิดข้อผิดพลาด: ${msg}`, type: "error" },
      ]);
      toast.error("ซิงค์ล้มเหลว");
    } finally {
      setSyncingId(null);
    }
  };

  const syncPercent = syncTotal > 0 ? Math.round((syncProgress / syncTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ผู้ให้บริการ</h1>
          <p className="text-muted-foreground">
            จัดการการเชื่อมต่อ API ของแต่ละ SMM Panel
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button />}>
            + เพิ่มผู้ให้บริการ
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>เพิ่มผู้ให้บริการใหม่</DialogTitle>
            </DialogHeader>
            <ProviderForm
              onSuccess={() => {
                setAddOpen(false);
                fetchProviders();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>แก้ไข {editTarget?.name}</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ProviderForm
              provider={editTarget}
              onSuccess={() => {
                setEditTarget(null);
                fetchProviders();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Sync progress dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={(open) => { if (!syncingId) setSyncDialogOpen(open); }}>
        <DialogContent className="sm:max-w-lg" showCloseButton={!syncingId}>
          <DialogHeader>
            <DialogTitle>
              {syncingId ? "กำลังซิงค์..." : "ซิงค์เสร็จสิ้น"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{syncStep}</p>

            {syncTotal > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {syncProgressStep === "upsert"
                      ? `บันทึกบริการ ${syncProgress}/${syncTotal}`
                      : syncProgressStep === "ai"
                        ? `AI วิเคราะห์ ${syncProgress}/${syncTotal}`
                        : syncProgressStep === "ai_save"
                          ? `บันทึกผลวิเคราะห์ ${syncProgress}/${syncTotal}`
                          : `${syncProgress}/${syncTotal}`}
                  </span>
                  <span>{syncPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${syncPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto rounded-lg bg-zinc-950 px-3 py-2 font-mono text-xs">
              {syncLogs.map((log, i) => (
                <div key={i} className="flex gap-2 py-0.5">
                  <span className="shrink-0 text-zinc-500">{log.time}</span>
                  <span
                    className={
                      log.type === "error"
                        ? "text-red-400"
                        : log.type === "success"
                          ? "text-green-400"
                          : "text-zinc-300"
                    }
                  >
                    {log.type === "error" ? "✗ " : log.type === "success" ? "✓ " : ""}
                    {log.msg}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>

            {!syncingId && (
              <Button className="w-full" onClick={() => setSyncDialogOpen(false)}>
                ปิด
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>ผู้ให้บริการทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ยังไม่มีผู้ให้บริการ กดปุ่ม &quot;+ เพิ่มผู้ให้บริการ&quot;
              เพื่อเริ่มต้น
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>API URL</TableHead>
                  <TableHead>สกุลเงิน</TableHead>
                  <TableHead className="text-center">บริการ</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead>ซิงค์ล่าสุด</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <ProviderRow
                    key={provider.id}
                    provider={provider}
                    onUpdate={fetchProviders}
                    onEdit={() => setEditTarget(provider)}
                    onSync={() => handleSync(provider)}
                    isSyncing={syncingId === provider.id}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderRow({
  provider,
  onUpdate,
  onEdit,
  onSync,
  isSyncing,
}: {
  provider: Provider;
  onUpdate: () => void;
  onEdit: () => void;
  onSync: () => void;
  isSyncing: boolean;
}) {
  const healthStatus = provider.healthChecks[0]?.status || "unknown";
  const responseMs = provider.healthChecks[0]?.responseMs;

  const handleDelete = async () => {
    if (!confirm(`ลบ ${provider.name} พร้อมข้อมูลบริการทั้งหมด?`)) return;
    try {
      await fetch(`/api/providers?id=${provider.id}`, { method: "DELETE" });
      toast.success("ลบผู้ให้บริการแล้ว");
      onUpdate();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {provider.isOwner && <span className="mr-1">&#11088;</span>}
        {provider.name}
        {!provider.active && (
          <Badge variant="secondary" className="ml-2">
            ปิดใช้งาน
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
        {provider.apiUrl}
      </TableCell>
      <TableCell>{provider.currency}</TableCell>
      <TableCell className="text-center">{provider._count.services}</TableCell>
      <TableCell className="text-center">
        <Badge
          variant="outline"
          className={
            healthStatus === "online"
              ? "border-green-500 text-green-500"
              : healthStatus === "unknown"
                ? "border-gray-500 text-gray-500"
                : "border-red-500 text-red-500"
          }
        >
          {healthStatus}
          {responseMs !== null && responseMs !== undefined && (
            <span className="ml-1 text-xs">({responseMs}ms)</span>
          )}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {provider.lastSyncedAt
          ? formatRelativeTime(provider.lastSyncedAt)
          : "ยังไม่เคย"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-3 w-3" />
            แก้ไข
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? "กำลังซิงค์..." : "ซิงค์"}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            ลบ
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProviderForm({
  provider,
  onSuccess,
}: {
  provider?: Provider;
  onSuccess: () => void;
}) {
  const isEdit = !!provider;
  const [name, setName] = useState(provider?.name ?? "");
  const [apiUrl, setApiUrl] = useState(provider?.apiUrl ?? "");
  const [apiKey, setApiKey] = useState(provider?.apiKey ?? "");
  const [currency, setCurrency] = useState(provider?.currency ?? "USD");
  const [isOwner, setIsOwner] = useState(provider?.isOwner ?? false);
  const [active, setActive] = useState(provider?.active ?? true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl, apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(
          `เชื่อมต่อสำเร็จ! พบ ${data.serviceCount} บริการ (${data.responseMs}ms)`
        );
      } else {
        setTestResult(`ล้มเหลว: ${data.error}`);
      }
    } catch {
      setTestResult("ทดสอบการเชื่อมต่อล้มเหลว");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/providers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { id: provider.id, name, apiUrl, apiKey, currency, isOwner, active }
            : { name, apiUrl, apiKey, currency, isOwner }
        ),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(isEdit ? `อัพเดท ${name} สำเร็จ` : `เพิ่ม ${name} สำเร็จ`);
        onSuccess();
      }
    } catch {
      toast.error(isEdit ? "อัพเดทล้มเหลว" : "เพิ่มผู้ให้บริการล้มเหลว");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prov-name">ชื่อผู้ให้บริการ</Label>
        <Input
          id="prov-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="เช่น SMMDragon"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prov-url">API URL</Label>
        <Input
          id="prov-url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://example.com/api/v2"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="prov-key">API Key</Label>
        <Input
          id="prov-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={isEdit ? "ไม่เปลี่ยนให้ว่างไว้" : "API key ของคุณ"}
          required={!isEdit}
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label>สกุลเงิน</Label>
          <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="THB">THB</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="IDR">IDR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              checked={isOwner}
              onChange={(e) => setIsOwner(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">เว็บของเรา</span>
          </label>
          {isEdit && (
            <label className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">เปิดใช้งาน</span>
            </label>
          )}
        </div>
      </div>

      {testResult && (
        <p
          className={`text-sm ${testResult.startsWith("เชื่อมต่อสำเร็จ") ? "text-green-500" : "text-red-500"}`}
        >
          {testResult}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={!apiUrl || !apiKey || testing}
        >
          {testing ? "กำลังทดสอบ..." : "ทดสอบการเชื่อมต่อ"}
        </Button>
        <Button
          type="submit"
          disabled={!name || !apiUrl || (!isEdit && !apiKey) || submitting}
        >
          {submitting ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </form>
  );
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
