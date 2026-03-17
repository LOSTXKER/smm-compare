import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const serviceType = searchParams.get("serviceType");
  const format = searchParams.get("format") || "csv";

  const where = {
    ...(platform && { platform }),
    ...(serviceType && { serviceType }),
  };

  const groups = await prisma.serviceGroup.findMany({
    where,
    include: {
      services: {
        include: {
          provider: {
            select: { name: true, isOwner: true, currency: true },
          },
        },
        orderBy: { rate: "asc" },
      },
    },
    orderBy: { label: "asc" },
  });

  const rows: Record<string, string | number>[] = [];

  for (const group of groups) {
    const ownerService = group.services.find((s) => s.provider.isOwner);
    const ownerRate = ownerService ? Number(ownerService.rate) : null;

    for (const service of group.services) {
      const rate = Number(service.rate);
      const diff =
        ownerRate !== null && ownerRate > 0
          ? (((rate - ownerRate) / ownerRate) * 100).toFixed(1)
          : "N/A";

      rows.push({
        Group: group.label,
        Platform: group.platform,
        Type: group.serviceType,
        Provider: service.provider.name,
        "Is Ours": service.provider.isOwner ? "Yes" : "No",
        "Service Name": service.name,
        Rate: rate,
        Currency: service.provider.currency,
        Min: service.min,
        Max: service.max,
        "Price Diff %": diff,
        Refill: service.refill ? "Yes" : "No",
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Price Comparison");

  if (format === "xlsx") {
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="smm-compare-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  }

  const csv = XLSX.utils.sheet_to_csv(worksheet);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="smm-compare-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
