"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvailableFilters {
  qualities: (string | null)[];
  speeds: (string | null)[];
  refillDays: (number | null)[];
  geoTargets: (string | null)[];
  durationMinutes: (number | null)[];
  watchDurationSecs: (number | null)[];
}

export interface CustomFilters {
  platform: string;
  serviceType: string;
  quality: string;
  speed: string;
  refill: string;
  geo: string;
  duration: string;
  watchDuration: string;
}

interface Props {
  platforms: string[];
  serviceTypes: string[];
  availableFilters: AvailableFilters | null;
  filters: CustomFilters;
  onChange: (filters: CustomFilters) => void;
}

function refillLabel(days: number | null): string {
  if (days === null) return "ไม่มีประกัน";
  if (days >= 365) return "ตลอดชีพ";
  return `ประกัน ${days} วัน`;
}

function durationLabel(minutes: number | null): string {
  if (minutes === null) return "ไม่ระบุ";
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} ชั่วโมง`;
  return `${minutes} นาที`;
}

function watchDurationLabel(secs: number | null): string {
  if (secs === null) return "ไม่ระบุ";
  if (secs >= 60) return `${secs / 60} นาที`;
  return `${secs} วินาที`;
}

function qualityLabel(q: string | null): string {
  if (q === null) return "ไม่ระบุ";
  const map: Record<string, string> = {
    real: "Real",
    bot: "Bot",
    premium: "Premium",
    mixed: "Mixed",
    high_quality: "High Quality",
    organic: "Organic",
    low_quality: "Low Quality",
  };
  return map[q] ?? q;
}

function speedLabel(s: string | null): string {
  if (s === null) return "ไม่ระบุ";
  const map: Record<string, string> = {
    instant: "ทันที",
    fast: "เร็ว",
    slow: "ช้า",
    gradual: "ค่อยเป็นค่อยไป",
    drip_feed: "Drip Feed",
  };
  return map[s] ?? s;
}

function FilterSelect({
  label,
  value,
  options,
  renderLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: (string | number | null)[];
  renderLabel: (v: string | number | null) => string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select
        value={value || "all"}
        onValueChange={(v) => onChange(!v || v === "all" ? "" : v)}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="ทั้งหมด" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          {options.map((opt, i) => (
            <SelectItem key={i} value={opt === null ? "null" : String(opt)}>
              {renderLabel(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DynamicFilter({ platforms, serviceTypes, availableFilters, filters, onChange }: Props) {
  const set = (key: keyof CustomFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const hasDuration = availableFilters && availableFilters.durationMinutes.length > 0;
  const hasWatchDuration = availableFilters && availableFilters.watchDurationSecs.length > 0;
  const hasQuality = availableFilters && availableFilters.qualities.length > 0;
  const hasSpeed = availableFilters && availableFilters.speeds.length > 0;
  const hasRefill = availableFilters && availableFilters.refillDays.length > 0;
  const hasGeo = availableFilters && availableFilters.geoTargets.length > 0;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap gap-3">
        {/* Platform */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Platform</span>
          <Select
            value={filters.platform || "all"}
            onValueChange={(v) => onChange({ ...filters, platform: !v || v === "all" ? "" : v, serviceType: "", quality: "", speed: "", refill: "", geo: "", duration: "", watchDuration: "" })}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="ทุก Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุก Platform</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Service Type */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">ประเภทบริการ</span>
          <Select
            value={filters.serviceType || "all"}
            onValueChange={(v) => onChange({ ...filters, serviceType: !v || v === "all" ? "" : v, quality: "", speed: "", refill: "", geo: "", duration: "", watchDuration: "" })}
          >
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder="ทุกประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกประเภท</SelectItem>
              {serviceTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {availableFilters && (
        <div className="flex flex-wrap gap-3 border-t pt-3">
          {hasDuration && (
            <FilterSelect
              label="ระยะเวลาไลฟ์"
              value={filters.duration}
              options={availableFilters.durationMinutes}
              renderLabel={(v) => durationLabel(v as number | null)}
              onChange={(v) => set("duration", v)}
            />
          )}
          {hasWatchDuration && (
            <FilterSelect
              label="ระยะเวลารับชม"
              value={filters.watchDuration}
              options={availableFilters.watchDurationSecs}
              renderLabel={(v) => watchDurationLabel(v as number | null)}
              onChange={(v) => set("watchDuration", v)}
            />
          )}
          {hasRefill && (
            <FilterSelect
              label="ประกัน"
              value={filters.refill}
              options={availableFilters.refillDays}
              renderLabel={(v) => refillLabel(v as number | null)}
              onChange={(v) => set("refill", v)}
            />
          )}
          {hasQuality && (
            <FilterSelect
              label="คุณภาพ"
              value={filters.quality}
              options={availableFilters.qualities}
              renderLabel={(v) => qualityLabel(v as string | null)}
              onChange={(v) => set("quality", v)}
            />
          )}
          {hasSpeed && (
            <FilterSelect
              label="ความเร็ว"
              value={filters.speed}
              options={availableFilters.speeds}
              renderLabel={(v) => speedLabel(v as string | null)}
              onChange={(v) => set("speed", v)}
            />
          )}
          {hasGeo && (
            <FilterSelect
              label="ภูมิภาค"
              value={filters.geo}
              options={availableFilters.geoTargets}
              renderLabel={(v) => (v === null ? "ไม่ระบุ" : String(v).toUpperCase())}
              onChange={(v) => set("geo", v)}
            />
          )}
        </div>
      )}
    </div>
  );
}
