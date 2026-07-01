import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const bankDetail = await prisma.bankDetail.findFirst({ where: { active: true } });
    return jsonResponse(bankDetail);
  });
}
