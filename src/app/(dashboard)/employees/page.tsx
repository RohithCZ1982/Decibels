"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Users, Printer, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { generateSalaryReceiptPDF } from "@/lib/salary-pdf";
import { generateDeductionReceiptPDF } from "@/lib/deduction-pdf";

interface Employee {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  role: string | null;
  baseSalary: number;
  advanceLimit: number;
  joinDate: string;
  active: boolean;
}

interface Salary {
  id: string;
  month: number;
  year: number;
  amount: number;
  notes: string | null;
  employee: { id: string; name: string; baseSalary: number; role: string | null };
  deductions: SalaryDeduction[];
}

interface SalaryDeduction {
  id: string;
  amount: number;
  reason: string;
  date: string;
  notes: string | null;
  employee: { name: string; role: string | null };
  salary: { month: number; year: number; amount: number } | null;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEDUCTION_REASONS = ["Advance", "Salary"];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

const emptyEmployee = { name: "", mobile: "", email: "", role: "", baseSalary: "", advanceLimit: "", joinDate: new Date().toISOString().split("T")[0] };
const emptySalary = { employeeId: "", month: currentMonth.toString(), year: currentYear.toString(), amount: "", notes: "" };
const emptyDeduction = { employeeId: "", salaryId: "", amount: "", reason: "Advance", date: new Date().toISOString().split("T")[0], notes: "" };

type TabKey = "overview" | "employees" | "salary" | "deductions";

export default function EmployeesPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [deductions, setDeductions] = useState<SalaryDeduction[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterMonth, setFilterMonth] = useState(currentMonth.toString());
  const [filterYear, setFilterYear] = useState(currentYear.toString());

  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState(emptyEmployee);
  const [empSaving, setEmpSaving] = useState(false);

  const [salDialogOpen, setSalDialogOpen] = useState(false);
  const [salForm, setSalForm] = useState(emptySalary);
  const [salSaving, setSalSaving] = useState(false);

  const [dedDialogOpen, setDedDialogOpen] = useState(false);
  const [dedForm, setDedForm] = useState(emptyDeduction);
  const [dedSaving, setDedSaving] = useState(false);

  const loadEmployees = useCallback(async () => {
    const res = await fetch("/api/employees");
    if (res.ok) setEmployees(await res.json());
  }, []);

  const loadSalaries = useCallback(async () => {
    const params = new URLSearchParams({ month: filterMonth, year: filterYear });
    const res = await fetch(`/api/salaries?${params}`);
    if (res.ok) setSalaries(await res.json());
  }, [filterMonth, filterYear]);

