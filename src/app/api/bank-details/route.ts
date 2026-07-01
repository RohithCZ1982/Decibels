import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async () => {
    const bankDetails = await prisma.bankDetail.findMany({
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(bankDetails);
  }, "ADMIN");
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, bankName, ifscCode, accountNumber, active } = body;

    if (!name || !bankName || !ifscCode || !accountNumber) {
      return errorResponse("Name, bank name, IFSC code, and account number are required");
    }

    const bankDetail = await prisma.$transaction(async (tx) => {
      if (active) {
        await tx.bankDetail.updateMany({ where: { active: true }, data: { active: false } });
      }
      return tx.bankDetail.create({
        data: { name, bankName, ifscCode, accountNumber, active: !!active },
      });
    });

    return jsonResponse(bankDetail, 201);
  }, "ADMIN");
}
