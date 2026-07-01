"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
  User,
  Pencil,
  X,
  Save,
  Trash2,
  Printer,
  Edit2,
  ClipboardList,
  Undo2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { LineItemEditor, nextLineItemKey, emptyLineItem, type LineItem, type CatalogItem, type DivisionOption } from "@/components/line-item-editor";
import { calculateQuotationTotals, EDITABLE_STATUSES, INVOICE_STATUSES } from "@/lib/quotation-calc";

interface BankDetail {
  id: string;
  name: string;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
}

interface QuotationDetail {
  id: string;
  quotationNumber: string;
  title: string | null;
  status: string;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;
  roundOff: number;
  includeGst: boolean;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  completionDate: string | null;
  billDate: string | null;
  createdAt: string;
  customer: { id: string; name: string; mobile: string; email: string | null; address: string | null; gstNumber: string | null };
  template: { name: string } | null;
  createdBy: { name: string };
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    hsnCode: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    gstRate: number;
    total: number;
    notes: string | null;
    divisionId: string;
    division: { id: string; name: string; slug: string; order: number };
    item: { code: string; description: string | null; category: { name: string } } | null;
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

const prevAction: Record<string, { status: string; label: string }> = {
  SENT: { status: "DRAFT", label: "Back to Draft" },
  APPROVED: { status: "SENT", label: "Back to Sent" },
  IN_PRODUCTION: { status: "APPROVED", label: "Back to Approved" },
  COMPLETED: { status: "IN_PRODUCTION", label: "Back to Production" },
  CLOSED: { status: "COMPLETED", label: "Back to Completed" },
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
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editPayForm, setEditPayForm] = useState({ amount: "", date: "", mode: "BANK_TRANSFER", transactionId: "", notes: "" });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<LineItem[]>([]);
  const [editIncludeGst, setEditIncludeGst] = useState(true);
  const [editEnableRoundOff, setEditEnableRoundOff] = useState(false);
  const [editBillDate, setEditBillDate] = useState("");
  const [editDiscountAdj, setEditDiscountAdj] = useState(0);
  const [editDiscountInput, setEditDiscountInput] = useState("");
  const [allCatalogItems, setAllCatalogItems] = useState<CatalogItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [activeBankDetail, setActiveBankDetail] = useState<BankDetail | null>(null);

