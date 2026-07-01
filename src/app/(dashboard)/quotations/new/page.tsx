"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { LineItemEditor, emptyLineItem, nextLineItemKey, type LineItem, type CatalogItem, type DivisionOption } from "@/components/line-item-editor";
import { calculateQuotationTotals, generateQuotationNumber } from "@/lib/quotation-calc";

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
}

interface Template {
  id: string;
  name: string;
  items: { quantity: number; item: CatalogItem }[];
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dealers, setDealers] = useState<Customer[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationTitle, setQuotationTitle] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [buyerType, setBuyerType] = useState<"CUSTOMER" | "DEALER">(
    searchParams.get("buyerType") === "DEALER" ? "DEALER" : "CUSTOMER"
  );
  const [memberId, setMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [includeGst, setIncludeGst] = useState(true);
  const [enableRoundOff, setEnableRoundOff] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("1. Prices are valid for 30 days from the date of quotation.\n2. 50% advance payment required to confirm the order.\n3. Balance payment due before installation.\n4. Installation timeline: 4-6 weeks from order confirmation.\n5. 1-year warranty on all equipment and installation.");

  const [newMember, setNewMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberMobile, setNewMemberMobile] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const buyerLabel = buyerType === "CUSTOMER" ? "Customer" : "Dealer";
  const members = buyerType === "CUSTOMER" ? customers : dealers;

  const switchBuyerType = (type: "CUSTOMER" | "DEALER") => {
    setBuyerType(type);
    setMemberId("");
    setMemberSearch("");
    setShowMemberDropdown(false);
    setNewMember(false);
    setNewMemberName("");
    setNewMemberMobile("");
    setNewMemberEmail("");
  };

  const loadData = useCallback(async () => {
    const [iRes, tRes, cRes, dlRes, dRes] = await Promise.all([
      fetch("/api/items?all=true"),
      fetch("/api/templates"),
      fetch("/api/customers?limit=500"),
      fetch("/api/dealers?limit=500"),
      fetch("/api/divisions"),
    ]);
    setAllItems(await iRes.json());
    setTemplates(await tRes.json());
    const cData = await cRes.json();
    setCustomers(cData.customers || []);
    const dlData = await dlRes.json();
    setDealers(dlData.dealers || []);
    const divs: DivisionOption[] = await dRes.json();
    setDivisions(divs);
    if (divs.length > 0) {
      setLineItems((prev) => prev.length === 0 ? [emptyLineItem(divs[0].id)] : prev);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    setQuotationNumber(generateQuotationNumber());
  }, [loadData]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) {
      setLineItems([emptyLineItem(divisions[0]?.id || "")]);
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setLineItems(
        template.items.map((ti) => ({
          key: nextLineItemKey(),
          name: ti.item.name,
          description: ti.item.description || "",
          hsnCode: ti.item.hsnCode || "",
          quantity: ti.quantity,
          unit: ti.item.unit || "No",
          unitPrice: ti.item.unitPrice,
          discount: 0,
          gstRate: ti.item.gstRate,
          itemId: ti.item.id,
          notes: "",
          divisionId: ti.item.divisionId || ti.item.division?.id || divisions[0]?.id || "",
        }))
      );
    }
  };

  const validItems = lineItems.filter((li) => li.name && li.unitPrice > 0);
  const disc = validItems.reduce((sum, li) => sum + li.quantity * li.unitPrice * ((li.discount || 0) / 100), 0);
  const calc = calculateQuotationTotals({
    items: validItems,
    discount: disc,
    includeGst,
    roundOff: enableRoundOff,
  });

  const handleSubmit = async () => {
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    let buyerId = memberId;
    const buyerApiBase = buyerType === "CUSTOMER" ? "/api/customers" : "/api/dealers";

    if (newMember) {
      if (!newMemberName || !newMemberMobile) {
        toast.error(`${buyerLabel} name and mobile are required`);
        return;
      }
      const mobileDigits = newMemberMobile.replace(/\D/g, "");
      const mobileLocal = mobileDigits.length === 12 && mobileDigits.startsWith("91") ? mobileDigits.slice(2) : mobileDigits;
      if (!/^[6-9]\d{9}$/.test(mobileLocal)) {
        toast.error("Enter a valid 10-digit mobile number");
        return;
      }
      if (newMemberEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newMemberEmail)) {
        toast.error("Enter a valid email address");
        return;
      }
      setSaving(true);
      const memberRes = await fetch(buyerApiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMemberName, mobile: newMemberMobile, email: newMemberEmail }),
      });
      if (!memberRes.ok) {
        const memberErr = await memberRes.json().catch(() => null);
        toast.error(memberErr?.error || `Failed to create ${buyerLabel.toLowerCase()}`);
        setSaving(false);
        return;
      }
      const member = await memberRes.json();
      buyerId = member.id;
    }

    if (!buyerId) {
      toast.error(`Select or create a ${buyerLabel.toLowerCase()}`);
      return;
    }

    setSaving(true);

    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: buyerId,
        templateId: selectedTemplate && selectedTemplate !== "none" ? selectedTemplate : null,
        title: quotationTitle || null,
        quotationNumber: quotationNumber.trim() || null,
        billDate,
        includeGst,
        enableRoundOff,
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
        discount: disc,
        notes,
        terms,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success(`Quotation ${data.quotationNumber} created!`);
      router.push(`/quotations/${data.id}`);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create quotation");
    }
    setSaving(false);
  };

  const filteredMembers = members.filter((m) =>
    memberSearch.length >= 2 &&
    (m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.mobile.includes(memberSearch))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Quotation</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a new project quotation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quotation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quotation Number</Label>
              <Input
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                placeholder="Auto-generated"
              />
              <p className="text-xs text-muted-foreground">Auto-generated. Override only if needed.</p>
            </div>
            <div className="space-y-2">
              <Label>Quotation Name</Label>
              <Input
                value={quotationTitle}
                onChange={(e) => setQuotationTitle(e.target.value)}
                placeholder="e.g. 7.1.2 Baffle Screen Home Theater Platinum"
              />
              <p className="text-xs text-muted-foreground">Appears on the PDF title bar</p>
            </div>
            <div className="space-y-2">
              <Label>Bill Date</Label>
              <Input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Buyer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={buyerType} onValueChange={(v: string | null) => switchBuyerType((v as "CUSTOMER" | "DEALER") || "CUSTOMER")}>
              <TabsList className="grid grid-cols-2 w-[240px]">
                <TabsTrigger value="CUSTOMER" className="w-full">Customer</TabsTrigger>
                <TabsTrigger value="DEALER" className="w-full">Dealer</TabsTrigger>
              </TabsList>
            </Tabs>
            {!newMember ? (
              <div className="space-y-2">
                <Label>Search {buyerLabel} *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Type name or mobile (2+ chars)..."
                    value={memberSearch}
                    onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                    onFocus={() => setShowMemberDropdown(true)}
                  />
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 border rounded-lg bg-popover shadow-lg max-h-48 overflow-y-auto">
                      {filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex justify-between"
                          onClick={() => {
                            setMemberId(m.id);
                            setMemberSearch(m.name);
                            setShowMemberDropdown(false);
                          }}
                        >
                          <span className="font-medium">{m.name}</span>
                          <span className="text-muted-foreground">{m.mobile}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {memberId && (
                  <p className="text-xs text-emerald-400">{buyerLabel} selected: {members.find((m) => m.id === memberId)?.name}</p>
                )}
                <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setNewMember(true)}>
                  + Add new {buyerLabel.toLowerCase()}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">New {buyerLabel}</Label>
                  <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setNewMember(false)}>
                    Search existing
                  </Button>
                </div>
                <Input placeholder="Full Name *" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Mobile *" value={newMemberMobile} onChange={(e) => setNewMemberMobile(e.target.value)} />
                  <Input placeholder="Email" type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplate} defaultValue="" onValueChange={(v: string | null) => handleTemplateChange(v || "")}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id} label={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-visible">
        <CardContent className="pt-6">
          <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} allItems={allItems} divisions={divisions} />
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Notes (visible on quotation)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions or notes..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={5} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatINR(calc.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="include-gst" className="text-sm text-muted-foreground cursor-pointer">Include GST</Label>
              <Switch id="include-gst" checked={includeGst} onCheckedChange={setIncludeGst} />
            </div>
            {includeGst && calc.gstBreakdown.map((g) => (
              <div key={g.rate} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GST @{g.rate}%</span>
                <span>{formatINR(g.gst)}</span>
              </div>
            ))}
            {includeGst && calc.gstBreakdown.length > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total GST</span>
                <span className="font-medium">{formatINR(calc.gstAmount)}</span>
              </div>
            )}
            {!includeGst && (
              <div className="text-sm text-muted-foreground">GST: Not Applicable</div>
            )}
            {disc > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatINR(disc)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="round-off" className="text-sm text-muted-foreground cursor-pointer">Round to nearest ₹100</Label>
              <Switch id="round-off" checked={enableRoundOff} onCheckedChange={setEnableRoundOff} />
            </div>
            {enableRoundOff && calc.roundOff !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Round Off</span>
                <span>{calc.roundOff > 0 ? "+" : ""}{formatINR(calc.roundOff)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-semibold text-lg">Grand Total</span>
              <span className="font-bold text-2xl text-primary">{formatINR(calc.grandTotal)}</span>
            </div>
            <Button className="w-full mt-4" size="lg" onClick={handleSubmit} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Creating..." : "Create Quotation"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
