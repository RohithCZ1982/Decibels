"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Search, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  code: string;
  name: string;
  hsnCode: string | null;
  gstRate: number;
  unitPrice: number;
  category: { name: string };
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
}

interface Template {
  id: string;
  name: string;
  items: { quantity: number; item: Item }[];
}

interface LineItem {
  key: string;
  name: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  itemId: string | null;
  notes: string;
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

let keyCounter = 0;
function nextKey() {
  return `li-${++keyCounter}`;
}

function emptyLineItem(): LineItem {
  return { key: nextKey(), name: "", hsnCode: "", quantity: 1, unitPrice: 0, gstRate: 18, itemId: null, notes: "" };
}

export default function NewQuotationPage() {
  const router = useRouter();
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quotationTitle, setQuotationTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("1. Prices are valid for 30 days from the date of quotation.\n2. 50% advance payment required to confirm the order.\n3. Balance payment due before installation.\n4. Installation timeline: 4-6 weeks from order confirmation.\n5. 1-year warranty on all equipment and installation.");

  const [newCustomer, setNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMobile, setNewCustMobile] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  const [activeAutocomplete, setActiveAutocomplete] = useState<number | null>(null);
  const [itemSearchValues, setItemSearchValues] = useState<Record<number, string>>({});

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

  useEffect(() => { loadData(); }, [loadData]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "none") {
      setLineItems([emptyLineItem()]);
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setLineItems(
        template.items.map((ti) => ({
          key: nextKey(),
          name: ti.item.name,
          hsnCode: ti.item.hsnCode || "",
          quantity: ti.quantity,
          unitPrice: ti.item.unitPrice,
          gstRate: ti.item.gstRate,
          itemId: ti.item.id,
          notes: "",
        }))
      );
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, emptyLineItem()]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number | null) => {
    const updated = [...lineItems];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[idx] as any)[field] = value;
    setLineItems(updated);
  };

  const selectItemForLine = (idx: number, item: Item) => {
    const updated = [...lineItems];
    updated[idx] = {
      ...updated[idx],
      name: item.name,
      hsnCode: item.hsnCode || "",
      unitPrice: item.unitPrice,
      gstRate: item.gstRate,
      itemId: item.id,
    };
    setLineItems(updated);
    setActiveAutocomplete(null);
    setItemSearchValues({});
  };

  const getFilteredItems = (searchVal: string) => {
    if (searchVal.length < 3) return [];
    const lower = searchVal.toLowerCase();
    return allItems.filter(
      (item) => item.name.toLowerCase().includes(lower) || item.code.toLowerCase().includes(lower)
    ).slice(0, 8);
  };

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const disc = parseFloat(discount) || 0;

  // Compute GST breakdown by rate
  const gstBreakdown: { rate: number; taxable: number; gst: number }[] = [];
  const rateMap = new Map<number, number>();
  for (const li of lineItems) {
    if (li.unitPrice <= 0) continue;
    const lineTotal = li.quantity * li.unitPrice;
    rateMap.set(li.gstRate, (rateMap.get(li.gstRate) || 0) + lineTotal);
  }
  const discountRatio = subtotal > 0 ? (subtotal - disc) / subtotal : 1;
  for (const [rate, total] of rateMap) {
    const taxable = total * discountRatio;
    gstBreakdown.push({ rate, taxable, gst: (taxable * rate) / 100 });
  }
  gstBreakdown.sort((a, b) => a.rate - b.rate);
  const totalGst = gstBreakdown.reduce((s, g) => s + g.gst, 0);
  const grandTotal = subtotal - disc + totalGst;

  const handleSubmit = async () => {
    const validItems = lineItems.filter((li) => li.name && li.unitPrice > 0);
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
        items: validItems.map((li) => ({
          name: li.name,
          hsnCode: li.hsnCode || null,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          gstRate: li.gstRate,
          itemId: li.itemId,
          notes: li.notes,
        })),
        gstPercent: 0,
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
          <CardTitle className="text-base">Quotation Name</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={quotationTitle}
            onChange={(e) => setQuotationTitle(e.target.value)}
            placeholder="e.g. 7.1.2 Baffle Screen Home Theater Platinum"
          />
          <p className="text-xs text-muted-foreground mt-1.5">This name appears on the PDF title bar</p>
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
            <Select value={selectedTemplate} onValueChange={(v: string | null) => handleTemplateChange(v || "none")}>
              <SelectTrigger><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none" label="No template">No template</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id} label={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-visible">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_70px_110px_70px_110px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Item Name</span>
              <span>Qty</span>
              <span>Unit Price</span>
              <span>GST %</span>
              <span>Total</span>
              <span></span>
            </div>
            {lineItems.map((li, idx) => (
              <div key={li.key} className="space-y-1">
                <div className="grid grid-cols-[1fr_70px_110px_70px_110px_40px] gap-2 items-start">
                  <div className="relative">
                    <Input
                      placeholder="Type 3+ chars to search..."
                      value={activeAutocomplete === idx ? (itemSearchValues[idx] ?? li.name) : li.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemSearchValues({ ...itemSearchValues, [idx]: val });
                        setActiveAutocomplete(idx);
                        updateLineItem(idx, "name", val);
                        updateLineItem(idx, "itemId", null);
                        updateLineItem(idx, "hsnCode", "");
                      }}
                      onFocus={() => setActiveAutocomplete(idx)}
                      onBlur={() => setTimeout(() => setActiveAutocomplete(null), 200)}
                    />
                    {activeAutocomplete === idx && getFilteredItems(itemSearchValues[idx] ?? li.name).length > 0 && (
                      <div className="absolute z-50 w-full mt-1 border rounded-lg bg-popover shadow-xl max-h-60 overflow-y-auto">
                        {getFilteredItems(itemSearchValues[idx] ?? li.name).map((item) => (
                          <button
                            key={item.id}
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent border-b border-border/30 last:border-0"
                            onMouseDown={(e) => { e.preventDefault(); selectItemForLine(idx, item); }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-muted-foreground ml-1.5">({item.code})</span>
                              </div>
                              <span className="text-primary font-medium ml-2 shrink-0">{formatINR(item.unitPrice)}</span>
                            </div>
                            <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                              {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                              <span>GST: {item.gstRate}%</span>
                              <span>{item.category.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={li.quantity}
                    onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                  <Input
                    type="number"
                    value={li.unitPrice}
                    onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    value={li.gstRate}
                    onChange={(e) => updateLineItem(idx, "gstRate", parseFloat(e.target.value) || 0)}
                    className="text-center"
                  />
                  <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md text-sm font-medium">
                    {formatINR(li.quantity * li.unitPrice)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:text-destructive"
                    onClick={() => removeLineItem(idx)}
                    disabled={lineItems.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {li.hsnCode && (
                  <p className="text-[10px] text-muted-foreground pl-1">HSN: {li.hsnCode}</p>
                )}
              </div>
            ))}
          </div>
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
              <span className="font-medium">{formatINR(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex-1">Discount</span>
              <Input
                type="number"
                className="w-32 h-8 text-right"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            {gstBreakdown.map((g) => (
              <div key={g.rate} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GST @{g.rate}%</span>
                <span>{formatINR(g.gst)}</span>
              </div>
            ))}
            {gstBreakdown.length > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total GST</span>
                <span className="font-medium">{formatINR(totalGst)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="font-semibold text-lg">Grand Total</span>
              <span className="font-bold text-2xl text-primary">{formatINR(grandTotal)}</span>
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
