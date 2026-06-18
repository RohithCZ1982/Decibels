"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Hammer,
  PackageCheck,
  Lock,
  CreditCard,
  Download,
  MessageSquare,
  Clock,
  ArrowRight,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { generateQuotationPDF } from "@/lib/pdf-generator";

interface QuotationDetail {
  id: string;
  quotationNumber: string;
  status: string;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  completionDate: string | null;
  createdAt: string;
  customer: { id: string; name: string; mobile: string; email: string | null; address: string | null };
  template: { name: string } | null;
  createdBy: { name: string };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes: string | null;
    item: { code: string; category: { name: string } } | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    date: string;
    mode: string;
    transactionId: string | null;
    notes: string | null;
    recordedBy: { name: string };
  }>;
  projectNotes: Array<{
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    createdBy: { name: string };
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

const statusFlow = [
  { key: "DRAFT", label: "Draft", icon: Clock },
  { key: "SENT", label: "Sent", icon: Send },
  { key: "APPROVED", label: "Approved", icon: CheckCircle },
  { key: "IN_PRODUCTION", label: "In Production", icon: Hammer },
  { key: "COMPLETED", label: "Completed", icon: PackageCheck },
  { key: "CLOSED", label: "Closed", icon: Lock },
];

const nextAction: Record<string, { status: string; label: string; icon: React.ElementType }> = {
  DRAFT: { status: "SENT", label: "Mark as Sent", icon: Send },
  SENT: { status: "APPROVED", label: "Mark as Approved", icon: CheckCircle },
  APPROVED: { status: "IN_PRODUCTION", label: "Start Production", icon: Hammer },
  IN_PRODUCTION: { status: "COMPLETED", label: "Mark Completed", icon: PackageCheck },
  COMPLETED: { status: "CLOSED", label: "Close Project", icon: Lock },
};

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: new Date().toISOString().split("T")[0], mode: "BANK_TRANSFER", transactionId: "", notes: "" });
  const [noteContent, setNoteContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/quotations/${id}`);
    if (res.ok) {
      setQuotation(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    const res = await fetch(`/api/quotations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to update status");
    }
    setSaving(false);
  };

  const addPayment = async () => {
    if (!payForm.amount || !payForm.date || !payForm.mode) {
      toast.error("Amount, date, and mode are required");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/quotations/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payForm),
    });
    if (res.ok) {
      toast.success("Payment recorded");
      setPaymentOpen(false);
      setPayForm({ amount: "", date: new Date().toISOString().split("T")[0], mode: "BANK_TRANSFER", transactionId: "", notes: "" });
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to record payment");
    }
    setSaving(false);
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/quotations/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent }),
    });
    if (res.ok) {
      toast.success("Note added");
      setNoteOpen(false);
      setNoteContent("");
      load();
    }
    setSaving(false);
  };

  const handleDownloadPDF = () => {
    if (!quotation) return;
    generateQuotationPDF(quotation);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quotation) return <p className="text-muted-foreground">Quotation not found</p>;

  const totalPaid = quotation.payments.reduce((s, p) => s + p.amount, 0);
  const balance = quotation.grandTotal - totalPaid;
  const action = nextAction[quotation.status];
  const currentStatusIdx = statusFlow.findIndex((s) => s.key === quotation.status);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/quotations")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quotation.quotationNumber}</h1>
              <Badge variant="outline" className={`${statusColors[quotation.status]}`}>
                {quotation.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {formatDate(quotation.createdAt)} by {quotation.createdBy.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          {action && (
            <Button onClick={() => updateStatus(action.status)} disabled={saving}>
              <action.icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {statusFlow.map((step, idx) => {
              const isActive = idx <= currentStatusIdx;
              const isCurrent = step.key === quotation.status;
              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isCurrent ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < statusFlow.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded ${isActive && idx < currentStatusIdx ? "bg-primary/40" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{quotation.customer.name}</p>
            <p className="text-muted-foreground">{quotation.customer.mobile}</p>
            {quotation.customer.email && <p className="text-muted-foreground">{quotation.customer.email}</p>}
            {quotation.customer.address && <p className="text-muted-foreground">{quotation.customer.address}</p>}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(quotation.subtotal)}</span></div>
            {quotation.discount > 0 && (
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatINR(quotation.discount)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">GST ({quotation.gstPercent}%)</span><span>{formatINR(quotation.gstAmount)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span className="text-primary">{formatINR(quotation.grandTotal)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-emerald-400">{formatINR(totalPaid)}</span></div>
            <div className="flex justify-between font-medium">
              <span>Balance</span>
              <span className={balance > 0 ? "text-amber-400" : "text-emerald-400"}>{formatINR(balance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {quotation.template && (
              <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span>{quotation.template.name}</span></div>
            )}
            {quotation.validUntil && (
              <div className="flex justify-between"><span className="text-muted-foreground">Valid Until</span><span>{formatDate(quotation.validUntil)}</span></div>
            )}
            {quotation.completionDate && (
              <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{formatDate(quotation.completionDate)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{quotation.items.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payments</span><span>{quotation.payments.length}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-4">#</th>
                  <th className="text-left py-2 pr-4">Item</th>
                  <th className="text-right py-2 pr-4">Qty</th>
                  <th className="text-right py-2 pr-4">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="py-2.5 pr-4 text-muted-foreground">{idx + 1}</td>
                    <td className="py-2.5 pr-4">
                      <p className="font-medium">{item.name}</p>
                      {item.item && (
                        <p className="text-xs text-muted-foreground">{item.item.code} &bull; {item.item.category?.name}</p>
                      )}
                      {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="py-2.5 pr-4 text-right">{item.quantity}</td>
                    <td className="py-2.5 pr-4 text-right">{formatINR(item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-medium">{formatINR(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payments
            </CardTitle>
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
              <DialogTrigger>
                <Button variant="outline" size="sm">Record Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (INR) *</Label>
                      <Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder={balance.toString()} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode *</Label>
                    <Select value={payForm.mode} onValueChange={(v: string | null) => setPayForm({ ...payForm, mode: v || "BANK_TRANSFER" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input value={payForm.transactionId} onChange={(e) => setPayForm({ ...payForm, transactionId: e.target.value })} placeholder="Reference number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} rows={2} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                    <Button onClick={addPayment} disabled={saving}>
                      {saving ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {quotation.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No payments recorded</p>
            ) : (
              <div className="space-y-2">
                {quotation.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{formatINR(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.date)} &bull; {p.mode.replace("_", " ")} &bull; by {p.recordedBy.name}
                      </p>
                      {p.transactionId && <p className="text-xs text-muted-foreground">Ref: {p.transactionId}</p>}
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Paid
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {/* Balance bar */}
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{Math.min(100, Math.round((totalPaid / quotation.grandTotal) * 100))}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (totalPaid / quotation.grandTotal) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project Notes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Project Notes
            </CardTitle>
            <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
              <DialogTrigger>
                <Button variant="outline" size="sm">Add Note</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Project Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Add progress update, notes, or observations..." rows={4} />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
                    <Button onClick={addNote} disabled={saving}>
                      {saving ? "Adding..." : "Add Note"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {quotation.projectNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No notes yet</p>
            ) : (
              <div className="space-y-3">
                {quotation.projectNotes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-muted/30">
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(note.createdAt)} by {note.createdBy.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Terms */}
      {quotation.terms && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{quotation.terms}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
