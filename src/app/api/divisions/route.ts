import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const divisions = await prisma.division.findMany({
      orderBy: { name: "asc" },
    });
    return jsonResponse(divisions);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, slug, order } = body;
    if (!name || !slug) return errorResponse("Name and slug are required");

    const existing = await prisma.division.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) return errorResponse("Division name or slug already exists");

    const division = await prisma.division.create({
      data: { name, slug: slug.toUpperCase().replace(/\s+/g, "_"), order: order ?? 0 },
    });
    return jsonResponse(division, 201);
  }, "ADMIN");
}
