"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Landmark, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface BankDetail {
  id: string;
  name: string;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
  active: boolean;
}

const emptyForm = { name: "", bankName: "", ifscCode: "", accountNumber: "" };

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankDetail | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/bank-details");
    if (res.ok) setBankDetails(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (b: BankDetail) => {
    setEditing(b);
    setForm({ name: b.name, bankName: b.bankName, ifscCode: b.ifscCode, accountNumber: b.accountNumber });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.bankName || !form.ifscCode || !form.accountNumber) {
      toast.error("All fields are required");
      return;
    }
    setSaving(true);
    const url = editing ? `/api/bank-details/${editing.id}` : "/api/bank-details";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success(editing ? "Bank detail updated" : "Bank detail added");
      setDialogOpen(false);
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save bank detail");
    }
    setSaving(false);
  };

  const handleDelete = async (b: BankDetail) => {
    if (!confirm(`Delete bank account "${b.name}"?`)) return;
    const res = await fetch(`/api/bank-details/${b.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Bank detail deleted");
      load();
    } else {
      toast.error("Failed to delete bank detail");
    }
  };

  const handleSetActive = async (b: BankDetail) => {
    if (b.active) return;
    const res = await fetch(`/api/bank-details/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      toast.success(`"${b.name}" set as active bank account`);
      load();
    } else {
      toast.error("Failed to set active bank account");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage application-wide configuration</p>
      </div>

      <Tabs defaultValue="bank-details">
        <TabsList>
          <TabsTrigger value="bank-details">
            <Landmark className="w-4 h-4 mr-1.5" /> Bank Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bank-details" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              The active account is included on quotation PDF/Excel exports.
            </p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> Add Bank Account
            </Button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen} disablePointerDismissal>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Account holder name" />
                </div>
                <div className="space-y-1">
                  <Label>Bank Name *</Label>
                  <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>IFSC Code *</Label>
                    <Input value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })} placeholder="HDFC0001234" />
                  </div>
                  <div className="space-y-1">
                    <Label>Account Number *</Label>
                    <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="Account number" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing ? "Update" : "Save"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : bankDetails.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Landmark className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bank accounts added yet</p>
                <Button variant="outline" className="mt-4" onClick={openNew}>
                  Add your first bank account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {bankDetails.map((b) => (
                <Card key={b.id} className={b.active ? "border-primary/40" : undefined}>
                  <CardContent className="py-3 md:py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{b.name}</p>
                        <Badge variant="secondary" className="text-[10px]">{b.bankName}</Badge>
                        {b.active && (
                          <Badge className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>IFSC: {b.ifscCode}</span>
                        <span>A/C: {b.accountNumber}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Switch checked={b.active} onCheckedChange={() => handleSetActive(b)} />
                        <span className="text-xs text-muted-foreground hidden sm:inline">Active</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(b)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
