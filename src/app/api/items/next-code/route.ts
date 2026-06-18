import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const lastItem = await prisma.item.findFirst({
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });

    let nextNum = 1;
    if (lastItem) {
      const match = lastItem.code.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    const code = `ITM-${nextNum.toString().padStart(4, "0")}`;
    return jsonResponse({ code });
  });
}
