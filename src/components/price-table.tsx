"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceFilter } from "./service-filter";
import { ExportButton } from "./export-button";
import { DynamicFilter, type CustomFilters } from "./dynamic-filter";
import { useCurrency } from "./currency-provider";

interface NormalizedAttr {
  platform: string;
  serviceType: string;
  quality: string | null;
  speed: string | null;
  refillDays: number | null;
  geoTarget: string | null;
  durationMinutes: number | null;
  watchDurationSec: number | null;
}

interface Service {
  id: string;
  name: string;
  rate: string;
  min: number;
  max: number;
  refill: boolean;
  provider: {
    name: string;
    slug: string;
    isOwner: boolean;
    currency: string;
  };
  normalized?: NormalizedAttr | null;
}

interface ServiceGroup {
  id: string;
  label: string;
  platform: string;
  serviceType: string;
  verified: boolean;
  services: Service[];
  _count: { services: number };
}

interface AvailableFilters {
  qualities: (string | null)[];
  speeds: (string | null)[];
  refillDays: (number | null)[];
  geoTargets: (string | null)[];
  durationMinutes: (number | null)[];
  watchDurationSecs: (number | null)[];
}

interface ServicesResponse {
  groups?: ServiceGroup[];
  services?: Service[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    platforms: string[];
    serviceTypes: string[];
  };
  availableFilters?: AvailableFilters;
}

const EMPTY_CUSTOM_FILTERS: CustomFilters = {
  platform: "",
  serviceType: "",
  quality: "",
  speed: "",
  refill: "",
  geo: "",
  duration: "",
  watchDuration: "",
};

function attrBadges(norm: NormalizedAttr | null | undefined) {
  if (!norm) return null;
  const items: string[] = [];
  if (norm.quality) items.push(norm.quality);
  if (norm.refillDays != null) items.push(norm.refillDays >= 365 ? "ตลอดชีพ" : `ประกัน ${norm.refillDays}ว`);
  if (norm.durationMinutes != null) items.push(`${norm.durationMinutes} นาที`);
  if (norm.watchDurationSec != null) {
    items.push(norm.watchDurationSec >= 60 ? `${norm.watchDurationSec / 60} นาที` : `${norm.watchDurationSec} วิ`);
  }
  if (norm.geoTarget) items.push(norm.geoTarget.toUpperCase());
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
      ))}
    </div>
  );
}

function useFormatPrice() {
  const { convert, displayCurrency } = useCurrency();
  return (rate: number, fromCurrency: string) => {
    const converted = convert(rate, fromCurrency);
    return { value: converted.toFixed(2), currency: displayCurrency };
  };
}

