"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SystemInfo {
  hasGeminiKey: boolean;
  hasCronSecret: boolean;
  hasAuthSecret: boolean;
  dbConnected: boolean;
  nodeEnv: string;
  lastSync: {
    providerName: string;
    createdAt: string;
    error: string | null;
    servicesFound: number;
    priceChanges: number;
  } | null;
}

interface SettingsResponse {
  config: Record<string, string>;
  defaults: Record<string, string>;
  system: SystemInfo;
}

const SYNC_FIELDS = [
  {
    key: "ai_batch_size",
    label: "Batch Size",
    description: "จำนวนบริการต่อ 1 คำขอ Gemini AI",
    type: "number",
    min: 5,
    max: 100,
  },
  {
    key: "ai_concurrency",
    label: "Concurrency",
    description: "จำนวน batch ที่ทำพร้อมกัน",
    type: "number",
    min: 1,
    max: 5,
  },
  {
    key: "ai_timeout_sec",
    label: "Timeout (วินาที)",
    description: "เวลารอสูงสุดต่อ batch ก่อน timeout",
    type: "number",
    min: 30,
    max: 300,
  },
  {
    key: "ai_max_rounds",
    label: "Max Retry Rounds",
    description: "จำนวนรอบ retry สูงสุดถ้า AI วิเคราะห์ไม่ครบ",
    type: "number",
    min: 1,
    max: 10,
  },
  {
    key: "ai_model",
    label: "Gemini Model",
    description: "ชื่อ model ของ Gemini ที่ใช้วิเคราะห์",
    type: "text",
  },
  {
    key: "sync_cron_schedule",
    label: "Cron Schedule",
    description: "ตารางซิงค์อัตโนมัติ (แสดงเท่านั้น ต้องแก้ใน vercel.json)",
    type: "text",
    readonly: true,
  },
];

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <Badge
        variant="outline"
        className={ok ? "border-green-500 text-green-500" : "border-red-500 text-red-500"}
      >
        {ok ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}
      </Badge>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSettings = () => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SettingsResponse) => {
        setData(d);
        setValues(d.config);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        toast.success("บันทึกการตั้งค่าแล้ว");
        fetchSettings();
      } else {
        toast.error("บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!data) return;
    setValues(data.defaults);
    toast.info("รีเซ็ตเป็นค่าเริ่มต้นแล้ว (กด บันทึก เพื่อใช้งาน)");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sys = data.system;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่าระบบ</h1>
        <p className="text-muted-foreground">จัดการค่าการทำงานของระบบซิงค์และ AI</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sync / AI Config */}
        <Card>
          <CardHeader>
            <CardTitle>การตั้งค่าซิงค์ / AI</CardTitle>
            <CardDescription>ค่าเหล่านี้ส่งผลทันทีเมื่อซิงค์ครั้งถัดไป</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SYNC_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                  {data.defaults[field.key] && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (ค่าเริ่มต้น: {data.defaults[field.key]})
                    </span>
                  )}
                </Label>
                <Input
                  id={field.key}
                  type={field.type === "number" ? "number" : "text"}
                  min={field.min}
                  max={field.max}
                  value={values[field.key] ?? data.defaults[field.key] ?? ""}
                  onChange={(e) =>
                    !field.readonly &&
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  readOnly={field.readonly}
                  className={field.readonly ? "cursor-not-allowed opacity-60" : ""}
                />
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                รีเซ็ตค่าเริ่มต้น
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>สถานะระบบ</CardTitle>
              <CardDescription>ตรวจสอบการตั้งค่า Environment Variables</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <StatusBadge ok={sys.dbConnected} label="Database (Supabase)" />
              <StatusBadge ok={sys.hasGeminiKey} label="GEMINI_API_KEY" />
              <StatusBadge ok={sys.hasCronSecret} label="CRON_SECRET (ซิงค์อัตโนมัติ)" />
              <StatusBadge ok={sys.hasAuthSecret} label="AUTH_SECRET (Login)" />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Environment</span>
                <Badge variant="outline">{sys.nodeEnv}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ซิงค์อัตโนมัติล่าสุด</CardTitle>
            </CardHeader>
            <CardContent>
              {sys.lastSync ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เว็บ</span>
                    <span className="font-medium">{sys.lastSync.providerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">เวลา</span>
                    <span>{formatRelativeTime(sys.lastSync.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">บริการ</span>
                    <span>{sys.lastSync.servicesFound}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ราคาเปลี่ยน</span>
                    <span className={sys.lastSync.priceChanges > 0 ? "text-amber-500" : ""}>
                      {sys.lastSync.priceChanges}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">สถานะ</span>
                    {sys.lastSync.error ? (
                      <Badge variant="destructive" className="text-xs">ผิดพลาด</Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500 text-green-500 text-xs">
                        สำเร็จ
                      </Badge>
                    )}
                  </div>
                  {sys.lastSync.error && (
                    <p className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-500">
                      {sys.lastSync.error}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มีประวัติซิงค์อัตโนมัติ{" "}
                  <span className="block mt-1 text-xs">
                    ต้องตั้งค่า CRON_SECRET ใน Vercel ก่อน
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
