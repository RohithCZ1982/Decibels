import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const template = await prisma.template.findUnique({
      where: { id },
      include: { items: { include: { item: { include: { category: true } } } } },
    });
    if (!template) return errorResponse("Template not found", 404);
    return jsonResponse(template);
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, description, items } = body;

    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) return errorResponse("Template not found", 404);

    await prisma.templateItem.deleteMany({ where: { templateId: id } });

    const template = await prisma.template.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        items: {
          create: (items || []).map((i: { itemId: string; quantity: number }) => ({
            itemId: i.itemId,
            quantity: i.quantity || 1,
          })),
        },
      },
      include: { items: { include: { item: { include: { category: true } } } } },
    });
    return jsonResponse(template);
  }, "ADMIN");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) return errorResponse("Template not found", 404);
    await prisma.template.update({ where: { id }, data: { active: false } });
    return jsonResponse({ success: true });
  }, "ADMIN");
}
