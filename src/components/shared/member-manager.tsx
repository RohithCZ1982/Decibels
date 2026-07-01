"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Phone, Mail, Edit2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Member {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  notes: string | null;
  _count?: { quotations: number };
}

interface MemberManagerProps {
  apiBase: string;
  listKey: string;
  detailBase: string;
  label: string;
  icon: LucideIcon;
}

export function MemberManager({ apiBase, listKey, detailBase, label, icon: Icon }: MemberManagerProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", address: "", gstNumber: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${apiBase}?search=${encodeURIComponent(search)}&page=${page}`);
    const data = await res.json();
    setMembers(data[listKey] || []);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [apiBase, listKey, search, page]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", mobile: "", email: "", address: "", gstNumber: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({ name: m.name, mobile: m.mobile, email: m.email || "", address: m.address || "", gstNumber: m.gstNumber || "", notes: m.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.mobile) { toast.error("Name and mobile are required"); return; }
    const mobileDigits = form.mobile.replace(/\D/g, "");
    const mobileLocal = mobileDigits.length === 12 && mobileDigits.startsWith("91") ? mobileDigits.slice(2) : mobileDigits;
    if (!/^[6-9]\d{9}$/.test(mobileLocal)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Enter a valid email address"); return; }
    if (form.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gstNumber.toUpperCase())) {
      toast.error("Enter a valid 15-character GST number");
      return;
    }
    setSaving(true);

    const url = editing ? `${apiBase}/${editing.id}` : apiBase;
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success(editing ? `${label} updated` : `${label} added`);
      setDialogOpen(false);
      load();
    } else {
      const d = await res.json();
      toast.error(d.error || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Manage your {label.toLowerCase()} database</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen} disablePointerDismissal>
          <DialogTrigger render={<Button onClick={openNew} size="sm" className="md:size-default" />}>
            <Plus className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Add {label}</span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mobile *</Label>
                  <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })} placeholder="e.g. 29ABCDE1234F1Z5" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update" : `Add ${label}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, mobile, or email..."
          className="pl-10"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No {label.toLowerCase()}s found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {members.map((m) => (
            <Card key={m.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <Link href={`${detailBase}/${m.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{m.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium group-hover:text-primary transition-colors">{m.name}</p>
                      <div className="flex items-center gap-4 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {m.mobile}
                        </span>
                        {m.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {m.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    {m._count && m._count.quotations > 0 && (
                      <span className="text-xs text-muted-foreground">{m._count.quotations} quotations</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
