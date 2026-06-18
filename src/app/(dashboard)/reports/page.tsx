"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Package, Layers, Activity, FileText } from "lucide-react";
import Link from "next/link";

interface Quotation {
  id: string;
  quotationNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  customer: { name: string };
}

interface MonthlyData {
  month: string;
  label: string;
  quotations: number;
  revenue: number;
  confirmed_revenue: number;
}

interface ItemData {
  name: string;
  _sum: { quantity: number; total: number };
  _count: { id: number };
}

interface TemplateData {
  id: string;
  name: string;
  _count: { quotations: number };
}

const ALL_STATUSES = [
  { key: "DRAFT", label: "Draft", color: "bg-zinc-500", textColor: "text-zinc-400", bgLight: "bg-zinc-500/10", border: "border-zinc-500/30" },
  { key: "SENT", label: "Sent", color: "bg-blue-500", textColor: "text-blue-400", bgLight: "bg-blue-500/10", border: "border-blue-500/30" },
  { key: "APPROVED", label: "Approved", color: "bg-green-500", textColor: "text-green-400", bgLight: "bg-green-500/10", border: "border-green-500/30" },
  { key: "IN_PRODUCTION", label: "In Production", color: "bg-amber-500", textColor: "text-amber-400", bgLight: "bg-amber-500/10", border: "border-amber-500/30" },
  { key: "COMPLETED", label: "Completed", color: "bg-emerald-500", textColor: "text-emerald-400", bgLight: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { key: "CLOSED", label: "Closed", color: "bg-purple-500", textColor: "text-purple-400", bgLight: "bg-purple-500/10", border: "border-purple-500/30" },
];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function RevenueBar({ data, maxValue }: { data: { label: string; value: number; secondary?: number }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate mr-2">{d.label}</span>
            <span className="font-medium shrink-0">{formatINR(d.value)}</span>
          </div>
          <div className="h-6 rounded bg-muted overflow-hidden relative">
            <div
              className="h-full rounded bg-primary/30 absolute"
              style={{ width: `${maxValue ? (d.value / maxValue) * 100 : 0}%` }}
            />
            {d.secondary !== undefined && (
              <div
                className="h-full rounded bg-primary absolute"
                style={{ width: `${maxValue ? (d.secondary / maxValue) * 100 : 0}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/quotations?limit=500").then((r) => r.json()),
      fetch("/api/reports?type=monthly").then((r) => r.json()),
      fetch("/api/reports?type=items").then((r) => r.json()),
      fetch("/api/reports?type=templates").then((r) => r.json()),
    ]).then(([q, m, i, t]) => {
      setQuotations(q.quotations || []);
      setMonthly(m);
      setItems(i);
      setTemplates(t);
      setLoading(false);
    });
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    for (const s of ALL_STATUSES) {
      counts[s.key] = { count: 0, value: 0 };
    }
    for (const q of quotations) {
      if (!counts[q.status]) counts[q.status] = { count: 0, value: 0 };
      counts[q.status].count++;
      counts[q.status].value += q.grandTotal;
    }
    return counts;
  }, [quotations]);

  const totalCount = quotations.length;
  const maxCount = Math.max(...Object.values(statusCounts).map((s) => s.count), 1);

  const filteredQuotations = useMemo(() => {
    if (!activeFilter) return quotations;
    return quotations.filter((q) => q.status === activeFilter);
  }, [quotations, activeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxMonthlyRevenue = Math.max(...monthly.map((m) => Number(m.revenue) || 0), 1);
  const totalRev = monthly.reduce((s, m) => s + (Number(m.revenue) || 0), 0);
  const totalQuots = monthly.reduce((s, m) => s + (Number(m.quotations) || 0), 0);
  const avgRevenue = monthly.length > 0 ? totalRev / monthly.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Business analytics and insights</p>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline"><Activity className="w-4 h-4 mr-1.5" /> Quotation Pipeline</TabsTrigger>
          <TabsTrigger value="revenue"><BarChart3 className="w-4 h-4 mr-1.5" /> Revenue & Analytics</TabsTrigger>
        </TabsList>

        {/* Tab 1: Quotation Pipeline */}
        <TabsContent value="pipeline" className="space-y-6">
          {/* Status distribution chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Horizontal stacked bar */}
              <div className="h-10 rounded-lg overflow-hidden flex mb-6">
                {ALL_STATUSES.map((s) => {
                  const pct = totalCount > 0 ? (statusCounts[s.key].count / totalCount) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <button
                      key={s.key}
                      className={`${s.color} h-full transition-opacity hover:opacity-80 relative group`}
                      style={{ width: `${pct}%`, minWidth: pct > 0 ? "24px" : 0 }}
                      onClick={() => setActiveFilter(activeFilter === s.key ? null : s.key)}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {statusCounts[s.key].count}
                      </span>
                    </button>
                  );
                })}
                {totalCount === 0 && <div className="bg-muted w-full h-full" />}
              </div>

              {/* Status cards grid */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {ALL_STATUSES.map((s) => {
                  const isActive = activeFilter === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActiveFilter(isActive ? null : s.key)}
                      className={`rounded-lg p-3 text-left transition-all border ${
                        isActive
                          ? `${s.bgLight} ${s.border} ring-1 ring-current ${s.textColor}`
                          : "border-border hover:border-muted-foreground/30 bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                        <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                      </div>
                      <p className={`text-2xl font-bold ${isActive ? s.textColor : ""}`}>
                        {statusCounts[s.key].count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatINR(statusCounts[s.key].value)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Bar chart per status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {activeFilter
                    ? `${ALL_STATUSES.find((s) => s.key === activeFilter)?.label} Quotations`
                    : "All Quotations"}
                </CardTitle>
                {activeFilter && (
                  <button
                    onClick={() => setActiveFilter(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Visual bar for each status showing proportion */}
              {!activeFilter && (
                <div className="space-y-3 mb-6">
                  {ALL_STATUSES.filter((s) => statusCounts[s.key].count > 0).map((s) => (
                    <button
                      key={s.key}
                      className="w-full text-left"
                      onClick={() => setActiveFilter(s.key)}
                    >
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                          <span className="font-medium">{s.label}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {statusCounts[s.key].count} &bull; {formatINR(statusCounts[s.key].value)}
                        </span>
                      </div>
                      <div className="h-5 rounded bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded ${s.color} transition-all`}
                          style={{ width: `${(statusCounts[s.key].count / maxCount) * 100}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Quotation list */}
              <div className="space-y-2">
                {filteredQuotations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No quotations found</p>
                ) : (
                  filteredQuotations.slice(0, 20).map((q) => {
                    const s = ALL_STATUSES.find((st) => st.key === q.status);
                    return (
                      <Link key={q.id} href={`/quotations/${q.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{q.quotationNumber}</p>
                              <p className="text-xs text-muted-foreground">{q.customer.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`text-[10px] ${s?.bgLight} ${s?.textColor} ${s?.border}`}>
                              {s?.label}
                            </Badge>
                            <p className="text-sm font-semibold text-primary w-28 text-right">{formatINR(q.grandTotal)}</p>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
                {filteredQuotations.length > 20 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 20 of {filteredQuotations.length} quotations
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Revenue & Analytics (existing content) */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">12-Month Revenue</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatINR(totalRev)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Avg. Monthly Revenue</p>
                <p className="text-2xl font-bold mt-1">{formatINR(avgRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Quotations (12m)</p>
                <p className="text-2xl font-bold mt-1">{totalQuots}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="monthly">
            <TabsList>
              <TabsTrigger value="monthly"><BarChart3 className="w-4 h-4 mr-1.5" /> Monthly Revenue</TabsTrigger>
              <TabsTrigger value="items"><Package className="w-4 h-4 mr-1.5" /> Top Items</TabsTrigger>
              <TabsTrigger value="templates"><Layers className="w-4 h-4 mr-1.5" /> Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Monthly Revenue (Last 12 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthly.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                  ) : (
                    <RevenueBar
                      data={monthly.map((m) => ({
                        label: m.label,
                        value: Number(m.revenue) || 0,
                        secondary: Number(m.confirmed_revenue) || 0,
                      }))}
                      maxValue={maxMonthlyRevenue}
                    />
                  )}
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-primary" />
                      Confirmed Revenue
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-primary/30" />
                      Total Revenue
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Most Popular Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}</span>
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Used in {item._count.id} quotations &bull; Total qty: {item._sum.quantity}
                              </p>
                            </div>
                          </div>
                          <p className="font-semibold text-primary">{formatINR(item._sum.total)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No templates yet</p>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-muted-foreground" />
                            <p className="text-sm font-medium">{t.name}</p>
                          </div>
                          <p className="text-sm">
                            <span className="font-bold text-primary">{t._count.quotations}</span>{" "}
                            <span className="text-muted-foreground">quotations</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
