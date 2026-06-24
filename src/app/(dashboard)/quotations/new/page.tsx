"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { LineItemEditor, emptyLineItem, nextLineItemKey, type LineItem, type CatalogItem } from "@/components/line-item-editor";
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
  const [allItems, setAllItems] = useState<CatalogItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quotationNumber, setQuotationNumber] = useState("");
  const [quotationTitle, setQuotationTitle] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [discount, setDiscount] = useState("0");
  const [includeGst, setIncludeGst] = useState(true);
  const [enableRoundOff, setEnableRoundOff] = useState(false);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("1. Prices are valid for 30 days from the date of quotation.\n2. 50% advance payment required to confirm the order.\n3. Balance payment due before installation.\n4. Installation timeline: 4-6 weeks from order confirmation.\n5. 1-year warranty on all equipment and installation.");

  const [newCustomer, setNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMobile, setNewCustMobile] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  const loadData = useCallback(async () => {
    const [iRes, tRes, cRes] = await Promise.all([
      fetch("/api/items?all=true"),
      fetch("/api/templates"),
      fetch("/api/customers?limit=500"),
    ]);
    setAllItems(await iRes.json());
    setTemplates(await tRes.json());
    const cData = await cRes.json();
    setCustomers(cData.customers || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    setQuotationNumber(generateQuotationNumber());
  }, [loadData]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (!templateId) {
      setLineItems([emptyLineItem()]);
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
        }))
      );
    }
  };

  const disc = parseFloat(discount) || 0;
  const validItems = lineItems.filter((li) => li.name && li.unitPrice > 0);
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

    let custId = customerId;

    if (newCustomer) {
      if (!newCustName || !newCustMobile) {
        toast.error("Customer name and mobile are required");
        return;
      }
      setSaving(true);
      const custRes = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustName, mobile: newCustMobile, email: newCustEmail }),
      });
      if (!custRes.ok) {
        toast.error("Failed to create customer");
        setSaving(false);
        return;
      }
      const cust = await custRes.json();
      custId = cust.id;
    }

    if (!custId) {
      toast.error("Select or create a customer");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: custId,
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

  const filteredCustomers = customers.filter((c) =>
    customerSearch.length >= 2 &&
    (c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
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
            <CardTitle className="text-base">Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!newCustomer ? (
              <div className="space-y-2">
                <Label>Search Customer *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Type name or mobile (2+ chars)..."
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 border rounded-lg bg-popover shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex justify-between"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerSearch(c.name);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground">{c.mobile}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {customerId && (
                  <p className="text-xs text-emerald-400">Customer selected: {customers.find((c) => c.id === customerId)?.name}</p>
                )}
                <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setNewCustomer(true)}>
                  + Add new customer
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">New Customer</Label>
                  <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setNewCustomer(false)}>
                    Search existing
                  </Button>
                </div>
                <Input placeholder="Full Name *" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Mobile *" value={newCustMobile} onChange={(e) => setNewCustMobile(e.target.value)} />
                  <Input placeholder="Email" type="email" value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} />
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
          <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} allItems={allItems} />
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex-1">Discount</span>
              <Input
                type="number"
                className="w-32 h-8 text-right"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
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
