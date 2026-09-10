"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, clip, money, taka, tooltipStyle } from "./format";
import type { DashHourly, DashTopProduct } from "./types";

function tick(fontSize = 11) {
  return { fontSize, fill: "hsl(var(--muted-foreground))" };
}

export function SalesTrendChart({ data }: { data: { date: string; sales: number; count: number }[] }) {
  return (
    <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dashSalesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART[1]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART[1]} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tick={tick()} axisLine={false} tickLine={false} />
          <YAxis tick={tick()} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [name === "sales" ? taka(Number(value ?? 0)) : Number(value ?? 0), name === "sales" ? "Sales" : "Tickets"]}
          />
          <Area type="monotone" dataKey="sales" stroke={CHART[1]} strokeWidth={2} fill="url(#dashSalesFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PaymentMixChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <div className="h-[180px] w-full min-w-0 sm:h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="none">
            {data.map((row) => (
              <Cell key={row.name} fill={row.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => taka(Number(value ?? 0))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyBarChart({ data }: { data: DashHourly[] }) {
  const visible = data.filter((h) => {
    const n = Number(h.hour);
    return h.count > 0 || (n >= 8 && n <= 22);
  });
  return (
    <div className="h-[200px] w-full min-w-0 sm:h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={visible} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="hour" tick={tick()} axisLine={false} tickLine={false} />
          <YAxis tick={tick()} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [name === "sales" ? taka(Number(value ?? 0)) : Number(value ?? 0), name === "sales" ? "Sales" : "Tickets"]}
          />
          <Bar dataKey="sales" fill={CHART[5]} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsBarChart({ data }: { data: DashTopProduct[] }) {
  const rows = data.map((p) => ({
    name: clip(p.name, 14),
    revenue: p.revenueValue ?? Number(p.revenue),
  }));
  return (
    <div className="h-[180px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={88} tick={tick(10)} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => taka(Number(value ?? 0))} />
          <Bar dataKey="revenue" fill={CHART[2]} radius={[0, 4, 4, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InventoryDonutChart({
  inStock,
  low,
  out,
}: {
  inStock: number;
  low: number;
  out: number;
}) {
  const data: { name: string; value: number; color: string }[] = [
    { name: "In stock", value: inStock, color: CHART[2] },
    { name: "Low", value: low, color: CHART[3] },
    { name: "Out", value: out, color: CHART[4] },
  ].filter((r) => r.value > 0);
  if (!data.length) {
    data.push({ name: "No SKUs", value: 1, color: "hsl(var(--muted))" });
  }
  return (
    <div className="h-[140px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="none">
            {data.map((row) => (
              <Cell key={row.name} fill={row.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashierBarChart({ data }: { data: { name: string; total: number }[] }) {
  const rows = data.map((r) => ({ ...r, name: clip(r.name, 12) }));
  return (
    <div className="h-[160px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="name" tick={tick(10)} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={tick()} axisLine={false} tickLine={false} width={44} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value) => taka(Number(value ?? 0))} />
          <Bar dataKey="total" fill={CHART[1]} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function formatMoneyTick(v: unknown) {
  return money(Number(v ?? 0));
}
