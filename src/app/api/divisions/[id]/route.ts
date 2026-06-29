import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, order } = body;

    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) return errorResponse("Division not found", 404);

    const division = await prisma.division.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug: slug.toUpperCase().replace(/\s+/g, "_") }),
        ...(order !== undefined && { order }),
      },
    });
    return jsonResponse(division);
  }, "ADMIN");
}
