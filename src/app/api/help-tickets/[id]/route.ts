import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";
import { HelpTicketStatus } from "@/generated/prisma/client";

const VALID_STATUSES: HelpTicketStatus[] = ["NEW", "FIXED", "TESTED", "CLOSED"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params;
    const { status } = await request.json();
    if (!VALID_STATUSES.includes(status)) {
      return errorResponse("Invalid status");
    }
    const ticket = await prisma.helpTicket.update({
      where: { id },
      data: { status },
      include: { createdBy: { select: { name: true } } },
    });
    return jsonResponse(ticket);
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async () => {
    const { id } = await params;
    await prisma.helpTicket.delete({ where: { id } });
    return jsonResponse({ success: true });
  });
}
