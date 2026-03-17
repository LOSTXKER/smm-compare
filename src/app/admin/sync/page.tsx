"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Provider {
  id: string;
  name: string;
  _count: { services: number };
}

interface SyncResult {
  providerId: string;
  providerName: string;
  servicesFound: number;
  servicesUpserted: number;
  priceChanges: number;
  normalized: number;
  error?: string;
}

interface MatchResult {
  matched: number;
  newGroups: number;
}

interface LogEntry {
  id: number;
  time: string;
  message: string;
  type: "info" | "success" | "progress" | "error";
}

export default function SyncPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [currentDetail, setCurrentDetail] = useState("");
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [providerIndex, setProviderIndex] = useState(0);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    const id = ++logIdRef.current;
    const time = new Date().toLocaleTimeString("th-TH");
    setLogs((prev) => [...prev.slice(-100), { id, time, message, type }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fetchProviders = useCallback(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setResults([]);
    setMatchResult(null);
    setLogs([]);
    setProviderIndex(0);
    setProgressCurrent(0);
    setProgressTotal(0);
    logIdRef.current = 0;

    addLog(`เริ่มซิงค์ ${providers.length} เว็บ`, "info");

    try {
      const res = await fetch("/api/sync/stream", { method: "POST" });

      if (!res.body) {
        addLog("ไม่สามารถเชื่อมต่อ stream ได้", "error");
        setSyncing(false);
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
          const json = dataLine.slice(6);

          try {
            const event = JSON.parse(json);

            switch (event.type) {
              case "step":
                setCurrentStep(event.provider || "");
                setCurrentDetail(event.detail);
                if (event.step === "start_provider") {
                  const match = event.detail.match(/\((\d+)\//);
                  if (match) setProviderIndex(parseInt(match[1]));
                }
                addLog(event.detail, "info");
                break;

              case "progress":
                setProgressCurrent(event.current);
                setProgressTotal(event.total);
                setProgressStep(event.step);
                if (event.step === "upsert") {
                  setCurrentDetail(`${event.provider}: บันทึกบริการ ${event.current}/${event.total}`);
                } else if (event.step === "ai") {
                  setCurrentDetail(`${event.provider}: AI วิเคราะห์ batch ${event.current}/${event.total}`);
                }
                break;

              case "provider_done":
                setResults((prev) => [...prev, event.result]);
                if (event.result.error) {
                  addLog(`${event.result.providerName}: ผิดพลาด - ${event.result.error}`, "error");
                } else {
                  addLog(
                    `${event.result.providerName}: สำเร็จ (${event.result.servicesFound} บริการ, ${event.result.priceChanges} ราคาเปลี่ยน, ${event.result.normalized} วิเคราะห์ใหม่)`,
                    "success"
                  );
                }
                setProgressCurrent(0);
                setProgressTotal(0);
                break;

              case "matching":
                setCurrentStep("matching");
                setCurrentDetail(event.detail);
                addLog(event.detail, "info");
                break;

              case "done":
                setMatchResult(event.matchResult);
                addLog(
                  `เสร็จสิ้น! จับคู่ ${event.matchResult.matched} บริการ, สร้างกลุ่มใหม่ ${event.matchResult.newGroups} กลุ่ม`,
                  "success"
                );
                break;

              case "error":
                addLog(event.message, "error");
                break;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      addLog(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : "Unknown"}`, "error");
    }

    setSyncing(false);
    setCurrentStep("");
    setCurrentDetail("");
    toast.success("ซิงค์เสร็จสิ้น!");
  };

  const handleRenormalize = async () => {
    if (!confirm("ต้องการรีเซ็ตข้อมูลวิเคราะห์ทั้งหมดและวิเคราะห์ใหม่ด้วย AI ใช่หรือไม่?\n\nจะต้องซิงค์ใหม่หลังจากนี้เพื่อให้ AI วิเคราะห์ข้อมูลใหม่ทั้งหมด")) return;
    try {
      const res = await fetch("/api/renormalize", { method: "POST" });
      const data = await res.json();
      toast.success(`รีเซ็ตแล้ว ${data.deleted} รายการ — กรุณากดซิงค์เพื่อวิเคราะห์ใหม่`);
    } catch {
      toast.error("รีเซ็ตล้มเหลว");
    }
  };

  const overallProgress =
    providers.length > 0
      ? Math.round((providerIndex / providers.length) * 100)
      : 0;

  const subProgressPercent =
    progressTotal > 0
      ? Math.round((progressCurrent / progressTotal) * 100)
      : 0;

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">ซิงค์ข้อมูล</h1>
            <p className="text-muted-foreground">
              ดึงข้อมูลบริการและราคาล่าสุดจากทุกผู้ให้บริการ
            </p>
          </div>
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRenormalize}
            disabled={syncing}
            title="รีเซ็ตข้อมูล AI และวิเคราะห์ใหม่ทั้งหมด (ใช้เมื่อ AI prompt เปลี่ยน)"
          >
            วิเคราะห์ใหม่ทั้งหมด
          </Button>
          <Button
            onClick={handleSyncAll}
            disabled={syncing || providers.length === 0}
            size="lg"
          >
            {syncing ? "กำลังซิงค์..." : `ซิงค์ทั้งหมด (${providers.length} เว็บ)`}
          </Button>
          </div>
        </div>

        {syncing && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{currentStep || "กำลังเตรียมข้อมูล..."}</span>
                <span className="text-muted-foreground">
                  {providerIndex}/{providers.length} เว็บ
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>ภาพรวม</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              {progressTotal > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {progressStep === "upsert"
                        ? `บันทึกบริการ ${progressCurrent}/${progressTotal}`
                        : progressStep === "ai"
                          ? `AI วิเคราะห์ ${progressCurrent}/${progressTotal}`
                          : progressStep === "ai_save"
                            ? `บันทึกผลวิเคราะห์ ${progressCurrent}/${progressTotal}`
                            : `${progressCurrent}/${progressTotal}`}
                    </span>
                    <span>{subProgressPercent}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${subProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                {currentDetail}
              </p>
            </CardContent>
          </Card>
        )}

        {(syncing || logs.length > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">บันทึกการทำงาน</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-60 overflow-y-auto rounded-b-lg bg-zinc-950 px-4 py-3 font-mono text-xs">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2 py-0.5">
                    <span className="shrink-0 text-zinc-500">{log.time}</span>
                    <span
                      className={
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                            ? "text-green-400"
                            : log.type === "progress"
                              ? "text-blue-400"
                              : "text-zinc-300"
                      }
                    >
                      {log.type === "error" ? "✗ " : log.type === "success" ? "✓ " : ""}
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && !syncing && (
          <div className="space-y-4">
            {matchResult && (
              <Card>
                <CardHeader>
                  <CardTitle>ผลการจับคู่</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-2xl font-bold">
                        {matchResult.matched}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        บริการที่จับคู่ได้
                      </p>
                    </div>
                    <div>
                      <span className="text-2xl font-bold">
                        {matchResult.newGroups}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        กลุ่มใหม่ที่สร้าง
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {results.map((result, idx) => (
              <Card key={`${result.providerId}-${idx}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {result.providerName}
                    </CardTitle>
                    <Badge
                      variant={result.error ? "destructive" : "outline"}
                      className={
                        result.error
                          ? undefined
                          : "border-green-500 text-green-500"
                      }
                    >
                      {result.error ? "ผิดพลาด" : "สำเร็จ"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {result.error ? (
                    <p className="text-sm text-red-500">{result.error}</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">
                          {result.servicesFound}
                        </span>
                        <p className="text-muted-foreground">พบบริการ</p>
                      </div>
                      <div>
                        <span className="font-semibold">
                          {result.servicesUpserted}
                        </span>
                        <p className="text-muted-foreground">บันทึกแล้ว</p>
                      </div>
                      <div>
                        <span className="font-semibold">
                          {result.priceChanges}
                        </span>
                        <p className="text-muted-foreground">ราคาเปลี่ยน</p>
                      </div>
                      <div>
                        <span className="font-semibold">
                          {result.normalized}
                        </span>
                        <p className="text-muted-foreground">วิเคราะห์ใหม่</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!syncing && results.length === 0 && logs.length === 0 && (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              กดปุ่ม &quot;ซิงค์ทั้งหมด&quot; เพื่อดึงข้อมูลล่าสุดจากทุกผู้ให้บริการ
            </CardContent>
          </Card>
        )}
    </div>
  );
}
