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
import { Plus, Edit2, Trash2, Users, Printer, IndianRupee, Wallet } from "lucide-react";
import { toast } from "sonner";
import { generateSalaryReceiptPDF } from "@/lib/salary-pdf";
import { generateDeductionReceiptPDF } from "@/lib/deduction-pdf";
import { generateAdvanceStatementPDF } from "@/lib/advance-pdf";

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

interface SalaryAdvance {
  id: string;
  amount: number;
  interestRate: number;
  date: string;
  notes: string | null;
  employee: { name: string; role: string | null };
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DEDUCTION_REASONS = ["Advance", "Salary"];

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function calcInterest(principal: number, rate: number, fromDate: string): number {
  const days = Math.max(0, Math.floor((Date.now() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)));
  return principal * (rate / 100) * (days / 365);
}

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

const emptyEmployee = { name: "", mobile: "", email: "", role: "", baseSalary: "", advanceLimit: "", joinDate: new Date().toISOString().split("T")[0] };
const emptySalary = { employeeId: "", month: currentMonth.toString(), year: currentYear.toString(), amount: "", notes: "" };
const emptyDeduction = { employeeId: "", salaryId: "", amount: "", reason: "Advance", date: new Date().toISOString().split("T")[0], notes: "" };
const emptyAdvance = { employeeId: "", amount: "", interestRate: "2", date: new Date().toISOString().split("T")[0], notes: "" };

type TabKey = "overview" | "employees" | "salary" | "deductions" | "advances";

export default function EmployeesPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [deductions, setDeductions] = useState<SalaryDeduction[]>([]);
  const [allDeductions, setAllDeductions] = useState<SalaryDeduction[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
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

  const [advDialogOpen, setAdvDialogOpen] = useState(false);
  const [advForm, setAdvForm] = useState(emptyAdvance);
  const [advSaving, setAdvSaving] = useState(false);

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

  const loadAdvances = useCallback(async () => {
    const res = await fetch("/api/salary-advances");
    if (res.ok) setAdvances(await res.json());
  }, []);

  const loadAllDeductions = useCallback(async () => {
    const res = await fetch("/api/salary-deductions?all=true");
    if (res.ok) setAllDeductions(await res.json());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadEmployees(), loadSalaries(), loadDeductions(), loadAdvances(), loadAllDeductions()]).finally(() => setLoading(false));
  }, [loadEmployees, loadSalaries, loadDeductions, loadAdvances, loadAllDeductions]);

  // Advance balance calculation per employee (uses allDeductions across all months)
  function getAdvanceInfo(empId: string) {
    const empName = employees.find((e) => e.id === empId)?.name;
    const empAdvances = advances.filter((a) => a.employee.name === empName);
    const totalAdvanced = empAdvances.reduce((s, a) => s + a.amount, 0);
    const totalInterest = empAdvances.reduce((s, a) => s + calcInterest(a.amount, a.interestRate, a.date), 0);
    // Both "Advance" and "Salary" reason deductions reduce the advance balance
    const totalRepaid = empName
      ? allDeductions.filter((d) => d.employee.name === empName && (d.reason === "Advance" || d.reason === "Salary")).reduce((s, d) => s + d.amount, 0)
      : 0;
    const principal = Math.max(0, totalAdvanced - totalRepaid);
    const interest = totalAdvanced > 0 ? Math.round(totalInterest * (principal / totalAdvanced)) : 0;
    return { totalAdvanced, totalRepaid, principal, interest, outstanding: principal + interest };
  }

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

    if (dedForm.reason === "Advance" && emp) {
      const advInfo = getAdvanceInfo(emp.id);
      if (advInfo.totalAdvanced <= 0) {
        toast.error("No advance taken to deduct from");
        return;
      }
      if (amt > advInfo.principal) {
        toast.error(`Amount exceeds advance balance. Outstanding principal: ${formatINR(advInfo.principal)}`);
        return;
      }
    }

    if (dedForm.reason === "Salary" && dedForm.salaryId) {
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
    if (res.ok) { toast.success("Deduction added"); setDedDialogOpen(false); loadDeductions(); loadAllDeductions(); loadSalaries(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setDedSaving(false);
  };
  const deleteDed = async (d: SalaryDeduction) => {
    if (!confirm("Delete this deduction?")) return;
    const res = await fetch(`/api/salary-deductions/${d.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); loadDeductions(); loadAllDeductions(); loadSalaries(); }
  };

  // Advance CRUD
  const openNewAdv = () => { setAdvForm({ ...emptyAdvance }); setAdvDialogOpen(true); };
  const saveAdv = async () => {
    if (!advForm.employeeId || !advForm.amount) { toast.error("Employee and amount are required"); return; }
    const amt = parseFloat(advForm.amount);
    if (amt <= 0) { toast.error("Amount must be greater than 0"); return; }
    setAdvSaving(true);
    const res = await fetch("/api/salary-advances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(advForm) });
    if (res.ok) { toast.success("Advance added"); setAdvDialogOpen(false); loadAdvances(); }
    else { const d = await res.json(); toast.error(d.error || "Failed"); }
    setAdvSaving(false);
  };
  const deleteAdv = async (a: SalaryAdvance) => {
    if (!confirm("Delete this advance record?")) return;
    const res = await fetch(`/api/salary-advances/${a.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); loadAdvances(); }
  };

  const printAdvanceStatement = async (adv: SalaryAdvance) => {
    const empName = adv.employee.name;
    const empObj = employees.find((e) => e.name === empName);
    const empDeds = allDeductions
      .filter((d) => d.employee.name === empName && (d.reason === "Advance" || d.reason === "Salary"))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const advInfo = empObj ? getAdvanceInfo(empObj.id) : { totalAdvanced: 0, totalRepaid: 0, principal: 0, interest: 0, outstanding: 0 };
    const totalAdvanced = advances.filter((a) => a.employee.name === empName).reduce((s, a) => s + a.amount, 0);
    await generateAdvanceStatementPDF({
      employeeName: empName,
      employeeRole: adv.employee.role || "",
      advanceAmount: totalAdvanced,
      advanceDate: adv.date,
      interestRate: adv.interestRate,
      advanceNotes: adv.notes,
      deductions: empDeds.map((d) => ({ amount: d.amount, reason: d.reason, date: d.date, notes: d.notes })),
      totalRepaid: advInfo.totalRepaid,
      principal: advInfo.principal,
      interest: advInfo.interest,
      outstanding: advInfo.outstanding,
    });
  };

  const printReceipt = async (sal: Salary) => {
    const totalDeductions = sal.deductions.reduce((s, d) => s + d.amount, 0);
    const empId = sal.employee.id;
    const advInfo = getAdvanceInfo(empId);
    await generateSalaryReceiptPDF({
      employeeName: sal.employee.name,
      employeeRole: sal.employee.role || "",
      month: sal.month,
      year: sal.year,
      salary: sal.amount,
      deductions: sal.deductions.map((d) => ({ reason: d.reason, amount: d.amount })),
      totalDeductions,
      netPay: sal.amount - totalDeductions,
      advanceBalance: advInfo.outstanding,
    });
  };

  const printDeductionReceipt = async (ded: SalaryDeduction) => {
    await generateDeductionReceiptPDF({
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
    { key: "advances", label: "Advances" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const overviewData = employees.filter((e) => e.active).map((emp) => {
    const sal = salaries.find((s) => s.employee.id === emp.id);
    const salDeds = sal ? sal.deductions.reduce((s, d) => s + d.amount, 0) : 0;
    const advDeds = deductions.filter((d) => d.employee.name === emp.name && d.reason === "Advance").reduce((s, d) => s + d.amount, 0);
    const totalDeds = salDeds + advDeds;
    const advInfo = getAdvanceInfo(emp.id);
    return { ...emp, salary: sal?.amount || 0, deductions: totalDeds, balance: (sal?.amount || 0) - totalDeds, advanceOutstanding: advInfo.outstanding };
  });

  const selectedDedEmp = employees.find((e) => e.id === dedForm.employeeId);
  const selectedDedSal = salaries.find((s) => s.employee.id === dedForm.employeeId);
  const existingAdvancesForEmp = deductions.filter((d) => selectedDedEmp && d.employee.name === selectedDedEmp.name && d.reason === "Advance").reduce((s, d) => s + d.amount, 0);
  const existingDedsForSal = selectedDedSal ? selectedDedSal.deductions.reduce((s, d) => s + d.amount, 0) : 0;
  const selectedDedAdvInfo = selectedDedEmp ? getAdvanceInfo(selectedDedEmp.id) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Salaries, deductions & advances</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterMonth} onValueChange={(v: string | null) => setFilterMonth(v || currentMonth.toString())}>
            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()} label={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={(v: string | null) => setFilterYear(v || currentYear.toString())}>
            <SelectTrigger className="w-[85px] h-8 text-sm"><SelectValue /></SelectTrigger>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">Employee</th>
                    <th className="pb-2 font-medium text-muted-foreground">Role</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Salary</th>
                    <th className="pb-2 font-medium text-muted-foreground text-right">Advance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.map((emp) => (
                    <tr key={emp.id} className="border-b border-border/50">
                      <td className="py-2 font-medium">{emp.name}</td>
                      <td className="py-2 text-muted-foreground">{emp.role || "—"}</td>
                      <td className="py-2 text-right">{emp.salary > 0 ? formatINR(emp.salary) : <span className="text-muted-foreground">Not set</span>}</td>
                      <td className="py-2 text-right">
                        {emp.advanceOutstanding > 0 ? (
                          <span className="text-amber-400 font-medium">{formatINR(Math.round(emp.advanceOutstanding))}</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="pt-2" colSpan={2}>Total</td>
                    <td className="pt-2 text-right">{formatINR(overviewData.reduce((s, e) => s + e.salary, 0))}</td>
                    <td className="pt-2 text-right text-amber-400">{formatINR(Math.round(overviewData.reduce((s, e) => s + e.advanceOutstanding, 0)))}</td>
                  </tr>
                </tfoot>
              </table>
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
              {employees.map((emp) => {
                const advInfo = getAdvanceInfo(emp.id);
                return (
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
                              {advInfo.outstanding > 0 && (
                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                  Adv: {formatINR(Math.round(advInfo.outstanding))}
                                </Badge>
                              )}
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
                );
              })}
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

      {/* ===== TAB: ADVANCES ===== */}
      {tab === "advances" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewAdv}><Plus className="w-4 h-4 mr-2" /> Add Advance</Button>
          </div>
          {advances.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No advance salary records</p>
            </CardContent></Card>
          ) : (
            <>
              {/* Summary per employee */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Advance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Employee</th>
                          <th className="pb-2 font-medium text-right">Total Advanced</th>
                          <th className="pb-2 font-medium text-right">Repaid</th>
                          <th className="pb-2 font-medium text-right">Principal</th>
                          <th className="pb-2 font-medium text-right">Interest</th>
                          <th className="pb-2 font-medium text-right">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.filter((e) => e.active).map((emp) => {
                          const info = getAdvanceInfo(emp.id);
                          if (info.totalAdvanced === 0) return null;
                          return (
                            <tr key={emp.id} className="border-b border-border/50">
                              <td className="py-2.5 font-medium">{emp.name}</td>
                              <td className="py-2.5 text-right">{formatINR(info.totalAdvanced)}</td>
                              <td className="py-2.5 text-right text-green-400">{formatINR(info.totalRepaid)}</td>
                              <td className="py-2.5 text-right">{formatINR(info.principal)}</td>
                              <td className="py-2.5 text-right text-amber-400">{formatINR(Math.round(info.interest))}</td>
                              <td className="py-2.5 text-right font-semibold text-amber-400">{formatINR(Math.round(info.outstanding))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Individual advance records */}
              <div className="grid gap-3">
                {advances.map((adv) => {
                  const interest = calcInterest(adv.amount, adv.interestRate, adv.date);
                  const days = Math.floor((Date.now() - new Date(adv.date).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <Card key={adv.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{adv.employee.name}</p>
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                                {adv.interestRate}% p.a.
                              </Badge>
                            </div>
                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{new Date(adv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              <span>{days} days</span>
                              <span>Interest: {formatINR(Math.round(interest))}</span>
                              {adv.notes && <span>{adv.notes}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-lg font-semibold text-amber-400">{formatINR(adv.amount)}</p>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-400" onClick={() => printAdvanceStatement(adv)} title="Print Statement"><Printer className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => deleteAdv(adv)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
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
                  setDedForm({ ...dedForm, employeeId: empId, salaryId: dedForm.reason === "Salary" ? (sal?.id || "") : "" });
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter((e) => e.active).map((e) => <SelectItem key={e.id} value={e.id} label={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Reason *</Label>
                <Select value={dedForm.reason} onValueChange={(v: string | null) => {
                  const reason = v || "Advance";
                  const sal = salaries.find((s) => s.employee.id === dedForm.employeeId);
                  setDedForm({ ...dedForm, reason, salaryId: reason === "Salary" ? (sal?.id || "") : "" });
                }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_REASONS.map((r) => <SelectItem key={r} value={r} label={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Balance info */}
            {dedForm.employeeId && (
              <div className="space-y-1 text-xs">
                {dedForm.reason === "Advance" && selectedDedAdvInfo && (
                  selectedDedAdvInfo.totalAdvanced > 0 ? (
                    <p className="text-amber-400">
                      Advance taken: {formatINR(selectedDedAdvInfo.totalAdvanced)} | Repaid: {formatINR(selectedDedAdvInfo.totalRepaid)} | Balance: <span className="font-semibold">{formatINR(selectedDedAdvInfo.principal)}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No advance taken by this employee</p>
                  )
                )}
                {dedForm.reason === "Salary" && (
                  <>
                    {selectedDedAdvInfo && selectedDedAdvInfo.outstanding > 0 && (
                      <p className="text-amber-400">
                        Advance outstanding: {formatINR(Math.round(selectedDedAdvInfo.outstanding))} (Principal: {formatINR(selectedDedAdvInfo.principal)} + Interest: {formatINR(Math.round(selectedDedAdvInfo.interest))})
                      </p>
                    )}
                    {selectedDedSal ? (
                      <p className="text-muted-foreground">
                        Salary: {formatINR(selectedDedSal.amount)} | Deducted: {formatINR(existingDedsForSal)} | Available: <span className="text-primary font-medium">{formatINR(selectedDedSal.amount - existingDedsForSal)}</span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">No salary record for this month</p>
                    )}
                  </>
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

      {/* Advance Dialog */}
      <Dialog open={advDialogOpen} onOpenChange={setAdvDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Advance Salary</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Employee *</Label>
              <Select value={advForm.employeeId} onValueChange={(v: string | null) => setAdvForm({ ...advForm, employeeId: v || "" })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e) => e.active).map((e) => <SelectItem key={e.id} value={e.id} label={e.name}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1"><Label>Amount (INR) *</Label><Input type="number" value={advForm.amount} onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Interest Rate (%)</Label><Input type="number" value={advForm.interestRate} onChange={(e) => setAdvForm({ ...advForm, interestRate: e.target.value })} /></div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={advForm.date} onChange={(e) => setAdvForm({ ...advForm, date: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Notes</Label><Input value={advForm.notes} onChange={(e) => setAdvForm({ ...advForm, notes: e.target.value })} placeholder="Optional" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAdvDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveAdv} disabled={advSaving}>{advSaving ? "Saving..." : "Add Advance"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
