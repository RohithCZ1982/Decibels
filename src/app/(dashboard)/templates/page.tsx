"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Layers, Edit2, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";

interface Item {
  id: string;
  code: string;
  name: string;
  unitPrice: number;
  category: { name: string };
}

interface TemplateItem {
  id: string;
  quantity: number;
  item: Item;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  items: TemplateItem[];
  _count?: { quotations: number };
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateItems, setTemplateItems] = useState<{ itemId: string; quantity: number; item: Item }[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, iRes] = await Promise.all([
      fetch("/api/templates"),
      fetch("/api/items?all=true"),
    ]);
    setTemplates(await tRes.json());
    setAllItems(await iRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setTemplateItems([]);
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setDescription(t.description || "");
    setTemplateItems(t.items.map((ti) => ({ itemId: ti.item.id, quantity: ti.quantity, item: ti.item })));
    setDialogOpen(true);
  };

  const addItem = (item: Item) => {
    if (templateItems.find((ti) => ti.itemId === item.id)) {
      toast.error("Item already added");
      return;
    }
    setTemplateItems([...templateItems, { itemId: item.id, quantity: 1, item }]);
    setItemSearch("");
  };

  const removeItem = (idx: number) => {
    setTemplateItems(templateItems.filter((_, i) => i !== idx));
  };

  const updateQuantity = (idx: number, qty: number) => {
    const updated = [...templateItems];
    updated[idx].quantity = Math.max(1, qty);
    setTemplateItems(updated);
  };

  const handleSave = async () => {
    if (!name) { toast.error("Name is required"); return; }
    setSaving(true);

    const payload = {
      name,
      description,
      items: templateItems.map((ti) => ({ itemId: ti.itemId, quantity: ti.quantity })),
    };

    const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editing ? "Template updated" : "Template created");
      setDialogOpen(false);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    const res = await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template removed");
      load();
    }
  };

  const filteredItems = allItems.filter(
    (item) =>
      itemSearch.length >= 2 &&
      (item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(itemSearch.toLowerCase()))
  );

  const templateTotal = templateItems.reduce((sum, ti) => sum + ti.item.unitPrice * ti.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Reusable configurations for common setups</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen} disablePointerDismissal>
          <DialogTrigger>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Template" : "Create Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium 7.2.4 Dolby Atmos Setup" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this template..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Items</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Search items to add (type 2+ chars)..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                </div>
                {filteredItems.length > 0 && (
                  <div className="border rounded-lg max-h-40 overflow-y-auto bg-popover">
                    {filteredItems.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                        onClick={() => addItem(item)}
                      >
                        <span>{item.name} <span className="text-muted-foreground">({item.code})</span></span>
                        <span className="text-primary">{formatINR(item.unitPrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {templateItems.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {templateItems.map((ti, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ti.item.name}</p>
                        <p className="text-xs text-muted-foreground">{ti.item.category.name} &bull; {formatINR(ti.item.unitPrice)}</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        className="w-20 h-8 text-center"
                        value={ti.quantity}
                        onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                      />
                      <span className="text-sm font-medium w-24 text-right">{formatINR(ti.item.unitPrice * ti.quantity)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
                    <p className="text-sm font-medium">Template Total</p>
                    <p className="text-base font-bold text-primary">{formatINR(templateTotal)}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No templates yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {templates.map((t) => {
            const total = t.items.reduce((s, ti) => s + ti.item.unitPrice * ti.quantity, 0);
            return (
              <Card key={t.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{t.name}</h3>
                      {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(t)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {t.items.slice(0, 5).map((ti) => (
                      <div key={ti.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{ti.item.name} x{ti.quantity}</span>
                        <span className="text-xs">{formatINR(ti.item.unitPrice * ti.quantity)}</span>
                      </div>
                    ))}
                    {t.items.length > 5 && (
                      <p className="text-xs text-muted-foreground">+{t.items.length - 5} more items</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{t.items.length} items</Badge>
                      {t._count && t._count.quotations > 0 && (
                        <Badge variant="outline" className="text-xs">{t._count.quotations} quotations</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-primary">{formatINR(total)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
