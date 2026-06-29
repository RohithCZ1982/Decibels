import { NextResponse } from "next/server";
import { getSession, SessionUser } from "./auth";
import { Role } from "@/generated/prisma/client";

export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  handler: (session: SessionUser) => Promise<NextResponse>,
  requiredRole?: Role
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return errorResponse("Unauthorized", 401);
    if (requiredRole && session.role !== requiredRole) {
      return errorResponse("Forbidden", 403);
    }
    return await handler(session);
  } catch (error) {
    console.error("API error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export { generateQuotationNumber } from "./quotation-calc";

export function clampLimit(limit: number, max = 100): number {
  return Math.max(1, Math.min(limit, max));
}

export function isValidNumber(value: unknown): boolean {
  if (value == null || value === "") return false;
  const n = Number(value);
  return !isNaN(n) && isFinite(n);
}

export function isValidPositiveNumber(value: unknown): boolean {
  return isValidNumber(value) && Number(value) > 0;
}

export function isValidDate(value: unknown): boolean {
  if (!value || value === "") return false;
  const d = new Date(String(value));
  return !isNaN(d.getTime());
}

export function validateEnum<T extends string>(
  value: unknown,
  validValues: readonly T[]
): value is T {
  return typeof value === "string" && (validValues as readonly string[]).includes(value);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
