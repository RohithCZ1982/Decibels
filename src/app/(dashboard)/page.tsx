"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { Phone, AlertTriangle, FileText, Package } from "lucide-react";

interface Quotation {
  id: string;
  quotationNumber: string;
  status: string;
  grandTotal: number;
  customer: { name: string; mobile: string };
}

interface LowStockItem {
  id: string;
  name: string;
  code: string;
  stock: number | null;
  alertQuantity: number;
  brand: string | null;
  category: { name: string };
}

const STATUSES = [
  { key: "DRAFT", label: "Draft", color: "bg-zinc-500", text: "text-zinc-400", bg: "bg-zinc-500/10", border: "border-zinc-500/30" },
  { key: "SENT", label: "Sent", color: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { key: "APPROVED", label: "Approved", color: "bg-green-500", text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  { key: "IN_PRODUCTION", label: "In Production", color: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { key: "COMPLETED", label: "Completed", color: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { key: "CLOSED", label: "Closed", color: "bg-purple-500", text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/quotations?limit=500").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()),
    ]).then(([qData, dashData]) => {
      setQuotations(qData.quotations || []);
      setLowStockItems(dashData.lowStockItems || []);
    }).finally(() => setLoading(false));
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, Quotation[]> = {};
    for (const s of STATUSES) counts[s.key] = [];
    for (const q of quotations) {
      if (!counts[q.status]) counts[q.status] = [];
      counts[q.status].push(q);
    }
    return counts;
  }, [quotations]);

  const totalCount = quotations.length;
  const activeStatuses = STATUSES.filter((s) => (statusCounts[s.key]?.length || 0) > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of projects and inventory
        </p>
      </div>

      <Tabs defaultValue="quotations">
        <TabsList variant="line" className="w-full justify-start border-b border-border pb-0 mb-2">
          <TabsTrigger value="quotations" className="gap-2 text-sm px-4 py-2">
            <FileText className="w-4 h-4" />
            Quotations
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
              {totalCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="low-stock" className="gap-2 text-sm px-4 py-2">
            <Package className="w-4 h-4" />
            Low Stock Alerts
            {lowStockItems.length > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                {lowStockItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Quotations Tab */}
        <TabsContent value="quotations" className="space-y-6 mt-4">
          {/* Status distribution bar */}
          <Card>
            <CardContent className="pt-6 pb-5">
              <div className="h-12 rounded-xl overflow-hidden flex">
                {STATUSES.map((s) => {
                  const count = statusCounts[s.key]?.length || 0;
                  const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <a
                      key={s.key}
                      href={`#${s.key}`}
                      className={`${s.color} h-full flex items-center justify-center transition-opacity hover:opacity-80 relative group`}
                      style={{ width: `${pct}%`, minWidth: count > 0 ? "40px" : 0 }}
                    >
                      <span className="text-sm font-bold text-white">{count}</span>
                    </a>
                  );
                })}
                {totalCount === 0 && (
                  <div className="bg-muted w-full h-full flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">No quotations yet</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
                {STATUSES.map((s) => {
                  const count = statusCounts[s.key]?.length || 0;
                  if (count === 0) return null;
                  return (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      <span className="text-xs text-muted-foreground">{s.label} ({count})</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quotations grouped by status */}
          {activeStatuses.map((s) => {
            const items = statusCounts[s.key] || [];
            if (items.length === 0) return null;

            return (
              <Card key={s.key} id={s.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    {s.label}
                    <Badge variant="outline" className={`ml-1 text-xs ${s.bg} ${s.text} ${s.border}`}>
                      {items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {items.map((q) => (
                      <Link key={q.id} href={`/quotations/${q.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>
                              <span className={`text-sm font-bold ${s.text}`}>
                                {q.customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{q.customer.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {q.customer.mobile}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatINR(q.grandTotal)}</p>
                            <span className="text-xs text-muted-foreground">{q.quotationNumber}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {totalCount === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">No quotations yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Low Stock Alerts Tab */}
        <TabsContent value="low-stock" className="space-y-6 mt-4">
          {lowStockItems.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Items Below Minimum Stock Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Item</th>
                        <th className="text-left py-2 pr-4 font-medium">Code</th>
                        <th className="text-left py-2 pr-4 font-medium">Category</th>
                        <th className="text-left py-2 pr-4 font-medium">Brand</th>
                        <th className="text-right py-2 pr-4 font-medium">Current Stock</th>
                        <th className="text-right py-2 font-medium">Alert Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockItems.map((item) => (
                        <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="py-3 pr-4">
                            <Link href="/items" className="font-medium hover:text-primary transition-colors">
                              {item.name}
                            </Link>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{item.code}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{item.category.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{item.brand || "—"}</td>
                          <td className="py-3 pr-4 text-right">
                            <span className={`font-semibold ${(item.stock ?? 0) === 0 ? "text-red-400" : "text-yellow-400"}`}>
                              {item.stock ?? 0}
                            </span>
                          </td>
                          <td className="py-3 text-right text-muted-foreground">{item.alertQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">All items are sufficiently stocked</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
