import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const [
      totalQuotations,
      activeProjects,
      totalCustomers,
      recentQuotations,
      statusCounts,
      totalRevenue,
      totalPaid,
    ] = await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({
        where: { status: { in: ["APPROVED", "IN_PRODUCTION"] } },
      }),
      prisma.customer.count(),
      prisma.quotation.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      }),
      prisma.quotation.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.quotation.aggregate({
        _sum: { grandTotal: true },
        where: { status: { not: "DRAFT" } },
      }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);

    const managedItems = await prisma.item.findMany({
      where: { manageStock: true, active: true },
      select: { id: true, name: true, code: true, stock: true, alertQuantity: true, brand: true, category: { select: { name: true } } },
    });
    const lowStockItems = managedItems
      .filter((item) => (item.stock ?? 0) <= item.alertQuantity)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

    const pendingPayments = await prisma.quotation.findMany({
      where: {
        status: { in: ["APPROVED", "IN_PRODUCTION", "COMPLETED"] },
      },
      select: {
        id: true,
        quotationNumber: true,
        grandTotal: true,
        status: true,
        customer: { select: { name: true, mobile: true } },
        payments: { select: { amount: true } },
      },
    });

    const outstandingList = pendingPayments
      .map((q) => {
        const paid = q.payments.reduce((s, p) => s + p.amount, 0);
        const balance = q.grandTotal - paid;
        return { ...q, totalPaid: paid, balance };
      })
      .filter((q) => q.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    return jsonResponse({
      stats: {
        totalQuotations,
        activeProjects,
        totalCustomers,
        totalRevenue: totalRevenue._sum.grandTotal || 0,
        totalPaid: totalPaid._sum.amount || 0,
        outstanding: (totalRevenue._sum.grandTotal || 0) - (totalPaid._sum.amount || 0),
      },
      statusCounts: statusCounts.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count.id }),
        {} as Record<string, number>
      ),
      recentQuotations,
      outstandingList,
      lowStockItems,
    });
  });
}
