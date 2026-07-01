import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getSession: vi.fn() };
});

import { getSession } from "@/lib/auth";
import { GET } from "./route";

const mockGetSession = vi.mocked(getSession);

const sessionUser = {
  id: "user_1",
  name: "Staff User",
  email: "staff@decibels.audio",
  role: "STAFF" as const,
};

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the current session user when authenticated", async () => {
    mockGetSession.mockResolvedValue(sessionUser);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: sessionUser });
  });
});
