import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const item = await prisma.item.findUnique({ where: { id }, include: { category: true } });
    if (!item) return errorResponse("Item not found", 404);
    return jsonResponse(item);
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { code, name, categoryId, unitPrice, description, supplier, stock, imageUrl, active } = body;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return errorResponse("Item not found", 404);

    if (code && code !== existing.code) {
      const duplicate = await prisma.item.findUnique({ where: { code } });
      if (duplicate) return errorResponse("Item code already exists");
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(categoryId && { categoryId }),
        ...(unitPrice != null && { unitPrice: parseFloat(unitPrice) }),
        ...(description !== undefined && { description }),
        ...(supplier !== undefined && { supplier }),
        ...(stock !== undefined && { stock: stock ? parseInt(stock) : null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(active !== undefined && { active }),
      },
      include: { category: true },
    });
    return jsonResponse(item);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    await prisma.item.update({ where: { id }, data: { active: false } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
