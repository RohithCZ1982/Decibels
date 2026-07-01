import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse, clampLimit, isValidEmail, isValidMobile, isValidGSTNumber } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = clampLimit(parseInt(searchParams.get("limit") || "50"));

    const where = {
      type: "DEALER" as const,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { mobile: { contains: search } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [dealers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { _count: { select: { quotations: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return jsonResponse({ dealers, total, page, totalPages: Math.ceil(total / limit) });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, mobile, email, address, gstNumber, notes } = body;

    if (!name || !mobile) return errorResponse("Name and mobile are required");
    if (!isValidMobile(mobile)) return errorResponse("Enter a valid 10-digit mobile number");
    if (email && !isValidEmail(email)) return errorResponse("Enter a valid email address");
    if (gstNumber && !isValidGSTNumber(gstNumber)) return errorResponse("Enter a valid 15-character GST number");

    const dealer = await prisma.customer.create({
      data: { name, mobile, email, address, gstNumber, notes, type: "DEALER" },
    });
    return jsonResponse(dealer, 201);
  });
}
