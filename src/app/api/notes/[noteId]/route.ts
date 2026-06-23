import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  return withAuth(async () => {
    const { noteId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) return errorResponse("Content is required");

    const existing = await prisma.projectNote.findUnique({ where: { id: noteId } });
    if (!existing) return errorResponse("Note not found", 404);

    const note = await prisma.projectNote.update({
      where: { id: noteId },
      data: { content },
      include: { createdBy: { select: { name: true } } },
    });

    return jsonResponse(note);
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ noteId: string }> }) {
  return withAuth(async () => {
    const { noteId } = await params;

    const existing = await prisma.projectNote.findUnique({ where: { id: noteId } });
    if (!existing) return errorResponse("Note not found", 404);

    await prisma.projectNote.delete({ where: { id: noteId } });

    return jsonResponse({ success: true });
  });
}
