"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit2, Trash2, Package, PackagePlus, History } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface SubCategory {
  id: string;
  name: string;
  hsnCode: string | null;
  categoryId: string;
}

interface DivisionInfo {
  id: string;
  name: string;
  slug: string;
  order: number;
}

interface Category {
  id: string;
  name: string;
  hsnCode: string | null;
  divisionId: string;
  division: DivisionInfo;
  _count?: { items: number };
  subCategories?: SubCategory[];
}

interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  hsnCode: string | null;
  brand: string | null;
  unit: string;
  gstRate: number;
  taxType: string;
  unitPrice: number;
  purchasePrice: number | null;
  purchasePriceInclTax: number | null;
  profitMargin: number | null;
  manageStock: boolean;
  alertQuantity: number;
  stock: number | null;
  supplier: string | null;
  imageUrl: string | null;
  active: boolean;
  divisionId: string;
  division: DivisionInfo;
  category: Category;
  categoryId: string;
  subCategory: SubCategory | null;
  subCategoryId: string | null;
}

interface StockTransaction {
  id: string;
  type: string;
  quantity: number;
  notes: string | null;
  createdAt: string;
  createdBy: { name: string };
  quotation: { quotationNumber: string } | null;
}

const STOCK_TYPE_LABELS: Record<string, string> = {
  PURCHASE_IN: "Purchase In",
  SALE_OUT: "Sale Out",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
  INITIAL: "Initial Stock",
};

