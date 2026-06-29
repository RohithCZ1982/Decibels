import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse, clampLimit } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = clampLimit(parseInt(searchParams.get("limit") || "50"));

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { quotations: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return jsonResponse({ customers, total, page, totalPages: Math.ceil(total / limit) });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, mobile, email, address, notes } = body;

    if (!name || !mobile) return errorResponse("Name and mobile are required");

    const customer = await prisma.customer.create({
      data: { name, mobile, email, address, notes },
    });
    return jsonResponse(customer, 201);
  });
}
