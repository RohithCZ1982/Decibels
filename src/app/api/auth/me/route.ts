import { getSession } from "@/lib/auth";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  if (!session) return errorResponse("Unauthorized", 401);
  return jsonResponse({ user: session });
}
