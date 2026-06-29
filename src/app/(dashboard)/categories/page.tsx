"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  FolderTree,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

interface SubCategory {
  id: string;
  name: string;
  hsnCode: string | null;
  categoryId: string;
  _count?: { items: number };
}

interface Category {
  id: string;
  name: string;
  hsnCode: string | null;
  order: number;
  divisionId: string;
  division: { id: string; name: string; slug: string };
  _count?: { items: number };
  subCategories: SubCategory[];
}

interface DivisionInfo {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [divisions, setDivisions] = useState<DivisionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDivision, setActiveDivision] = useState<string>("");

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", hsnCode: "" });
  const [catSaving, setCatSaving] = useState(false);

  // Sub-category dialog
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [subParentCat, setSubParentCat] = useState<Category | null>(null);
  const [subForm, setSubForm] = useState({ name: "", hsnCode: "" });
  const [subSaving, setSubSaving] = useState(false);

  // Expanded category
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Division dialog
  const [divDialogOpen, setDivDialogOpen] = useState(false);
  const [editingDiv, setEditingDiv] = useState<DivisionInfo | null>(null);
  const [divForm, setDivForm] = useState({ name: "", slug: "" });
  const [divSaving, setDivSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [catsRes, divsRes] = await Promise.all([
      activeDivision ? fetch(`/api/categories?divisionId=${activeDivision}`) : fetch("/api/categories"),
      fetch("/api/divisions"),
    ]);
    if (catsRes.ok) setCategories(await catsRes.json());
    const divs: DivisionInfo[] = await divsRes.json();
    setDivisions(divs);
    if (!activeDivision && divs.length > 0) {
      setActiveDivision(divs[0].id);
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [activeDivision]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Category CRUD ---
  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ name: "", hsnCode: "" });
    setCatDialogOpen(true);
  };

  const openEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({ name: cat.name, hsnCode: cat.hsnCode || "" });
    setCatDialogOpen(true);
  };

  const saveCat = async () => {
    if (!catForm.name.trim()) { toast.error("Name is required"); return; }
    setCatSaving(true);

    const url = editingCat ? `/api/categories/${editingCat.id}` : "/api/categories";
    const method = editingCat ? "PUT" : "POST";
    const payload = editingCat
      ? { name: catForm.name.trim(), hsnCode: catForm.hsnCode || null }
      : { name: catForm.name.trim(), hsnCode: catForm.hsnCode || null, divisionId: activeDivision };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingCat ? "Category updated" : "Category created");
      setCatDialogOpen(false);
      loadData();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to save");
    }
    setCatSaving(false);
  };

  const deleteCat = async (cat: Category) => {
    const itemCount = cat._count?.items || 0;
    const subCount = cat.subCategories.length;
    const warn = `Delete category "${cat.name}"?` +
      (subCount > 0 ? `\n\nThis will also remove ${subCount} sub-categor${subCount === 1 ? "y" : "ies"}.` : "") +
      (itemCount > 0 ? `\n\n${itemCount} item(s) under this category will be hidden from the items list.` : "");
    if (!confirm(warn)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted");
      if (expandedCat === cat.id) setExpandedCat(null);
      loadData();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to delete");
    }
  };

  // --- Sub-category CRUD ---
  const openNewSub = (cat: Category) => {
    setEditingSub(null);
    setSubParentCat(cat);
    setSubForm({ name: "", hsnCode: "" });
    setSubDialogOpen(true);
  };

  const openEditSub = (sub: SubCategory, cat: Category) => {
    setEditingSub(sub);
    setSubParentCat(cat);
    setSubForm({ name: sub.name, hsnCode: sub.hsnCode || "" });
    setSubDialogOpen(true);
  };

  const saveSub = async () => {
    if (!subForm.name.trim()) { toast.error("Name is required"); return; }
    setSubSaving(true);

    const url = editingSub ? `/api/subcategories/${editingSub.id}` : "/api/subcategories";
    const method = editingSub ? "PUT" : "POST";
    const payload = editingSub
      ? { name: subForm.name.trim(), hsnCode: subForm.hsnCode || null }
      : { name: subForm.name.trim(), hsnCode: subForm.hsnCode || null, categoryId: subParentCat!.id };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingSub ? "Sub-category updated" : "Sub-category created");
      setSubDialogOpen(false);
      loadData();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to save");
    }
    setSubSaving(false);
  };

  const deleteSub = async (sub: SubCategory) => {
    if (!confirm(`Delete sub-category "${sub.name}"?`)) return;
    const res = await fetch(`/api/subcategories/${sub.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Sub-category deleted");
      loadData();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to delete");
    }
  };

  // --- Division CRUD ---
  const openNewDiv = () => {
    setEditingDiv(null);
    setDivForm({ name: "", slug: "" });
    setDivDialogOpen(true);
  };

  const openEditDiv = () => {
    const div = divisions.find((d) => d.id === activeDivision);
    if (!div) return;
    setEditingDiv(div);
    setDivForm({ name: div.name, slug: div.slug });
    setDivDialogOpen(true);
  };

  const saveDiv = async () => {
    if (!divForm.name.trim()) { toast.error("Name is required"); return; }
    setDivSaving(true);

    if (editingDiv) {
      const res = await fetch(`/api/divisions/${editingDiv.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: divForm.name.trim(), slug: divForm.slug.trim().toUpperCase().replace(/\s+/g, "_") || undefined }),
      });
      if (res.ok) {
        toast.success("Division updated");
        setDivDialogOpen(false);
        loadData();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to update");
      }
    } else {
      const slug = divForm.slug.trim() || divForm.name.trim().toUpperCase().replace(/\s+/g, "_");
      const res = await fetch("/api/divisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: divForm.name.trim(), slug }),
      });
      if (res.ok) {
        const newDiv = await res.json();
        toast.success("Division created");
        setDivDialogOpen(false);
        setActiveDivision(newDiv.id);
        loadData();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to create");
      }
    }
    setDivSaving(false);
  };

  const divCategories = categories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage divisions, categories, and sub-categories
          </p>
        </div>
        <Button onClick={openNewCat} size="sm" className="md:size-default">
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Add Category</span>
        </Button>
      </div>

      {/* Division selector */}
      <div className="flex items-center gap-2">
        <Select
          labels={Object.fromEntries(divisions.map((d) => [d.id, d.name]))}
          value={activeDivision || "none"}
          onValueChange={(v: string | null) => {
            if (v && v !== "none") { setActiveDivision(v); setExpandedCat(null); }
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select Division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((d) => <SelectItem key={d.id} value={d.id} label={d.name}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {activeDivision && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openEditDiv} title="Edit Division">
            <Settings2 className="w-4 h-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={openNewDiv}>
          <Plus className="w-4 h-4 mr-1" /> Division
        </Button>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>
      ) : divCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderTree className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No categories in {divisions.find((d) => d.id === activeDivision)?.name || "this division"}</p>
            <p className="text-sm mt-1">Click &quot;Add Category&quot; to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {divCategories.map((cat) => {
            const isExpanded = expandedCat === cat.id;
            return (
              <Card key={cat.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Category Row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                  >
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{cat.name}</span>
                        {cat.hsnCode && (
                          <Badge variant="outline" className="text-[10px]">
                            HSN: {cat.hsnCode}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{cat._count?.items || 0} items</span>
                        <span>{cat.subCategories.length} sub-categories</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary"
                        onClick={() => openNewSub(cat)}
                        title="Add sub-category"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary"
                        onClick={() => openEditCat(cat)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => deleteCat(cat)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sub-categories (expanded) */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30">
                      {cat.subCategories.length === 0 ? (
                        <div className="px-10 py-4 text-sm text-muted-foreground">
                          No sub-categories.{" "}
                          <button
                            className="text-primary hover:underline"
                            onClick={() => openNewSub(cat)}
                          >
                            Add one
                          </button>
                        </div>
                      ) : (
                        cat.subCategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-3 px-10 py-2.5 border-b border-border/30 last:border-0 hover:bg-accent/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{sub.name}</span>
                                {sub.hsnCode && (
                                  <Badge variant="outline" className="text-[10px]">
                                    HSN: {sub.hsnCode}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {sub._count?.items || 0} items
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:text-primary"
                                onClick={() => openEditSub(sub, cat)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:text-destructive"
                                onClick={() => deleteSub(sub)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen} disablePointerDismissal>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Division</Label>
              <p className="text-sm font-medium text-primary">{divisions.find((d) => d.id === activeDivision)?.name || "—"}</p>
            </div>
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="Category name"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>HSN Code</Label>
              <Input
                value={catForm.hsnCode}
                onChange={(e) => setCatForm({ ...catForm, hsnCode: e.target.value })}
                placeholder="e.g. 851840"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveCat} disabled={catSaving}>
                {catSaving ? "Saving..." : editingCat ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Division Dialog */}
      <Dialog open={divDialogOpen} onOpenChange={setDivDialogOpen} disablePointerDismissal>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDiv ? "Edit Division" : "Add Division"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={divForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setDivForm({ name, slug: editingDiv ? divForm.slug : name.toUpperCase().replace(/\s+/g, "_") });
                }}
                placeholder="e.g. Home Theater"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input
                value={divForm.slug}
                onChange={(e) => setDivForm({ ...divForm, slug: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                placeholder="e.g. HOME_THEATER"
              />
              <p className="text-xs text-muted-foreground">Auto-generated from name. Used internally.</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDivDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveDiv} disabled={divSaving}>
                {divSaving ? "Saving..." : editingDiv ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-category Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen} disablePointerDismissal>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSub ? "Edit Sub-Category" : "Add Sub-Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Category</Label>
              <p className="text-sm font-medium text-primary">{subParentCat?.name}</p>
            </div>
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={subForm.name}
                onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                placeholder="Sub-category name"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>HSN Code</Label>
              <Input
                value={subForm.hsnCode}
                onChange={(e) => setSubForm({ ...subForm, hsnCode: e.target.value })}
                placeholder="e.g. 851840"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSubDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveSub} disabled={subSaving}>
                {subSaving ? "Saving..." : editingSub ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