export function PriceTable() {
  const [data, setData] = useState<ServicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"broad" | "detailed" | "custom">("broad");
  const [page, setPage] = useState(1);
  const [customFilters, setCustomFilters] = useState<CustomFilters>(EMPTY_CUSTOM_FILTERS);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("page", String(page));
    params.set("limit", "20");

    if (mode === "custom") {
      if (customFilters.platform) params.set("platform", customFilters.platform);
      if (customFilters.serviceType) params.set("serviceType", customFilters.serviceType);
      if (search) params.set("search", search);
      if (customFilters.quality) params.set("filterQuality", customFilters.quality);
      if (customFilters.speed) params.set("filterSpeed", customFilters.speed);
      if (customFilters.refill) params.set("filterRefill", customFilters.refill);
      if (customFilters.geo) params.set("filterGeo", customFilters.geo);
      if (customFilters.duration) params.set("filterDuration", customFilters.duration);
      if (customFilters.watchDuration) params.set("filterWatchDuration", customFilters.watchDuration);
    } else {
      if (platform) params.set("platform", platform);
      if (serviceType) params.set("serviceType", serviceType);
      if (search) params.set("search", search);
    }

    fetch(`/api/services?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [platform, serviceType, search, mode, page, customFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentPlatforms = data?.filters.platforms ?? [];
  const currentServiceTypes = data?.filters.serviceTypes ?? [];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border bg-muted p-0.5">
              {(["broad", "detailed", "custom"] as const).map((m) => (
                <button
                  key={m}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === m
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => { setMode(m); setPage(1); }}
                >
                  {m === "broad" ? "ภาพรวม" : m === "detailed" ? "ละเอียด" : "กำหนดเอง"}
                </button>
              ))}
            </div>
            {mode !== "custom" && (
              <ServiceFilter
                platforms={currentPlatforms}
                serviceTypes={currentServiceTypes}
                selectedPlatform={platform}
                selectedServiceType={serviceType}
                search={search}
                onPlatformChange={(v) => { setPlatform(v); setPage(1); }}
                onServiceTypeChange={(v) => { setServiceType(v); setPage(1); }}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
              />
            )}
          </div>

          {mode === "custom" && (
            <DynamicFilter
              platforms={currentPlatforms}
              serviceTypes={currentServiceTypes}
              availableFilters={data?.availableFilters ?? null}
              filters={customFilters}
              onChange={(f) => { setCustomFilters(f); setPage(1); }}
            />
          )}
        </div>
        <ExportButton platform={mode === "custom" ? customFilters.platform : platform} serviceType={mode === "custom" ? customFilters.serviceType : serviceType} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : mode === "custom" ? (
        <CustomModeResult data={data} page={page} onPageChange={setPage} />
      ) : data && data.groups && data.groups.length > 0 ? (
        <div className="space-y-4">
          {data.groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            ยังไม่มีข้อมูล กรุณาเพิ่มผู้ให้บริการและกด ซิงค์ข้อมูล
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CustomModeResult({
  data,
  page,
  onPageChange,
}: {
  data: ServicesResponse | null;
  page: number;
  onPageChange: (p: number) => void;
}) {
  if (!data || !data.services || data.services.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          ไม่พบบริการที่ตรงกับเงื่อนไข
        </CardContent>
      </Card>
    );
  }

  const fmt = useFormatPrice();
  const { convert } = useCurrency();
  const ownerService = data.services.find((s) => s.provider.isOwner);
  const ownerRate = ownerService ? convert(Number(ownerService.rate), ownerService.provider.currency) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            พบ {data.total} บริการที่ตรงกับเงื่อนไข
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">ผู้ให้บริการ</TableHead>
                <TableHead>ชื่อบริการ</TableHead>
                <TableHead className="w-44">คุณสมบัติ</TableHead>
                <TableHead className="w-24 text-right">ราคา</TableHead>
                <TableHead className="w-16 text-right">ขั้นต่ำ</TableHead>
                <TableHead className="w-16 text-center">เติมให้</TableHead>
                <TableHead className="w-24 text-right">เทียบกับเรา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.services.map((service) => {
                const price = fmt(Number(service.rate), service.provider.currency);
                const convertedRate = convert(Number(service.rate), service.provider.currency);
                const diff =
                  ownerRate !== null && ownerRate > 0
                    ? ((convertedRate - ownerRate) / ownerRate) * 100
                    : null;
                return (
                  <TableRow key={service.id} className={service.provider.isOwner ? "bg-primary/5" : undefined}>
                    <TableCell className="font-medium">
                      {service.provider.isOwner && <span className="mr-1">&#11088;</span>}
                      {service.provider.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-normal">
                      {service.name}
                    </TableCell>
                    <TableCell>{attrBadges(service.normalized)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {price.value}{" "}
                      <span className="text-xs text-muted-foreground">{price.currency}</span>
                    </TableCell>
                    <TableCell className="text-right">{service.min}</TableCell>
                    <TableCell className="text-center">
                      {service.refill ? (
                        <Badge variant="outline" className="text-green-500">มี</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {service.provider.isOwner ? (
                        <Badge>เราเอง</Badge>
                      ) : diff !== null ? (
                        <span className={diff > 0 ? "font-medium text-green-500" : diff < 0 ? "font-medium text-red-500" : "text-muted-foreground"}>
                          {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination page={page} totalPages={data.totalPages} onPageChange={onPageChange} />
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button className="rounded bg-muted px-3 py-1.5 text-sm disabled:opacity-50" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>ก่อนหน้า</button>
      <span className="text-sm text-muted-foreground">หน้า {page} จาก {totalPages}</span>
      <button className="rounded bg-muted px-3 py-1.5 text-sm disabled:opacity-50" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>ถัดไป</button>
    </div>
  );
}

function GroupCard({ group }: { group: ServiceGroup }) {
  const fmt = useFormatPrice();
  const { convert } = useCurrency();
  const ownerService = group.services.find((s) => s.provider.isOwner);
  const ownerRate = ownerService ? convert(Number(ownerService.rate), ownerService.provider.currency) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Link href={`/services/${group.id}`} className="hover:underline">
            <CardTitle className="text-base">{group.label}</CardTitle>
          </Link>
          <div className="flex gap-2">
            <Badge variant="outline">{group.platform}</Badge>
            <Badge variant="secondary">{group.serviceType}</Badge>
            {group.verified && <Badge className="bg-green-600 text-white">ยืนยันแล้ว</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ผู้ให้บริการ</TableHead>
              <TableHead>ชื่อบริการ</TableHead>
              <TableHead className="text-right">ราคา</TableHead>
              <TableHead className="text-right">ขั้นต่ำ</TableHead>
              <TableHead className="text-right">สูงสุด</TableHead>
              <TableHead className="text-center">เติมให้</TableHead>
              <TableHead className="text-right">เทียบกับเรา</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.services.map((service) => {
              const price = fmt(Number(service.rate), service.provider.currency);
              const convertedRate = convert(Number(service.rate), service.provider.currency);
              const diff =
                ownerRate !== null && ownerRate > 0
                  ? ((convertedRate - ownerRate) / ownerRate) * 100
                  : null;
              return (
                <TableRow key={service.id} className={service.provider.isOwner ? "bg-primary/5" : undefined}>
                  <TableCell className="font-medium">
                    {service.provider.isOwner && <span className="mr-1">&#11088;</span>}
                    {service.provider.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-normal">
                    {service.name}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {price.value}{" "}
                    <span className="text-xs text-muted-foreground">{price.currency}</span>
                  </TableCell>
                  <TableCell className="text-right">{service.min}</TableCell>
                  <TableCell className="text-right">{service.max.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    {service.refill ? (
                      <Badge variant="outline" className="text-green-500">มี</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {service.provider.isOwner ? (
                      <Badge>เราเอง</Badge>
                    ) : diff !== null ? (
                      <span className={diff > 0 ? "font-medium text-green-500" : diff < 0 ? "font-medium text-red-500" : "text-muted-foreground"}>
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
