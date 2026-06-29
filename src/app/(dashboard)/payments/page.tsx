"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface OutstandingItem {
  id: string;
  quotationNumber: string;
  grandTotal: number;
  balance: number;
  totalPaid: number;
  status: string;
  customer: { name: string; mobile: string };
}

interface DashData {
  stats: { totalPaid: number; outstanding: number; totalRevenue: number };
  outstandingList: OutstandingItem[];
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function PaymentsPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground">Failed to load data</p>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track payments and outstanding balances</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatINR(data.stats.totalPaid)}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{formatINR(data.stats.outstanding)}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary mt-1">{formatINR(data.stats.totalRevenue)}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Outstanding Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.outstandingList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All payments are up to date!</p>
          ) : (
            <div className="space-y-3">
              {data.outstandingList.map((item) => (
                <Link key={item.id} href={`/quotations/${item.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-amber-400">{item.customer.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{item.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quotationNumber} &bull; {item.customer.mobile}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-400">{formatINR(item.balance)}</p>
                      <p className="text-xs text-muted-foreground">of {formatINR(item.grandTotal)}</p>
                      <div className="h-1.5 w-24 rounded-full bg-muted mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(item.totalPaid / item.grandTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
