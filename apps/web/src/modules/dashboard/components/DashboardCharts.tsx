import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type CategoryShareItem,
  type HealthDistributionSlice,
  type SalesTrendPoint,
  type StockOutPreventionPoint,
  type StoreRiskBarItem,
} from "../api/dashboard.api";

const HEALTH_COLORS: Record<HealthDistributionSlice["status"], string> = {
  HEALTHY: "#059669",
  LOW: "#d97706",
  CRITICAL: "#dc2626",
  EXCESS: "#7c3aed",
};

const CATEGORY_COLORS = [
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#dc2626",
];

function formatCompactInr(val: number): string {
  if (val >= 10_000_000) {
    return `₹${(val / 10_000_000).toFixed(2)}Cr`;
  }
  if (val >= 100_000) {
    return `₹${(val / 100_000).toFixed(2)}L`;
  }
  if (val >= 1_000) {
    return `₹${(val / 1_000).toFixed(1)}K`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
}

/**
 * 1. SalesTrendChart — 30-Day Daily Revenue vs Target Revenue AreaChart
 */
export const SalesTrendChart: React.FC<{
  data: SalesTrendPoint[];
  title?: string;
}> = ({ data, title = "30-Day Revenue Velocity vs Target (₹)" }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] sm:h-[310px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCompactInr(Number(v))}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              width={68}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `₹${Number(value).toLocaleString("en-IN")}`,
                name === "revenue" ? "Net Revenue" : "Target Benchmark",
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Net Revenue"
              stroke="#2563eb"
              strokeWidth={2.2}
              fillOpacity={1}
              fill="url(#revGrad)"
            />
            <Line
              type="monotone"
              dataKey="targetRevenue"
              name="Target Benchmark"
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth={1.6}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * 2. HealthDonutChart — Inventory Stock Health Distribution (HEALTHY / LOW / CRITICAL / EXCESS)
 */
export const HealthDonutChart: React.FC<{
  data: HealthDistributionSlice[];
  title?: string;
}> = ({ data, title = "SKU-Store Stock Health Distribution" }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] sm:h-[310px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="skuStoreCount"
              nameKey="status"
              cx="50%"
              cy="48%"
              innerRadius={58}
              outerRadius={90}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={HEALTH_COLORS[entry.status] ?? "#64748b"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: HealthDistributionSlice }) => {
                const slice = props?.payload;
                return [
                  `${Number(value).toLocaleString("en-IN")} pairs (${slice?.percentage.toFixed(1)}% · ${formatCompactInr(slice?.valuation ?? 0)})`,
                  slice?.status ?? "Health",
                ];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * 3. StoreRiskBarChart — Top At-Risk Stores by Critical & Low SKU Counts
 */
export const StoreRiskBarChart: React.FC<{
  data: StoreRiskBarItem[];
  title?: string;
}> = ({ data, title = "Top At-Risk Stores (Critical vs Low SKUs)" }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] sm:h-[310px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 20, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
            <YAxis
              type="category"
              dataKey="storeCode"
              tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
              width={82}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} SKUs`,
                name,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="criticalCount"
              name="Critical (< 3d DOI)"
              stackId="risk"
              fill="#dc2626"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="lowCount"
              name="Low (< 7d DOI)"
              stackId="risk"
              fill="#d97706"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * 4. CategoryShareChart — Category Revenue vs Inventory Valuation Breakdown
 */
export const CategoryShareChart: React.FC<{
  data: CategoryShareItem[];
  title?: string;
}> = ({ data, title = "Category Revenue & Stock Valuation (₹)" }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] sm:h-[310px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="categoryName"
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              tickFormatter={(v) => formatCompactInr(Number(v))}
              tick={{ fontSize: 11, fill: "#64748b" }}
              width={66}
            />
            <Tooltip
              formatter={(val: number) =>
                `₹${Number(val).toLocaleString("en-IN")}`
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="revenue" name="30d Revenue" radius={[4, 4, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={entry.categoryName}
                  fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                />
              ))}
            </Bar>
            <Bar
              dataKey="stockValue"
              name="Stock Valuation"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * 5. StockOutPreventionChart — Rebalanced Units & Protected Revenue via Inter-Store Transfers
 */
export const StockOutPreventionChart: React.FC<{
  data: StockOutPreventionPoint[];
  title?: string;
}> = ({ data, title = "Rebalance Impact: Protected Revenue & Units" }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] sm:h-[310px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="weekLabel"
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => formatCompactInr(Number(v))}
              tick={{ fontSize: 11, fill: "#059669" }}
              width={66}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#2563eb" }}
              width={52}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "Protected Revenue (₹)"
                  ? `₹${Number(value).toLocaleString("en-IN")}`
                  : `${Number(value).toFixed(3)} units`
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              yAxisId="left"
              dataKey="protectedRevenue"
              name="Protected Revenue (₹)"
              fill="#059669"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rebalancedUnits"
              name="Rebalanced Units"
              stroke="#2563eb"
              strokeWidth={2.2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
