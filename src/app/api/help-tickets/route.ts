import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const tickets = await prisma.helpTicket.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: [{ createdAt: "asc" }],
    });
    return jsonResponse(tickets);
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    const { description } = await request.json();
    if (!description?.trim()) {
      return errorResponse("Description is required");
    }
    const ticket = await prisma.helpTicket.create({
      data: {
        description: description.trim(),
        createdById: session.id,
      },
      include: { createdBy: { select: { name: true } } },
    });
    return jsonResponse(ticket, 201);
  });
}
