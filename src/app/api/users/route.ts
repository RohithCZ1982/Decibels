import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { withAuth, jsonResponse, errorResponse, validateEnum } from "@/lib/api-helpers";
import { Role } from "@/generated/prisma/client";

export async function GET() {
  return withAuth(async () => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(users);
  }, "ADMIN");
}

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return errorResponse("Name, email, and password are required");
    }
    if (role && !validateEnum(role, Object.values(Role))) {
      return errorResponse("Invalid role. Must be ADMIN or STAFF");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return errorResponse("Email already exists");

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || "STAFF" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return jsonResponse(user, 201);
  }, "ADMIN");
}
