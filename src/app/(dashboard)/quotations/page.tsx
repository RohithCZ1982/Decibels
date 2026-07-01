"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, Users, Handshake } from "lucide-react";
import Link from "next/link";

interface Quotation {
  id: string;
  quotationNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  customer: { name: string; mobile: string };
  createdBy: { name: string };
  _count: { items: number; payments: number };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  SENT: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  APPROVED: "bg-green-500/10 text-green-400 border-green-500/20",
  IN_PRODUCTION: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CLOSED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [buyerType, setBuyerType] = useState<"CUSTOMER" | "DEALER">("CUSTOMER");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, page: page.toString(), buyerType });
    if (status !== "all") params.set("status", status);

    const res = await fetch(`/api/quotations?${params}`);
    const data = await res.json();
    setQuotations(data.quotations || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [search, status, buyerType, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage quotes and project lifecycle</p>
        </div>
        <Link href={`/quotations/new?buyerType=${buyerType}`}>
          <Button size="sm" className="md:size-default"><Plus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">New Quotation</span></Button>
        </Link>
      </div>

      <Tabs value={buyerType} onValueChange={(v: string | null) => { setBuyerType((v as "CUSTOMER" | "DEALER") || "CUSTOMER"); setPage(1); }}>
        <TabsList className="grid grid-cols-2 w-[280px]">
          <TabsTrigger value="CUSTOMER" className="w-full"><Users className="w-4 h-4 mr-1.5" /> Customers</TabsTrigger>
          <TabsTrigger value="DEALER" className="w-full"><Handshake className="w-4 h-4 mr-1.5" /> Dealer</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-2 md:gap-3">
        <div className="relative flex-1 min-w-[180px] md:min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search quotations, customers..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={status} onValueChange={(v: string | null) => { setStatus(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All Statuses">All Statuses</SelectItem>
            <SelectItem value="DRAFT" label="Draft">Draft</SelectItem>
            <SelectItem value="SENT" label="Sent">Sent</SelectItem>
            <SelectItem value="APPROVED" label="Approved">Approved</SelectItem>
            <SelectItem value="IN_PRODUCTION" label="In Production">In Production</SelectItem>
            <SelectItem value="COMPLETED" label="Completed">Completed</SelectItem>
            <SelectItem value="CLOSED" label="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quotations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No quotations found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => (
            <Link key={q.id} href={`/quotations/${q.id}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="py-3 md:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      <div className="p-2 md:p-2.5 rounded-lg bg-secondary shrink-0 hidden md:block">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm md:text-base">{q.quotationNumber}</p>
                          <Badge variant="outline" className={`text-[10px] ${statusColors[q.status]}`}>
                            {q.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate">
                          {q.customer.name} &bull; {q._count.items} items
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm md:text-lg font-bold text-primary">{formatINR(q.grandTotal)}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">
                        {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
