import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "monthly";

    if (type === "monthly") {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const quotations = await prisma.quotation.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true, grandTotal: true, status: true },
        orderBy: { createdAt: "asc" },
      });

      const monthly: Record<string, { month: string; label: string; quotations: number; revenue: number; confirmed_revenue: number }> = {};
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (const q of quotations) {
        const d = new Date(q.createdAt);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (!monthly[key]) monthly[key] = { month: key, label, quotations: 0, revenue: 0, confirmed_revenue: 0 };
        monthly[key].quotations++;
        monthly[key].revenue += q.grandTotal;
        if (q.status !== "DRAFT") monthly[key].confirmed_revenue += q.grandTotal;
      }

      return jsonResponse(Object.values(monthly));
    }

    if (type === "items") {
      const data = await prisma.quotationItem.groupBy({
        by: ["name"],
        _sum: { quantity: true, total: true },
        _count: { id: true },
        orderBy: { _sum: { total: "desc" } },
        take: 20,
      });
      return jsonResponse(data);
    }

    if (type === "templates") {
      const data = await prisma.template.findMany({
        include: { _count: { select: { quotations: true } } },
        where: { active: true },
        orderBy: { quotations: { _count: "desc" } },
      });
      return jsonResponse(data);
    }

    if (type === "payments") {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const payments = await prisma.payment.findMany({
        where: { date: { gte: twelveMonthsAgo } },
        select: { date: true, amount: true },
        orderBy: { date: "asc" },
      });

      const monthly: Record<string, { month: string; label: string; total: number; count: number }> = {};
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (const p of payments) {
        const d = new Date(p.date);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (!monthly[key]) monthly[key] = { month: key, label, total: 0, count: 0 };
        monthly[key].total += p.amount;
        monthly[key].count++;
      }

      return jsonResponse(Object.values(monthly));
    }

    return jsonResponse([]);
  });
}
