import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const allItems = await prisma.item.findMany({
      select: { code: true },
    });

    let maxNum = 0;
    for (const { code } of allItems) {
      const match = code.match(/(\d+)$/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    }

    const code = (maxNum + 1).toString().padStart(4, "0");
    return jsonResponse({ code });
  });
}
