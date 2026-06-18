"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  _count?: { items: number };
}

interface Item {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unitPrice: number;
  supplier: string | null;
  stock: number | null;
  imageUrl: string | null;
  active: boolean;
  category: Category;
  categoryId: string;
}

const emptyForm = {
  code: "",
  name: "",
  categoryId: "",
  unitPrice: "",
  description: "",
  supplier: "",
  stock: "",
  imageUrl: "",
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, page: page.toString(), limit: "20" });
    if (selectedCategory && selectedCategory !== "all") params.set("categoryId", selectedCategory);

    const [itemsRes, catsRes] = await Promise.all([
      fetch(`/api/items?${params}`),
      fetch("/api/categories"),
    ]);
    const itemsData = await itemsRes.json();
    const catsData = await catsRes.json();

    setItems(itemsData.items || []);
    setTotalPages(itemsData.totalPages || 1);
    setCategories(catsData);
    setLoading(false);
  }, [search, selectedCategory, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openNew = async () => {
    setEditingItem(null);
    setForm(emptyForm);
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
    setForm({
      code: item.code,
      name: item.name,
      categoryId: item.categoryId,
      unitPrice: item.unitPrice.toString(),
      description: item.description || "",
      supplier: item.supplier || "",
      stock: item.stock?.toString() || "",
      imageUrl: item.imageUrl || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.categoryId || !form.unitPrice) {
      toast.error("Code, name, category, and unit price are required");
      return;
    }
    setSaving(true);

    let catId = form.categoryId;
    if (catId === "__new__" && newCategory) {
      const catRes = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory }),
      });
      if (!catRes.ok) {
        toast.error("Failed to create category");
        setSaving(false);
        return;
      }
      const cat = await catRes.json();
      catId = cat.id;
    }

    const payload = { ...form, categoryId: catId };
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
      setShowNewCategory(false);
      setNewCategory("");
      loadData();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Database</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage products, services, and equipment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Code *</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder={editingItem ? "" : "Auto-generated..."}
                    className={!editingItem && form.code ? "text-muted-foreground" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price (INR) *</Label>
                  <Input
                    type="number"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                    placeholder="25000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="JBL Synthesis SCL-3"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v: string | null) => {
                    setForm({ ...form, categoryId: v || "" });
                    setShowNewCategory(v === "__new__");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__new__" label="+ New Category">+ New Category</SelectItem>
                  </SelectContent>
                </Select>
                {showNewCategory && (
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe this product or service..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Harman International"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingItem ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={selectedCategory} onValueChange={(v: string | null) => { setSelectedCategory(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" label="All Categories">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} label={`${c.name} (${c._count?.items || 0})`}>
                {c.name} ({c._count?.items || 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
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
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {item.category.name}
                        </Badge>
                        {item.supplier && (
                          <span className="text-xs text-muted-foreground">{item.supplier}</span>
                        )}
                        {item.stock != null && (
                          <span className="text-xs text-muted-foreground">Stock: {item.stock}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold text-primary whitespace-nowrap">
                      {formatINR(item.unitPrice)}
                    </p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
