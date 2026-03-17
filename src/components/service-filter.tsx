"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ServiceFilterProps {
  platforms: string[];
  serviceTypes: string[];
  selectedPlatform: string;
  selectedServiceType: string;
  search: string;
  onPlatformChange: (value: string) => void;
  onServiceTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export function ServiceFilter({
  platforms,
  serviceTypes,
  selectedPlatform,
  selectedServiceType,
  search,
  onPlatformChange,
  onServiceTypeChange,
  onSearchChange,
}: ServiceFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="ค้นหากลุ่มบริการ..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-48"
      />
      <Select
        value={selectedPlatform || "all"}
        onValueChange={(v) => onPlatformChange(!v || v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="แพลตฟอร์ม" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกแพลตฟอร์ม</SelectItem>
          {platforms.map((p) => (
            <SelectItem key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={selectedServiceType || "all"}
        onValueChange={(v) => onServiceTypeChange(!v || v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="ประเภทบริการ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ทุกประเภท</SelectItem>
          {serviceTypes.map((t) => (
            <SelectItem key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
