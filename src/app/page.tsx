import { SummaryStats } from "@/components/summary-stats";
import { PriceTable } from "@/components/price-table";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">เปรียบเทียบราคา SMM</h1>
        <p className="text-muted-foreground">
          เปรียบเทียบราคาบริการของเรากับคู่แข่งในตลาด
        </p>
      </div>
      <SummaryStats />
      <PriceTable />
    </div>
  );
}