  const load = useCallback(async () => {
    const [qRes, dRes, bRes] = await Promise.all([
      fetch(`/api/quotations/${id}`),
      fetch("/api/divisions"),
      fetch("/api/bank-details/active"),
    ]);
    if (qRes.ok) setQuotation(await qRes.json());
    if (dRes.ok) setDivisions(await dRes.json());
    if (bRes.ok) setActiveBankDetail(await bRes.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const prevAutoDiscRef = useRef(0);
  useEffect(() => {
    if (!editing) return;
    const autoDisc = editItems
      .filter((li) => li.name && li.unitPrice > 0)
      .reduce((sum, li) => sum + li.quantity * li.unitPrice * ((li.discount || 0) / 100), 0);
    const diff = autoDisc - prevAutoDiscRef.current;
    if (diff !== 0) {
      prevAutoDiscRef.current = autoDisc;
      setEditDiscountInput((prev) => Math.round((parseFloat(prev) || 0) + diff).toString());
    }
  }, [editing, editItems]);

  const startEditing = async () => {
    if (!quotation) return;
    if (allCatalogItems.length === 0) {
      const res = await fetch("/api/items?all=true");
      if (res.ok) setAllCatalogItems(await res.json());
    }
    setEditItems(
      quotation.items.map((item) => ({
        key: nextLineItemKey(),
        name: item.name,
        description: item.description || "",
        hsnCode: item.hsnCode || "",
        quantity: item.quantity,
        unit: item.unit || "No",
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        gstRate: item.gstRate,
        itemId: item.item ? undefined as unknown as string : null,
        notes: item.notes || "",
        divisionId: item.divisionId,
      }))
    );
    const itemAutoDisc = quotation.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * ((item.discount || 0) / 100), 0);
    const adj = Math.max(0, quotation.discount - itemAutoDisc);
    setEditDiscountAdj(adj);
    setEditDiscountInput(Math.round(itemAutoDisc + adj).toString());
    prevAutoDiscRef.current = itemAutoDisc;
    setEditIncludeGst(quotation.includeGst);
    setEditEnableRoundOff(quotation.roundOff !== 0);
    setEditBillDate(quotation.billDate ? new Date(quotation.billDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveEdits = async () => {
    const validItems = editItems.filter((li) => li.name && li.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error("At least one valid item is required");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: validItems.map((li) => ({
          name: li.name,
          description: li.description || null,
          hsnCode: li.hsnCode || null,
          quantity: li.quantity,
          unit: li.unit || "No",
          unitPrice: li.unitPrice,
          discount: li.discount || 0,
          gstRate: li.gstRate,
          itemId: li.itemId,
          notes: li.notes,
          divisionId: li.divisionId,
        })),
        discount: editDisc,
        includeGst: editIncludeGst,
        enableRoundOff: editEnableRoundOff,
        billDate: editBillDate,
        notes: quotation?.notes,
        terms: quotation?.terms,
      }),
    });
    if (res.ok) {
      toast.success("Quotation updated");
      setEditing(false);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to update");
    }
    setSaving(false);
  };

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

  const startEditPayment = (p: QuotationDetail["payments"][0]) => {
    setEditingPayment(p.id);
    setEditPayForm({
      amount: p.amount.toString(),
      date: new Date(p.date).toISOString().split("T")[0],
      mode: p.mode,
      transactionId: p.transactionId || "",
      notes: p.notes || "",
    });
    setPaymentOpen(true);
  };

  const updatePayment = async () => {
    if (!editingPayment || !editPayForm.amount || !editPayForm.date || !editPayForm.mode) {
      toast.error("Amount, date, and mode are required");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/payments/${editingPayment}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editPayForm),
    });
    if (res.ok) {
      toast.success("Payment updated");
      setPaymentOpen(false);
      setEditingPayment(null);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to update payment");
    }
    setSaving(false);
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment?")) return;
    const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Payment deleted");
      load();
    } else {
      toast.error("Failed to delete payment");
    }
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
      setEditingNote(null);
      load();
    }
    setSaving(false);
  };

  const startEditNote = (note: QuotationDetail["projectNotes"][0]) => {
    setEditingNote(note.id);
    setEditNoteContent(note.content);
    setNoteOpen(true);
  };

  const updateNote = async () => {
    if (!editingNote || !editNoteContent.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/notes/${editingNote}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editNoteContent }),
    });
    if (res.ok) {
      toast.success("Note updated");
      setNoteOpen(false);
      setEditingNote(null);
      setEditNoteContent("");
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to update note");
    }
    setSaving(false);
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Note deleted");
      load();
    } else {
      toast.error("Failed to delete note");
    }
  };

  const handleDownloadPDF = async () => {
    if (!quotation) return;
    const { generateQuotationPDF } = await import("@/lib/pdf-generator");
    await generateQuotationPDF(quotation, activeBankDetail);
  };

  const handleItemListPDF = async () => {
    if (!quotation) return;
    const { generateItemListPDF } = await import("@/lib/pdf-generator");
    await generateItemListPDF(quotation);
  };

  const handleDownloadExcel = async () => {
    if (!quotation) return;
    const { generateQuotationExcel } = await import("@/lib/excel-generator");
    generateQuotationExcel(quotation, activeBankDetail);
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
  const prev = prevAction[quotation.status];
  const currentStatusIdx = statusFlow.findIndex((s) => s.key === quotation.status);
  const isInvoice = INVOICE_STATUSES.includes(quotation.status);
  const canEdit = EDITABLE_STATUSES.includes(quotation.status);

  // Edit mode calculations
  const editValidItems = editItems.filter((li) => li.name && li.unitPrice > 0);
  const editAutoDisc = editValidItems.reduce((sum, li) => sum + li.quantity * li.unitPrice * ((li.discount || 0) / 100), 0);
  const editDisc = parseFloat(editDiscountInput) || 0;
  const editCalc = editing
    ? calculateQuotationTotals({
        items: editValidItems,
        discount: editDisc,
        includeGst: editIncludeGst,
        roundOff: editEnableRoundOff,
      })
    : null;

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push("/quotations")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold">{quotation.quotationNumber}</h1>
              <Badge variant="outline" className={`${statusColors[quotation.status]}`}>
                {quotation.status.replace("_", " ")}
              </Badge>
              {isInvoice && (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                  Tax Invoice
                </Badge>
              )}
            </div>
            {quotation.title && (
              <p className="text-sm font-medium text-primary mt-0.5">{quotation.title}</p>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {formatDate(quotation.createdAt)} by {quotation.createdBy.name}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 md:gap-2 flex-wrap">
          {editing ? (
            <>
              <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={cancelEditing} disabled={saving} title="Cancel">
                <X className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Cancel</span>
              </Button>
              <Button size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={saveEdits} disabled={saving} title={saving ? "Saving..." : "Save Changes"}>
                <Save className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{saving ? "Saving..." : "Save Changes"}</span>
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={startEditing} title="Edit">
                  <Pencil className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Edit</span>
                </Button>
              )}
              <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={handleDownloadPDF} title="Download PDF">
                <Download className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">PDF</span>
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={handleDownloadExcel} title="Download Excel">
                <FileSpreadsheet className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Excel</span>
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={handleItemListPDF} title="Item List">
                <ClipboardList className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Item List</span>
              </Button>
              {prev && (
                <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={() => updateStatus(prev.status)} disabled={saving} title={prev.label}>
                  <Undo2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{prev.label}</span>
                </Button>
              )}
              {action && (
                <Button size="icon" className="h-8 w-8 md:h-9 md:w-auto md:px-3" onClick={() => updateStatus(action.status)} disabled={saving} title={action.label}>
                  <action.icon className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">{action.label}</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Pipeline */}
      <Card>
        <CardContent className="py-3 md:py-4">
          <div className="flex items-center justify-between">
            {statusFlow.map((step, idx) => {
              const isActive = idx <= currentStatusIdx;
              const isCurrent = step.key === quotation.status;
              return (
                <div key={step.key} className="flex items-center flex-1" title={step.label}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-colors ${
                      isCurrent ? "bg-primary text-primary-foreground" : isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <step.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <span className={`hidden md:block text-[10px] mt-1.5 font-medium text-center leading-tight ${isCurrent ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < statusFlow.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-0.5 md:mx-1 rounded ${isActive && idx < currentStatusIdx ? "bg-primary/40" : "bg-muted"}`} />
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
            {quotation.customer.gstNumber && <p className="text-muted-foreground">GSTIN: {quotation.customer.gstNumber}</p>}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {editing && editCalc ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(editCalc.subtotal)}</span></div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-gst" className="text-sm text-muted-foreground cursor-pointer">Include GST</Label>
                  <Switch id="edit-gst" checked={editIncludeGst} onCheckedChange={setEditIncludeGst} />
                </div>
                {editIncludeGst ? (
                  editCalc.gstBreakdown.map((g) => (
                    <div key={g.rate} className="flex justify-between"><span className="text-muted-foreground">GST @{g.rate}%</span><span>{formatINR(g.gst)}</span></div>
                  ))
                ) : (
                  <div className="text-muted-foreground">GST: Not Applicable</div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground flex-1 text-sm">Discount</span>
                  <Input
                    type="number"
                    className="w-28 h-7 text-right text-sm"
                    value={editDiscountInput}
                    onChange={(e) => setEditDiscountInput(e.target.value)}
                    onBlur={() => {
                      const val = parseFloat(editDiscountInput) || 0;
                      setEditDiscountAdj(Math.max(0, val - editAutoDisc));
                    }}
                  />
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span className="text-primary">{formatINR(editCalc.grandTotal)}</span></div>
                <div className="space-y-2 pt-2">
                  <Label className="text-muted-foreground">Bill Date</Label>
                  <Input type="date" className="h-8" value={editBillDate} onChange={(e) => setEditBillDate(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(quotation.subtotal)}</span></div>
                {quotation.includeGst ? (
                  (() => {
                    const gstMap = new Map<number, number>();
                    for (const it of quotation.items) {
                      gstMap.set(it.gstRate, (gstMap.get(it.gstRate) || 0) + (it.total * it.gstRate) / 100);
                    }
                    const entries = Array.from(gstMap.entries()).sort((a, b) => a[0] - b[0]);
                    return entries.map(([rate, amt]) => (
                      <div key={rate} className="flex justify-between"><span className="text-muted-foreground">GST @{rate}%</span><span>{formatINR(amt)}</span></div>
                    ));
                  })()
                ) : (
                  <div className="text-muted-foreground text-sm">GST: Not Applicable</div>
                )}
                {quotation.discount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatINR(quotation.discount)}</span></div>
                )}
                {quotation.roundOff !== 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Round Off</span><span>{quotation.roundOff > 0 ? "+" : ""}{formatINR(quotation.roundOff)}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Grand Total</span><span className="text-primary">{formatINR(quotation.grandTotal)}</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-emerald-400">{formatINR(totalPaid)}</span></div>
                <div className="flex justify-between font-medium">
                  <span>Balance</span>
                  <span className={balance > 0 ? "text-amber-400" : "text-emerald-400"}>{formatINR(balance)}</span>
                </div>
              </>
            )}
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
            {quotation.billDate && (
              <div className="flex justify-between"><span className="text-muted-foreground">Bill Date</span><span>{formatDate(quotation.billDate)}</span></div>
            )}
            {quotation.validUntil && (
              <div className="flex justify-between"><span className="text-muted-foreground">Valid Until</span><span>{formatDate(quotation.validUntil)}</span></div>
            )}
            {quotation.completionDate && (
              <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span>{formatDate(quotation.completionDate)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{quotation.items.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payments</span><span>{quotation.payments.length}</span></div>
            {!quotation.includeGst && (
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>Not Applicable</span></div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items - Edit or Read-only */}
      {editing ? (
        <Card className="overflow-visible">
          <CardContent className="pt-6">
            <LineItemEditor lineItems={editItems} setLineItems={setEditItems} allItems={allCatalogItems} divisions={divisions} />
          </CardContent>
        </Card>
      ) : (
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
                    <th className="text-left py-2 pr-4">HSN</th>
                    <th className="text-right py-2 pr-4">Qty</th>
                    <th className="text-right py-2 pr-4">Unit Price</th>
                    <th className="text-right py-2 pr-4">Disc %</th>
                    <th className="text-right py-2 pr-4">Total</th>
                    <th className="text-right py-2 pr-4">GST</th>
                    <th className="text-right py-2">GST Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const divGroups = new Map<string, { name: string; order: number; items: typeof quotation.items }>();
                    for (const item of quotation.items) {
                      const divId = item.divisionId;
                      if (!divGroups.has(divId)) divGroups.set(divId, { name: item.division.name, order: item.division.order, items: [] });
                      divGroups.get(divId)!.items.push(item);
                    }
                    const activeDivs = Array.from(divGroups.entries()).sort((a, b) => a[1].order - b[1].order);
                    let serial = 0;

                    return activeDivs.flatMap(([divId, group]) => {
                      const items = group.items;
                      const rows = [];
                      if (activeDivs.length > 1) {
                        rows.push(
                          <tr key={`div-${divId}`} className="bg-primary/10">
                            <td colSpan={9} className="py-2 px-4 font-semibold text-primary">
                              {group.name}
                            </td>
                          </tr>
                        );
                      }
                      for (const item of items) {
                        serial++;
                        rows.push(
                          <tr key={item.id} className="border-b border-border/50">
                            <td className="py-2.5 pr-4 text-muted-foreground">{serial}</td>
                            <td className="py-2.5 pr-4">
                              <p className="font-medium">{item.name}</p>
                              {item.item && (
                                <p className="text-xs text-muted-foreground">{item.item.code} &bull; {item.item.category?.name}</p>
                              )}
                              {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground">{item.hsnCode || "—"}</td>
                            <td className="py-2.5 pr-4 text-right">{item.quantity}</td>
                            <td className="py-2.5 pr-4 text-right">{formatINR(item.unitPrice)}</td>
                            <td className="py-2.5 pr-4 text-right text-muted-foreground">{item.discount ? `${item.discount}%` : "—"}</td>
                            <td className="py-2.5 pr-4 text-right font-medium">{formatINR(item.total)}</td>
                            <td className="py-2.5 pr-4 text-right text-muted-foreground">{item.gstRate}%</td>
                            <td className="py-2.5 text-right font-medium">{formatINR(item.total * (1 + item.gstRate / 100))}</td>
                          </tr>
                        );
                      }
                      return rows;
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payments
            </CardTitle>
            <Dialog open={paymentOpen} onOpenChange={(open) => {
              setPaymentOpen(open);
              if (!open) { setEditingPayment(null); }
            }} disablePointerDismissal>
              <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => {
                setEditingPayment(null);
                setPayForm({ amount: "", date: new Date().toISOString().split("T")[0], mode: "BANK_TRANSFER", transactionId: "", notes: "" });
              }} />}>
                Record Payment
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPayment ? "Edit Payment" : "Record Payment"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (INR) *</Label>
                      <Input type="number" value={editingPayment ? editPayForm.amount : payForm.amount} onChange={(e) => editingPayment ? setEditPayForm({ ...editPayForm, amount: e.target.value }) : setPayForm({ ...payForm, amount: e.target.value })} placeholder={balance.toString()} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date *</Label>
                      <Input type="date" value={editingPayment ? editPayForm.date : payForm.date} onChange={(e) => editingPayment ? setEditPayForm({ ...editPayForm, date: e.target.value }) : setPayForm({ ...payForm, date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode *</Label>
                    <Select value={editingPayment ? editPayForm.mode : payForm.mode} onValueChange={(v: string | null) => editingPayment ? setEditPayForm({ ...editPayForm, mode: v || "BANK_TRANSFER" }) : setPayForm({ ...payForm, mode: v || "BANK_TRANSFER" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH" label="Cash">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER" label="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="UPI" label="UPI">UPI</SelectItem>
                        <SelectItem value="CARD" label="Card">Card</SelectItem>
                        <SelectItem value="CHEQUE" label="Cheque">Cheque</SelectItem>
                        <SelectItem value="OTHER" label="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input value={editingPayment ? editPayForm.transactionId : payForm.transactionId} onChange={(e) => editingPayment ? setEditPayForm({ ...editPayForm, transactionId: e.target.value }) : setPayForm({ ...payForm, transactionId: e.target.value })} placeholder="Reference number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={editingPayment ? editPayForm.notes : payForm.notes} onChange={(e) => editingPayment ? setEditPayForm({ ...editPayForm, notes: e.target.value }) : setPayForm({ ...payForm, notes: e.target.value })} rows={2} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
                    <Button onClick={editingPayment ? updatePayment : addPayment} disabled={saving}>
                      {saving ? (editingPayment ? "Updating..." : "Recording...") : (editingPayment ? "Update Payment" : "Record Payment")}
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
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group">
                    <div>
                      <p className="text-sm font-medium">{formatINR(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.date)} &bull; {p.mode.replace("_", " ")} &bull; by {p.recordedBy.name}
                      </p>
                      {p.transactionId && <p className="text-xs text-muted-foreground">Ref: {p.transactionId}</p>}
                      {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => startEditPayment(p)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive" onClick={() => deletePayment(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
            <Dialog open={noteOpen} onOpenChange={(open) => {
              setNoteOpen(open);
              if (!open) { setEditingNote(null); setEditNoteContent(""); }
            }} disablePointerDismissal>
              <DialogTrigger render={<Button variant="outline" size="sm" onClick={() => {
                setEditingNote(null);
                setNoteContent("");
              }} />}>
                Add Note
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingNote ? "Edit Note" : "Add Project Note"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <Textarea
                    value={editingNote ? editNoteContent : noteContent}
                    onChange={(e) => editingNote ? setEditNoteContent(e.target.value) : setNoteContent(e.target.value)}
                    placeholder="Add progress update, notes, or observations..."
                    rows={4}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
                    <Button onClick={editingNote ? updateNote : addNote} disabled={saving}>
                      {saving ? (editingNote ? "Updating..." : "Adding...") : (editingNote ? "Update Note" : "Add Note")}
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
                  <div key={note.id} className="p-3 rounded-lg bg-muted/30 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1">{note.content}</p>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditNote(note)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteNote(note.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
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
