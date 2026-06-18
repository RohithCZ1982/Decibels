"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, MapPin, FileText } from "lucide-react";
import Link from "next/link";

interface CustomerDetail {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  quotations: Array<{
    id: string;
    quotationNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
  }>;
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

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then(setCustomer)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) return <p className="text-muted-foreground">Customer not found</p>;

  const totalValue = customer.quotations.reduce((s, q) => s + q.grandTotal, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/customers")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Customer details and history</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{customer.mobile}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p>{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Quotations</p>
                <p className="text-2xl font-bold">{customer.quotations.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-primary">{formatINR(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Quotation History</CardTitle>
          <Link href="/quotations/new">
            <Button size="sm" variant="outline">New Quotation</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {customer.quotations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No quotations yet</p>
          ) : (
            <div className="space-y-2">
              {customer.quotations.map((q) => (
                <Link key={q.id} href={`/quotations/${q.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{q.quotationNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[q.status]}`}>
                        {q.status.replace("_", " ")}
                      </Badge>
                      <p className="font-semibold text-primary">{formatINR(q.grandTotal)}</p>
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