  const loadDeductions = useCallback(async () => {
    const params = new URLSearchParams({ month: filterMonth, year: filterYear });
    const res = await fetch(`/api/salary-deductions?${params}`);
    if (res.ok) setDeductions(await res.json());
  }, [filterMonth, filterYear]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadEmployees(), loadSalaries(), loadDeductions()]).finally(() => setLoading(false));
  }, [loadEmployees, loadSalaries, loadDeductions]);

  // Employee CRUD
  const openNewEmp = () => { setEditingEmp(null); setEmpForm(emptyEmployee); setEmpDialogOpen(true); };
  const openEditEmp = (e: Employee) => {
    setEditingEmp(e);
    setEmpForm({ name: e.name, mobile: e.mobile || "", email: e.email || "", role: e.role || "", baseSalary: e.baseSalary.toString(), advanceLimit: (e.advanceLimit ?? 0).toString(), joinDate: e.joinDate.split("T")[0] });
    setEmpDialogOpen(true);
  };
  const saveEmp = async () => {
    if (!empForm.name) { toast.error("Name is required"); return; }
    setEmpSaving(true);
    const url = editingEmp ? `/api/employees/${editingEmp.id}` : "/api/employees";
    const method = editingEmp ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(empForm) });
    if (res.ok) { toast.success(editingEmp ? "Employee updated" : "Employee added"); setEmpDialogOpen(false); loadEmployees(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setEmpSaving(false);
  };
  const deleteEmp = async (e: Employee) => {
    if (!confirm(`Deactivate "${e.name}"?`)) return;
    const res = await fetch(`/api/employees/${e.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Employee deactivated"); loadEmployees(); }
  };

  // Salary CRUD
  const openNewSal = () => { setSalForm({ ...emptySalary, month: filterMonth, year: filterYear }); setSalDialogOpen(true); };
  const saveSal = async () => {
    if (!salForm.employeeId || !salForm.amount) { toast.error("Employee and amount are required"); return; }
    setSalSaving(true);
    const res = await fetch("/api/salaries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(salForm) });
    if (res.ok) { toast.success("Salary added"); setSalDialogOpen(false); loadSalaries(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setSalSaving(false);
  };
  const deleteSal = async (s: Salary) => {
    if (!confirm("Delete this salary record?")) return;
    const res = await fetch(`/api/salaries/${s.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); loadSalaries(); }
  };

  // Deduction CRUD
  const openNewDed = () => { setDedForm({ ...emptyDeduction }); setDedDialogOpen(true); };
  const saveDed = async () => {
    if (!dedForm.employeeId || !dedForm.amount || !dedForm.reason) { toast.error("Employee, amount, and reason are required"); return; }

    const amt = parseFloat(dedForm.amount);
    if (amt <= 0) { toast.error("Amount must be greater than 0"); return; }

    const emp = employees.find((e) => e.id === dedForm.employeeId);

    // Client-side advance limit check
    if (dedForm.reason === "Advance" && emp && emp.advanceLimit > 0) {
      const existingAdvances = deductions
        .filter((d) => d.employee.name === emp.name && d.reason === "Advance")
        .reduce((s, d) => s + d.amount, 0);
      if (existingAdvances + amt > emp.advanceLimit) {
        toast.error(`Advance limit exceeded. Limit: ${formatINR(emp.advanceLimit)}, Already taken: ${formatINR(existingAdvances)}`);
        return;
      }
    }

    // Client-side salary balance check
    if (dedForm.salaryId) {
      const sal = salaries.find((s) => s.id === dedForm.salaryId);
      if (sal) {
        const existingDeds = sal.deductions.reduce((s, d) => s + d.amount, 0);
        if (existingDeds + amt > sal.amount) {
          toast.error(`Deduction would exceed salary balance. Salary: ${formatINR(sal.amount)}, Existing deductions: ${formatINR(existingDeds)}`);
          return;
        }
      }
    }

    setDedSaving(true);
    const res = await fetch("/api/salary-deductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dedForm) });
    if (res.ok) { toast.success("Deduction added"); setDedDialogOpen(false); loadDeductions(); loadSalaries(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setDedSaving(false);
  };
  const deleteDed = async (d: SalaryDeduction) => {
    if (!confirm("Delete this deduction?")) return;
    const res = await fetch(`/api/salary-deductions/${d.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); loadDeductions(); loadSalaries(); }
  };

  const printReceipt = (sal: Salary) => {
    const totalDeductions = sal.deductions.reduce((s, d) => s + d.amount, 0);
    generateSalaryReceiptPDF({
      employeeName: sal.employee.name,
      employeeRole: sal.employee.role || "",
      month: sal.month,
      year: sal.year,
      salary: sal.amount,
      deductions: sal.deductions.map((d) => ({ reason: d.reason, amount: d.amount })),
      totalDeductions,
      netPay: sal.amount - totalDeductions,
    });
  };

  const printDeductionReceipt = (ded: SalaryDeduction) => {
    generateDeductionReceiptPDF({
      employeeName: ded.employee.name,
      employeeRole: ded.employee.role || "",
      reason: ded.reason,
      amount: ded.amount,
      date: ded.date,
      notes: ded.notes,
      salaryMonth: ded.salary?.month || null,
      salaryYear: ded.salary?.year || null,
    });
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "employees", label: "Employees" },
    { key: "salary", label: "Salary" },
    { key: "deductions", label: "Deductions" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const overviewData = employees.filter((e) => e.active).map((emp) => {
    const sal = salaries.find((s) => s.employee.id === emp.id);
    const deds = sal ? sal.deductions.reduce((s, d) => s + d.amount, 0) : 0;
    return { ...emp, salary: sal?.amount || 0, deductions: deds, balance: (sal?.amount || 0) - deds };
  });

  // For deduction dialog: show remaining advance limit and salary balance
  const selectedDedEmp = employees.find((e) => e.id === dedForm.employeeId);
  const selectedDedSal = salaries.find((s) => s.employee.id === dedForm.employeeId);
  const existingAdvancesForEmp = deductions.filter((d) => selectedDedEmp && d.employee.name === selectedDedEmp.name && d.reason === "Advance").reduce((s, d) => s + d.amount, 0);
  const existingDedsForSal = selectedDedSal ? selectedDedSal.deductions.reduce((s, d) => s + d.amount, 0) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage employees, salaries, and deductions</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterMonth} onValueChange={(v: string | null) => setFilterMonth(v || currentMonth.toString())}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()} label={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={(v: string | null) => setFilterYear(v || currentYear.toString())}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y} label={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: OVERVIEW ===== */}
      {tab === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{MONTHS[parseInt(filterMonth) - 1]} {filterYear} — Salary Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {overviewData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active employees</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Employee</th>
                      <th className="pb-3 font-medium text-muted-foreground">Role</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Salary</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Deductions</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewData.map((emp) => (
                      <tr key={emp.id} className="border-b border-border/50">
                        <td className="py-3 font-medium">{emp.name}</td>
                        <td className="py-3 text-muted-foreground">{emp.role || "—"}</td>
                        <td className="py-3 text-right">{emp.salary > 0 ? formatINR(emp.salary) : <span className="text-muted-foreground">Not set</span>}</td>
                        <td className="py-3 text-right text-red-400">{emp.deductions > 0 ? formatINR(emp.deductions) : "—"}</td>
                        <td className="py-3 text-right font-semibold text-primary">{emp.salary > 0 ? formatINR(emp.balance) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="pt-3" colSpan={2}>Total</td>
                      <td className="pt-3 text-right">{formatINR(overviewData.reduce((s, e) => s + e.salary, 0))}</td>
                      <td className="pt-3 text-right text-red-400">{formatINR(overviewData.reduce((s, e) => s + e.deductions, 0))}</td>
                      <td className="pt-3 text-right text-primary">{formatINR(overviewData.reduce((s, e) => s + e.balance, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== TAB: EMPLOYEES ===== */}
      {tab === "employees" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewEmp}><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>
          </div>
          {employees.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employees yet</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {employees.map((emp) => (
                <Card key={emp.id} className={`hover:border-primary/30 transition-colors ${!emp.active ? "opacity-50" : ""}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{emp.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{emp.name}</p>
                            {emp.role && <Badge variant="outline" className="text-[10px]">{emp.role}</Badge>}
                            {!emp.active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                          </div>
                          <div className="flex gap-4 mt-0.5 text-xs text-muted-foreground">
                            {emp.mobile && <span>{emp.mobile}</span>}
                            {emp.email && <span>{emp.email}</span>}
                            <span>Joined: {new Date(emp.joinDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                            {emp.advanceLimit > 0 && <span>Adv. Limit: {formatINR(emp.advanceLimit)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold text-primary">{formatINR(emp.baseSalary)}</p>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEmp(emp)}><Edit2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteEmp(emp)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: SALARY ===== */}
      {tab === "salary" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewSal}><Plus className="w-4 h-4 mr-2" /> Add Salary</Button>
          </div>
          {salaries.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <IndianRupee className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No salaries for {MONTHS[parseInt(filterMonth) - 1]} {filterYear}</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {salaries.map((sal) => {
                const totalDed = sal.deductions.reduce((s, d) => s + d.amount, 0);
                const net = sal.amount - totalDed;
                return (
                  <Card key={sal.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{sal.employee.name}</p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{MONTHS[sal.month - 1]} {sal.year}</span>
                            {sal.notes && <span>{sal.notes}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Salary: {formatINR(sal.amount)}</p>
                            {totalDed > 0 && <p className="text-xs text-red-400">Deductions: {formatINR(totalDed)}</p>}
                            <p className="text-lg font-semibold text-primary">{formatINR(net)}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" onClick={() => printReceipt(sal)} title="Print Receipt"><Printer className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteSal(sal)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: DEDUCTIONS ===== */}
      {tab === "deductions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewDed}><Plus className="w-4 h-4 mr-2" /> Add Deduction</Button>
          </div>
          {deductions.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <IndianRupee className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No deductions for {MONTHS[parseInt(filterMonth) - 1]} {filterYear}</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {deductions.map((ded) => (
                <Card key={ded.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{ded.employee.name}</p>
                          <Badge variant={ded.reason === "Advance" ? "outline" : "secondary"} className="text-[10px]">{ded.reason}</Badge>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(ded.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          {ded.notes && <span>{ded.notes}</span>}
                          {ded.salary && <span>{MONTHS[ded.salary.month - 1]} {ded.salary.year}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-semibold text-red-400">{formatINR(ded.amount)}</p>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" onClick={() => printDeductionReceipt(ded)} title="Print Receipt"><Printer className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteDed(ded)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DIALOGS ===== */}

      {/* Employee Dialog */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingEmp ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Name *</Label><Input value={empForm.name} onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Role</Label><Input value={empForm.role} onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })} placeholder="e.g. Technician" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Mobile</Label><Input value={empForm.mobile} onChange={(e) => setEmpForm({ ...empForm, mobile: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1"><Label>Base Salary (INR)</Label><Input type="number" value={empForm.baseSalary} onChange={(e) => setEmpForm({ ...empForm, baseSalary: e.target.value })} /></div>
              <div className="space-y-1"><Label>Advance Limit</Label><Input type="number" value={empForm.advanceLimit} onChange={(e) => setEmpForm({ ...empForm, advanceLimit: e.target.value })} placeholder="0 = no limit" /></div>
              <div className="space-y-1"><Label>Join Date</Label><Input type="date" value={empForm.joinDate} onChange={(e) => setEmpForm({ ...empForm, joinDate: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveEmp} disabled={empSaving}>{empSaving ? "Saving..." : editingEmp ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Salary Dialog */}
      <Dialog open={salDialogOpen} onOpenChange={setSalDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Salary</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Employee *</Label>
              <Select value={salForm.employeeId} onValueChange={(v: string | null) => {
                const emp = employees.find((e) => e.id === v);
                setSalForm({ ...salForm, employeeId: v || "", amount: emp ? emp.baseSalary.toString() : salForm.amount });
              }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e) => e.active).map((e) => <SelectItem key={e.id} value={e.id} label={e.name}>{e.name} — {formatINR(e.baseSalary)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Month *</Label>
                <Select value={salForm.month} onValueChange={(v: string | null) => setSalForm({ ...salForm, month: v || "1" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()} label={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Year *</Label>
                <Select value={salForm.year} onValueChange={(v: string | null) => setSalForm({ ...salForm, year: v || currentYear.toString() })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map((y) => <SelectItem key={y} value={y} label={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Amount *</Label><Input type="number" value={salForm.amount} onChange={(e) => setSalForm({ ...salForm, amount: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={salForm.notes} onChange={(e) => setSalForm({ ...salForm, notes: e.target.value })} placeholder="Optional" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSalDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveSal} disabled={salSaving}>{salSaving ? "Saving..." : "Add Salary"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deduction Dialog */}
      <Dialog open={dedDialogOpen} onOpenChange={setDedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Deduction</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Employee *</Label>
                <Select value={dedForm.employeeId} onValueChange={(v: string | null) => {
                  const empId = v || "";
                  const sal = salaries.find((s) => s.employee.id === empId);
                  setDedForm({ ...dedForm, employeeId: empId, salaryId: sal?.id || "" });
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.active).map((e) => <SelectItem key={e.id} value={e.id} label={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reason *</Label>
                <Select value={dedForm.reason} onValueChange={(v: string | null) => setDedForm({ ...dedForm, reason: v || "Advance" })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_REASONS.map((r) => <SelectItem key={r} value={r} label={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Limits info */}
            {dedForm.employeeId && (
              <div className="flex gap-4 text-xs">
                {dedForm.reason === "Advance" && selectedDedEmp && selectedDedEmp.advanceLimit > 0 && (
                  <span className="text-muted-foreground">
                    Advance limit: {formatINR(selectedDedEmp.advanceLimit)} | Used: {formatINR(existingAdvancesForEmp)} | Remaining: <span className="text-primary font-medium">{formatINR(selectedDedEmp.advanceLimit - existingAdvancesForEmp)}</span>
                  </span>
                )}
                {selectedDedSal && (
                  <span className="text-muted-foreground">
                    Salary: {formatINR(selectedDedSal.amount)} | Deducted: {formatINR(existingDedsForSal)} | Available: <span className="text-primary font-medium">{formatINR(selectedDedSal.amount - existingDedsForSal)}</span>
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Amount *</Label><Input type="number" value={dedForm.amount} onChange={(e) => setDedForm({ ...dedForm, amount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={dedForm.date} onChange={(e) => setDedForm({ ...dedForm, date: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={dedForm.notes} onChange={(e) => setDedForm({ ...dedForm, notes: e.target.value })} placeholder="Optional" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDedDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveDed} disabled={dedSaving}>{dedSaving ? "Saving..." : "Add Deduction"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
