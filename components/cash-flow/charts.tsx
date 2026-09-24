"use client";

import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { CHART, taka, tooltipStyle } from "@/components/dashboard/format";

function tick(fontSize = 11) {
  return { fontSize, fill: "hsl(var(--muted-foreground))" };
}

export function CashFlowTrendChart({ data }: { data: { date: string; inflowN: number; outflowN: number; netN: number }[] }) {
  const short = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));
  return (
    <div className="h-[240px] w-full min-w-0 sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={short} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={tick()} axisLine={false} tickLine={false} />
          <YAxis tick={tick()} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => String(v)} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name) => [taka(Number(value ?? 0)), String(name)]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="inflowN" name="Inflow" stroke={CHART[2]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="outflowN" name="Outflow" stroke={CHART[4]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="netN" name="Net" stroke={CHART[1]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MoneyDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  const display = filtered.length ? filtered : [{ name: "No data", value: 1, color: "hsl(var(--muted))" }];
  return (
    <div className="h-[200px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={display} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="80%" paddingAngle={2} stroke="none">
            {display.map((r) => (
              <Cell key={r.name} fill={r.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => taka(Number(value ?? 0))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MethodBarChart({ data }: { data: { method: string; inflowN: number; outflowN: number }[] }) {
  // keep order: Cash, Card, bKash, Nagad, Other, rest
  const order = ["CASH", "CARD", "BKASH", "NAGAD", "OTHER"];
  const sorted = [...data].sort((a, b) => {
    const ia = order.indexOf(a.method);
    const ib = order.indexOf(b.method);
    const pa = ia === -1 ? 99 : ia;
    const pb = ib === -1 ? 99 : ib;
    return pa - pb;
  });
  // normalize method label
  const rows = sorted.map((r) => ({
    method: r.method === "BKASH" ? "bKash" : r.method === "CASH" ? "Cash" : r.method.charAt(0) + r.method.slice(1).toLowerCase(),
    inflow: r.inflowN,
    outflow: r.outflowN,
  }));
  return (
    <div className="h-[240px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="method" tick={tick(10)} axisLine={false} tickLine={false} />
          <YAxis tick={tick()} axisLine={false} tickLine={false} width={56} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown, name) => [taka(Number(value ?? 0)), String(name)]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="inflow" name="Money In" fill={CHART[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="outflow" name="Money Out" fill={CHART[4]} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
