import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse, isValidEmail, isValidMobile, isValidGSTNumber } from "@/lib/api-helpers";

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
    const { name, mobile, email, address, gstNumber, notes } = body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return errorResponse("Customer not found", 404);

    if (mobile !== undefined && !isValidMobile(mobile)) return errorResponse("Enter a valid 10-digit mobile number");
    if (email && !isValidEmail(email)) return errorResponse("Enter a valid email address");
    if (gstNumber && !isValidGSTNumber(gstNumber)) return errorResponse("Enter a valid 15-character GST number");

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(mobile !== undefined && { mobile }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(gstNumber !== undefined && { gstNumber: gstNumber || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });
    return jsonResponse(customer);
  });
}
