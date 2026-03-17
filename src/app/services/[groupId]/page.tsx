"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { PriceChart } from "@/components/price-chart";

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
  normalized: {
    platform: string;
    serviceType: string;
    quality: string | null;
    speed: string | null;
    refillDays: number | null;
    geoTarget: string | null;
  } | null;
}

interface GroupDetail {
  id: string;
  label: string;
  platform: string;
  serviceType: string;
  verified: boolean;
  services: Service[];
}

export default function ServiceGroupPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/services?groupId=${groupId}`)
      .then((r) => r.json())
      .then(setGroup)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return <div className="h-96 animate-pulse rounded bg-muted" />;
  }

  if (!group) {
    return <p className="text-muted-foreground">Group not found</p>;
  }

  const ownerService = group.services.find((s) => s.provider.isOwner);
  const ownerRate = ownerService ? Number(ownerService.rate) : null;

  return (
    <div className="space-y-6">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; กลับไปหน้าภาพรวม
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{group.label}</h1>
          <div className="mt-2 flex gap-2">
            <Badge variant="outline">{group.platform}</Badge>
            <Badge variant="secondary">{group.serviceType}</Badge>
            {group.verified && (
              <Badge className="bg-green-600 text-white">ยืนยันแล้ว</Badge>
            )}
          </div>
        </div>

        <PriceChart groupId={groupId} />

        <Card>
          <CardHeader>
            <CardTitle>
              เปรียบเทียบราคา ({group.services.length} ผู้ให้บริการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>ผู้ให้บริการ</TableHead>
                  <TableHead>ชื่อบริการ</TableHead>
                  <TableHead>คุณภาพ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                  <TableHead className="text-right">ขั้นต่ำ/สูงสุด</TableHead>
                  <TableHead className="text-center">เติมให้</TableHead>
                  <TableHead className="text-right">เทียบกับเรา</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.services
                  .sort((a, b) => Number(a.rate) - Number(b.rate))
                  .map((service, index) => {
                    const rate = Number(service.rate);
                    const diff =
                      ownerRate !== null && ownerRate > 0
                        ? ((rate - ownerRate) / ownerRate) * 100
                        : null;

                    return (
                      <TableRow
                        key={service.id}
                        className={
                          service.provider.isOwner
                            ? "bg-primary/5"
                            : index === 0
                              ? "bg-green-500/5"
                              : undefined
                        }
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {service.provider.isOwner && (
                            <span className="mr-1">&#11088;</span>
                          )}
                          {service.provider.name}
                          {index === 0 && (
                            <Badge className="ml-2 bg-green-600 text-white text-xs">
                              ถูกสุด
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {service.name}
                        </TableCell>
                        <TableCell>
                          {service.normalized?.quality && (
                            <Badge variant="outline" className="text-xs">
                              {service.normalized.quality}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {rate.toFixed(4)}{" "}
                          <span className="text-xs text-muted-foreground">
                            {service.provider.currency}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {service.min} / {service.max.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {service.refill ? (
                            <Badge
                              variant="outline"
                              className="text-green-500"
                            >
                              มี
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {service.provider.isOwner ? (
                            <Badge>เราเอง</Badge>
                          ) : diff !== null ? (
                            <span
                              className={
                                diff > 0
                                  ? "font-medium text-green-500"
                                  : diff < 0
                                    ? "font-medium text-red-500"
                                    : "text-muted-foreground"
                              }
                            >
                              {diff > 0 ? "+" : ""}
                              {diff.toFixed(1)}%
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
    </div>
  );
}
