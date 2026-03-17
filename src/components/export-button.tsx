"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  platform?: string;
  serviceType?: string;
}

export function ExportButton({ platform, serviceType }: ExportButtonProps) {
  const handleExport = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams();
    if (platform) params.set("platform", platform);
    if (serviceType) params.set("serviceType", serviceType);
    params.set("format", format);

    window.open(`/api/export?${params}`, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        ส่งออก
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          ส่งออก CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          ส่งออก Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
