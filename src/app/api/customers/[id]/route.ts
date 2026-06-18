import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        quotations: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { payments: true } } },
        },
      },
    });
    if (!customer) return errorResponse("Customer not found", 404);
    return jsonResponse(customer);
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const customer = await prisma.customer.update({
      where: { id },
      data: body,
    });
    return jsonResponse(customer);
  });
}
