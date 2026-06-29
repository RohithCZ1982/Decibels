import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, hsnCode, order, divisionId } = body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return errorResponse("Category not found", 404);

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(hsnCode !== undefined && { hsnCode: hsnCode || null }),
        ...(order !== undefined && { order }),
        ...(divisionId !== undefined && { divisionId }),
      },
      include: { division: true },
    });
    return jsonResponse(category);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return errorResponse("Category not found", 404);
    await prisma.subCategory.updateMany({ where: { categoryId: id }, data: { deleted: true } });
    await prisma.category.update({ where: { id }, data: { deleted: true } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
