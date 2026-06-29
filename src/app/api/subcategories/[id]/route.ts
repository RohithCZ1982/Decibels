import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, hsnCode } = body;

    const existing = await prisma.subCategory.findUnique({ where: { id } });
    if (!existing) return errorResponse("Subcategory not found", 404);

    const subCategory = await prisma.subCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(hsnCode !== undefined && { hsnCode: hsnCode || null }),
      },
    });
    return jsonResponse(subCategory);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const existing = await prisma.subCategory.findUnique({ where: { id } });
    if (!existing) return errorResponse("Subcategory not found", 404);
    await prisma.subCategory.update({ where: { id }, data: { deleted: true } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
