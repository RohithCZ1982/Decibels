import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, hsnCode, order } = body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(hsnCode !== undefined && { hsnCode: hsnCode || null }),
        ...(order !== undefined && { order }),
      },
    });
    return jsonResponse(category);
  }, "ADMIN");
}
