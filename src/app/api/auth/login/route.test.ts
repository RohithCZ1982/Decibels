import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  authenticateUser: vi.fn(),
  createToken: vi.fn(),
}));

import { authenticateUser, createToken } from "@/lib/auth";
import { POST } from "./route";
import { makeJsonRequest, makeRequest } from "@/test/request";

const mockAuthenticateUser = vi.mocked(authenticateUser);
const mockCreateToken = vi.mocked(createToken);

const sessionUser = {
  id: "user_1",
  name: "Admin User",
  email: "admin@decibels.audio",
  role: "ADMIN" as const,
};

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    mockAuthenticateUser.mockReset();
    mockCreateToken.mockReset();
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/auth/login", "POST", { password: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Email and password are required" });
    expect(mockAuthenticateUser).not.toHaveBeenCalled();
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(makeJsonRequest("http://localhost/api/auth/login", "POST", { email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when credentials are invalid", async () => {
    mockAuthenticateUser.mockResolvedValue(null);
    const res = await POST(
      makeJsonRequest("http://localhost/api/auth/login", "POST", { email: "a@b.com", password: "wrong" })
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid email or password" });
  });

  it("sets an httpOnly auth-token cookie and returns the user on success", async () => {
    mockAuthenticateUser.mockResolvedValue(sessionUser);
    mockCreateToken.mockReturnValue("signed.jwt.token");

    const res = await POST(
      makeJsonRequest("http://localhost/api/auth/login", "POST", { email: sessionUser.email, password: "correct" })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: sessionUser });

    const cookie = res.cookies.get("auth-token");
    expect(cookie?.value).toBe("signed.jwt.token");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 7);
    expect(cookie?.path).toBe("/");
  });

  it("returns 500 when the request body is not valid JSON", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest("http://localhost/api/auth/login", { method: "POST", body: "not-json" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
    consoleSpy.mockRestore();
  });
});
