import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (session) => {
    const { id } = await params;
    const body = await request.json();
    const { content, imageUrl } = body;

    if (!content) return errorResponse("Content is required");

    const note = await prisma.projectNote.create({
      data: {
        content,
        imageUrl,
        quotationId: id,
        createdById: session.id,
      },
      include: { createdBy: { select: { name: true } } },
    });

    return jsonResponse(note, 201);
  });
}
