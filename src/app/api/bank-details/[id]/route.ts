import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, bankName, ifscCode, accountNumber, active } = body;

    const existing = await prisma.bankDetail.findUnique({ where: { id } });
    if (!existing) return errorResponse("Bank detail not found", 404);

    const bankDetail = await prisma.$transaction(async (tx) => {
      if (active === true) {
        await tx.bankDetail.updateMany({ where: { active: true, id: { not: id } }, data: { active: false } });
      }
      return tx.bankDetail.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(bankName && { bankName }),
          ...(ifscCode && { ifscCode }),
          ...(accountNumber && { accountNumber }),
          ...(active !== undefined && { active }),
        },
      });
    });

    return jsonResponse(bankDetail);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const existing = await prisma.bankDetail.findUnique({ where: { id } });
    if (!existing) return errorResponse("Bank detail not found", 404);

    await prisma.bankDetail.delete({ where: { id } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