const emptyForm = {
  code: "",
  name: "",
  brand: "",
  unit: "Pc(s)",
  unitPrice: "",
  purchasePrice: "",
  purchasePriceInclTax: "",
  profitMargin: "",
  hsnCode: "",
  gstRate: "18",
  taxType: "exclusive",
  description: "",
  supplier: "",
  stock: "",
  manageStock: false,
  alertQuantity: "0",
  imageUrl: "",
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [divisions, setDivisions] = useState<DivisionInfo[]>([]);
  const [search, setSearch] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("pending");
  const [selectedCategory, setSelectedCategory] = useState<string>("pending");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newCategoryHsn, setNewCategoryHsn] = useState("");
  const [newSubCategoryHsn, setNewSubCategoryHsn] = useState("");
  const [showNewSubCategory, setShowNewSubCategory] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  // Stock dialogs
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockItem, setStockItem] = useState<Item | null>(null);
  const [stockType, setStockType] = useState("PURCHASE_IN");
  const [stockQty, setStockQty] = useState("");
  const [stockNotes, setStockNotes] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);
  const [stockHistory, setStockHistory] = useState<StockTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Context section state (persistent division/category/subcategory)
  const [ctxDivision, setCtxDivision] = useState<string>("");
  const [ctxCategoryId, setCtxCategoryId] = useState<string>("");
  const [ctxSubCategoryId, setCtxSubCategoryId] = useState<string>("");

  const { user } = useAuth();

  const brands = useMemo(
    () => Array.from(new Set(items.map((i) => i.brand).filter(Boolean))) as string[],
    [items]
  );

  const filterCategories = useMemo(
    () => (selectedDivision === "all" ? categories : categories.filter((c) => c.divisionId === selectedDivision)),
    [categories, selectedDivision]
  );
  const filterSubCategories = useMemo(
    () => categories.find((c) => c.id === selectedCategory)?.subCategories || [],
    [categories, selectedCategory]
  );

  const ctxCategories = useMemo(
    () => categories.filter((c) => c.divisionId === ctxDivision),
    [categories, ctxDivision]
  );
  const ctxSubCategories = useMemo(
    () => categories.find((c) => c.id === ctxCategoryId)?.subCategories || [],
    [categories, ctxCategoryId]
  );

  const buildItemsParams = useCallback((pageNum: number) => {
    const params = new URLSearchParams({ search, limit: "100", page: String(pageNum) });
    if (selectedDivision && selectedDivision !== "all" && selectedDivision !== "pending") params.set("divisionId", selectedDivision);
    if (selectedCategory && selectedCategory !== "all" && selectedCategory !== "pending") params.set("categoryId", selectedCategory);
    if (selectedSubCategory && selectedSubCategory !== "all") params.set("subCategoryId", selectedSubCategory);
    return params;
  }, [search, selectedDivision, selectedCategory, selectedSubCategory]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = buildItemsParams(1);

    const [itemsRes, catsRes, divsRes] = await Promise.all([
      fetch(`/api/items?${params}`),
      fetch("/api/categories"),
      fetch("/api/divisions"),
    ]);
    const itemsData = await itemsRes.json();
    const catsData: Category[] = await catsRes.json();
    const divsData: DivisionInfo[] = await divsRes.json();

    setCategories(catsData);
    setDivisions(divsData);

    if (selectedDivision === "pending" && divsData.length > 0) {
      setSelectedDivision(divsData[0].id);
      setCtxDivision(divsData[0].id);
      setLoading(false);
      return;
    }

    if (selectedCategory === "pending") {
      const divCats = catsData.filter((c) => c.divisionId === selectedDivision);
      if (divCats.length > 0) {
        setSelectedCategory(divCats[0].id);
        setLoading(false);
        return;
      }
    }

    setItems(itemsData.items || []);
    setTotalItems(itemsData.total || 0);
    setPage(1);
    setLoading(false);
  }, [buildItemsParams, selectedDivision, selectedCategory]);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = buildItemsParams(nextPage);
    const res = await fetch(`/api/items?${params}`);
    const data = await res.json();
    setItems((prev) => [...prev, ...(data.items || [])]);
    setTotalItems(data.total || 0);
    setPage(nextPage);
    setLoadingMore(false);
  }, [buildItemsParams, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNew = async () => {
    setEditingItem(null);
    const cat = categories.find((c) => c.id === ctxCategoryId);
    const sub = ctxSubCategoryId ? ctxSubCategories.find((s) => s.id === ctxSubCategoryId) : null;
    setForm({ ...emptyForm, hsnCode: sub?.hsnCode || cat?.hsnCode || "" });
    setShowNewCategory(false);
    setShowNewSubCategory(false);
    setDialogOpen(true);
    try {
      const res = await fetch("/api/items/next-code");
      if (res.ok) {
        const { code } = await res.json();
        setForm((prev) => ({ ...prev, code }));
      }
    } catch {}
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setCtxDivision(item.divisionId);
    setCtxCategoryId(item.categoryId);
    setCtxSubCategoryId(item.subCategoryId || "");
    setForm({
      code: item.code,
      name: item.name,
      brand: item.brand || "",
      unit: item.unit || "Pc(s)",
      unitPrice: item.unitPrice.toString(),
      purchasePrice: item.purchasePrice?.toString() || "",
      purchasePriceInclTax: item.purchasePriceInclTax?.toString() || "",
      profitMargin: item.profitMargin?.toString() || "",
      hsnCode: item.hsnCode || "",
      gstRate: item.gstRate.toString(),
      taxType: item.taxType || "exclusive",
      description: item.description || "",
      supplier: item.supplier || "",
      stock: item.stock?.toString() || "",
      manageStock: item.manageStock,
      alertQuantity: item.alertQuantity.toString(),
      imageUrl: item.imageUrl || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !ctxCategoryId || !form.unitPrice) {
      toast.error("Code, name, category, and selling price are required");
      return;
    }
    setSaving(true);

    const payload = {
      ...form,
      divisionId: ctxDivision,
      categoryId: ctxCategoryId,
      subCategoryId: ctxSubCategoryId || null,
    };
    const url = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
    const method = editingItem ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingItem ? "Item updated" : "Item created");
      setDialogOpen(false);
      loadData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save item");
    }
    setSaving(false);
  };

  const handleSaveAndAddAnother = async () => {
    if (!form.code || !form.name || !ctxCategoryId || !form.unitPrice) {
      toast.error("Code, name, category, and selling price are required");
      return;
    }
    setSaving(true);

    const payload = {
      ...form,
      divisionId: ctxDivision,
      categoryId: ctxCategoryId,
      subCategoryId: ctxSubCategoryId || null,
    };

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success("Item created — add another");
      const cat = categories.find((c) => c.id === ctxCategoryId);
      const sub = ctxSubCategoryId ? ctxSubCategories.find((s) => s.id === ctxSubCategoryId) : null;
      setForm({ ...emptyForm, hsnCode: sub?.hsnCode || cat?.hsnCode || "" });
      loadData();
      try {
        const codeRes = await fetch("/api/items/next-code");
        if (codeRes.ok) {
          const { code } = await codeRes.json();
          setForm((prev) => ({ ...prev, code }));
        }
      } catch {}
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save item");
    }
    setSaving(false);
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Item deactivated");
      loadData();
    }
  };

  const openStockDialog = (item: Item) => {
    setStockItem(item);
    setStockType("PURCHASE_IN");
    setStockQty("");
    setStockNotes("");
    setStockDialogOpen(true);
  };

  const handleStockAdjust = async () => {
    if (!stockItem || !stockQty || parseInt(stockQty) <= 0) {
      toast.error("Enter a positive quantity");
      return;
    }
    setStockSaving(true);
    const res = await fetch(`/api/items/${stockItem.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: stockType, quantity: parseInt(stockQty), notes: stockNotes || null }),
    });
    if (res.ok) {
      toast.success("Stock updated");
      setStockDialogOpen(false);
      loadData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update stock");
    }
    setStockSaving(false);
  };

  const openHistory = async (item: Item) => {
    setHistoryItem(item);
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    const res = await fetch(`/api/items/${item.id}/stock`);
    if (res.ok) {
      setStockHistory(await res.json());
    }
    setHistoryLoading(false);
  };

  const handleCreateCategory = async () => {
    if (!newCategory) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory, hsnCode: newCategoryHsn || null, divisionId: ctxDivision }),
    });
    if (res.ok) {
      const cat = await res.json();
      toast.success("Category created");
      setNewCategory("");
      setNewCategoryHsn("");
      setShowNewCategory(false);
      await loadData();
      setCtxCategoryId(cat.id);
    } else {
      toast.error("Failed to create category");
    }
  };

  const handleCreateSubCategory = async () => {
    if (!newSubCategory || !ctxCategoryId) return;
    const res = await fetch("/api/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubCategory, categoryId: ctxCategoryId, hsnCode: newSubCategoryHsn || categories.find((c) => c.id === ctxCategoryId)?.hsnCode || null }),
    });
    if (res.ok) {
      const sub = await res.json();
      toast.success("Sub-category created");
      setNewSubCategory("");
      setNewSubCategoryHsn("");
      setShowNewSubCategory(false);
      await loadData();
      setCtxSubCategoryId(sub.id);
    } else {
      toast.error("Failed to create sub-category");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Master Database</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalItems > 0 ? `${totalItems} products` : "Manage products, services, and equipment"}
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Item Details Dialog — context selectors at top, item fields below */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} disablePointerDismissal>
        <DialogContent className="!w-[95vw] !max-w-[95vw] md:!w-[75vw] md:!max-w-[75vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>

          {/* Division / Category / Sub-Category context */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 md:p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Division</Label>
                <Select labels={Object.fromEntries(divisions.map((d) => [d.id, d.name]))} value={ctxDivision || "none"} onValueChange={(v: string | null) => {
                  const val = v === "none" ? "" : (v || "");
                  setCtxDivision(val);
                  setCtxCategoryId("");
                  setCtxSubCategoryId("");
                  setShowNewCategory(false);
                  setShowNewSubCategory(false);
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="Select division">Select division</SelectItem>
                    {divisions.map((d) => <SelectItem key={d.id} value={d.id} label={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Category *</Label>
                <Select labels={Object.fromEntries(ctxCategories.map((c) => [c.id, c.name]))} value={ctxCategoryId || "none"} onValueChange={(v: string | null) => {
                  const val = v === "none" ? "" : (v || "");
                  setCtxCategoryId(val);
                  setCtxSubCategoryId("");
                  setShowNewCategory(val === "__new__");
                  setShowNewSubCategory(false);
                  if (val && val !== "__new__") {
                    const cat = categories.find((c) => c.id === val);
                    setForm((prev) => ({ ...prev, hsnCode: cat?.hsnCode || prev.hsnCode }));
                  }
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="Select category">Select category</SelectItem>
                    {ctxCategories.map((c) => <SelectItem key={c.id} value={c.id} label={c.name}>{c.name} ({c._count?.items || 0})</SelectItem>)}
                    <SelectItem value="__new__" label="+ New Category">+ New Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Sub-Category</Label>
                <Select labels={Object.fromEntries(ctxSubCategories.map((s) => [s.id, s.name]))} value={ctxSubCategoryId || "none"} onValueChange={(v: string | null) => {
                  const val = v === "none" ? "" : (v || "");
                  setCtxSubCategoryId(val);
                  if (val === "__new__") {
                    const cat = categories.find((c) => c.id === ctxCategoryId);
                    setNewSubCategoryHsn(cat?.hsnCode || "");
                  }
                  setShowNewSubCategory(val === "__new__");
                  if (val && val !== "__new__") {
                    const sub = ctxSubCategories.find((s) => s.id === val);
                    const cat = categories.find((c) => c.id === ctxCategoryId);
                    setForm((prev) => ({ ...prev, hsnCode: sub?.hsnCode || cat?.hsnCode || prev.hsnCode }));
                  }
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" label="None">None</SelectItem>
                    {ctxSubCategories.map((s) => <SelectItem key={s.id} value={s.id} label={s.name}>{s.name}</SelectItem>)}
                    <SelectItem value="__new__" label="+ New Sub-Category">+ New Sub-Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">New Category Name</Label>
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category name" />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">HSN</Label>
                  <Input value={newCategoryHsn} onChange={(e) => setNewCategoryHsn(e.target.value)} placeholder="HSN" />
                </div>
                <Button size="sm" onClick={handleCreateCategory} disabled={!newCategory}>Create</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNewCategory(false); setCtxCategoryId(""); }}>Cancel</Button>
              </div>
            )}
            {showNewSubCategory && (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">New Sub-Category Name</Label>
                  <Input value={newSubCategory} onChange={(e) => setNewSubCategory(e.target.value)} placeholder="Sub-category name" />
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">HSN</Label>
                  <Input value={newSubCategoryHsn} onChange={(e) => setNewSubCategoryHsn(e.target.value)} placeholder="HSN" />
                </div>
                <Button size="sm" onClick={handleCreateSubCategory} disabled={!newSubCategory}>Create</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNewSubCategory(false); setCtxSubCategoryId(""); }}>Cancel</Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            {/* Left Column — Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Info</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Item Code *</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder={editingItem ? "" : "Auto-generated..."} />
                </div>
                <div className="space-y-1">
                  <Label>Brand</Label>
                  <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. YAMAHA" list="brand-list" />
                  <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist>
                </div>
                <div className="space-y-1">
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v: string | null) => setForm({ ...form, unit: v || "Pc(s)" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pc(s)" label="Pc(s)">Pc(s)</SelectItem>
                      <SelectItem value="PAIR" label="PAIR">PAIR</SelectItem>
                      <SelectItem value="PKG" label="PKG">PKG</SelectItem>
                      <SelectItem value="Mtr" label="Mtr">Mtr</SelectItem>
                      <SelectItem value="Sq Ft" label="Sq Ft">Sq Ft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this product..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Supplier</Label>
                  <Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier name" />
                </div>
                <div className="space-y-1">
                  <Label>Image URL</Label>
                  <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </div>

            {/* Right Column — Pricing & Inventory */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pricing</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Selling Price (INR) *</Label>
                  <Input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="25000" />
                </div>
                <div className="space-y-1">
                  <Label>Purchase Price (Excl. Tax)</Label>
                  <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Purchase Price (Incl. Tax)</Label>
                  <Input type="number" value={form.purchasePriceInclTax} onChange={(e) => setForm({ ...form, purchasePriceInclTax: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label>Profit Margin %</Label>
                  <Input type="number" value={form.profitMargin} onChange={(e) => setForm({ ...form, profitMargin: e.target.value })} placeholder="5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>GST Rate</Label>
                  <Select value={form.gstRate} onValueChange={(v: string | null) => setForm({ ...form, gstRate: v || "18" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0" label="0%">0%</SelectItem>
                      <SelectItem value="5" label="5%">5%</SelectItem>
                      <SelectItem value="12" label="12%">12%</SelectItem>
                      <SelectItem value="18" label="18%">18%</SelectItem>
                      <SelectItem value="28" label="28%">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tax Type</Label>
                  <Select value={form.taxType} onValueChange={(v: string | null) => setForm({ ...form, taxType: v || "exclusive" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive" label="Exclusive">Exclusive</SelectItem>
                      <SelectItem value="inclusive" label="Inclusive">Inclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>HSN Code</Label>
                  <Input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} placeholder="e.g. 85184000" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Inventory</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Manage Stock</Label>
                  <Select value={form.manageStock ? "yes" : "no"} onValueChange={(v: string | null) => setForm({ ...form, manageStock: v === "yes" })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no" label="No">No</SelectItem>
                      <SelectItem value="yes" label="Yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Alert Qty</Label>
                  <Input type="number" value={form.alertQuantity} onChange={(e) => setForm({ ...form, alertQuantity: e.target.value })} placeholder="0" disabled={!form.manageStock} />
                </div>
                <div className="space-y-1">
                  <Label>Current Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingItem ? handleSave : handleSaveAndAddAnother} disabled={saving}>
              {saving ? "Saving..." : editingItem ? "Update" : "Save & Add Another"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Division Tabs */}
      <Tabs
        value={selectedDivision === "pending" ? divisions[0]?.id || "all" : selectedDivision}
        onValueChange={(v: string | null) => {
          const div = v || "all";
          setSelectedDivision(div);
          const divCats = categories.filter((c) => div === "all" || c.divisionId === div);
          setSelectedCategory(divCats.length > 0 ? divCats[0].id : "all");
          setSelectedSubCategory("all");
        }}
      >
        <TabsList variant="line" className="h-auto flex-wrap justify-start">
          <TabsTrigger value="all">All Divisions</TabsTrigger>
          {divisions.map((d) => (
            <TabsTrigger key={d.id} value={d.id}>{d.name}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        <div className="relative min-w-[140px] max-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-10 text-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value);}}
          />
        </div>
        <Select value={selectedCategory} onValueChange={(v: string | null) => {
          setSelectedCategory(v || "all");
          setSelectedSubCategory("all");
        }}>
          <SelectTrigger className="min-w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All Categories">All Categories</SelectItem>
            {filterCategories.map((c) => (
              <SelectItem key={c.id} value={c.id} label={`${c.name} (${c._count?.items || 0})`}>
                {c.name} ({c._count?.items || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCategory !== "all" && filterSubCategories.length > 0 && (
          <Select value={selectedSubCategory} onValueChange={(v: string | null) => {
            setSelectedSubCategory(v || "all");
            }}>
            <SelectTrigger className="min-w-[220px]">
              <SelectValue placeholder="All Sub-Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" label="All Sub-Categories">All Sub-Categories</SelectItem>
              {filterSubCategories.map((s) => (
                <SelectItem key={s.id} value={s.id} label={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No items found</p>
            <Button variant="outline" className="mt-4" onClick={openNew}>
              Add your first item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-3 md:py-4">
                {/* Desktop layout */}
                <div className="hidden md:flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2.5 rounded-lg bg-secondary shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{item.name}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {item.code}
                        </Badge>
                        {item.brand && (
                          <span className="text-xs text-muted-foreground shrink-0">{item.brand}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {item.division?.name?.split(" ").map((w) => w[0]).join("") || "?"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.category.name}
                        </Badge>
                        {item.subCategory && (
                          <Badge variant="outline" className="text-[10px]">
                            {item.subCategory.name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">GST: {item.gstRate}%</span>
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                        {item.supplier && (
                          <span className="text-xs text-muted-foreground">{item.supplier}</span>
                        )}
                        {item.manageStock && (
                          <button
                            onClick={() => openHistory(item)}
                            className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer ${
                              (item.stock ?? 0) === 0
                                ? "bg-red-500/20 text-red-400"
                                : (item.stock ?? 0) <= item.alertQuantity
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            Stock: {item.stock ?? 0}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-primary whitespace-nowrap">
                        {formatINR(item.unitPrice)}
                      </p>
                      {item.purchasePrice != null && item.purchasePrice > 0 && (
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          Cost: {formatINR(item.purchasePrice)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {item.manageStock && user?.role === "ADMIN" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-green-400" onClick={() => openStockDialog(item)} title="Adjust Stock">
                          <PackagePlus className="w-4 h-4" />
                        </Button>
                      )}
                      {item.manageStock && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" onClick={() => openHistory(item)} title="Stock History">
                          <History className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(item)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Mobile layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{item.code}</Badge>
                        {item.brand && <span className="text-[10px] text-muted-foreground">{item.brand}</span>}
                        <Badge variant="secondary" className="text-[10px]">
                          {item.division?.name?.split(" ").map((w) => w[0]).join("") || "?"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{item.category.name}</Badge>
                        {item.subCategory && <Badge variant="outline" className="text-[10px]">{item.subCategory.name}</Badge>}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-primary whitespace-nowrap shrink-0">{formatINR(item.unitPrice)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                      <span>GST: {item.gstRate}%</span>
                      <span>{item.unit}</span>
                      {item.manageStock && (
                        <button
                          onClick={() => openHistory(item)}
                          className={`inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded cursor-pointer ${
                            (item.stock ?? 0) === 0
                              ? "bg-red-500/20 text-red-400"
                              : (item.stock ?? 0) <= item.alertQuantity
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                          }`}
                        >
                          Stock: {item.stock ?? 0}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-0.5">
                      {item.manageStock && user?.role === "ADMIN" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-green-400" onClick={() => openStockDialog(item)} title="Adjust Stock">
                          <PackagePlus className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {item.manageStock && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-blue-400" onClick={() => openHistory(item)} title="Stock History">
                          <History className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)} title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(item)} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {items.length < totalItems && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : `Load More (${items.length} of ${totalItems})`}
              </Button>
            </div>
          )}
        </div>
      )}
      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen} disablePointerDismissal>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock — {stockItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="text-sm text-muted-foreground">
              Current stock: <span className="font-medium text-foreground">{stockItem?.stock ?? 0}</span>
            </div>
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={stockType} onValueChange={(v: string | null) => setStockType(v || "PURCHASE_IN")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE_IN" label="Purchase In">Purchase In</SelectItem>
                  <SelectItem value="ADJUSTMENT" label="Adjustment">Adjustment</SelectItem>
                  <SelectItem value="INITIAL" label="Initial Stock">Initial Stock</SelectItem>
                  <SelectItem value="RETURN" label="Return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={stockNotes}
                onChange={(e) => setStockNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStockDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleStockAdjust} disabled={stockSaving}>
                {stockSaving ? "Saving..." : "Update Stock"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} disablePointerDismissal>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Stock History — {historyItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <div className="text-sm text-muted-foreground mb-4">
              Current stock: <span className="font-medium text-foreground">{historyItem?.stock ?? 0}</span>
            </div>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stockHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No stock transactions yet</p>
            ) : (
              <div className="space-y-2">
                {stockHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={tx.type === "SALE_OUT" ? "destructive" : "default"}
                          className="text-[10px]"
                        >
                          {STOCK_TYPE_LABELS[tx.type] || tx.type}
                        </Badge>
                        <span className={`text-sm font-semibold ${
                          tx.type === "SALE_OUT" ? "text-red-400" : "text-green-400"
                        }`}>
                          {tx.type === "SALE_OUT" ? "-" : "+"}{tx.quantity}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{tx.createdBy.name}</span>
                        <span>{new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {tx.notes && <p className="text-xs text-muted-foreground mt-1">{tx.notes}</p>}
                      {tx.quotation && (
                        <p className="text-xs text-blue-400 mt-1">Quotation: {tx.quotation.quotationNumber}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
