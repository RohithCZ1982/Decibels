import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, createToken } from "@/lib/auth";
import { errorResponse } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse("Email and password are required");
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    const token = createToken(user);

    const response = NextResponse.json({ user, token });
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Internal server error", 500);
  }
}
