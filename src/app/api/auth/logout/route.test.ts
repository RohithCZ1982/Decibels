import { describe, it, expect } from "vitest";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("clears the auth-token cookie and reports success", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const cookie = res.cookies.get("auth-token");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/");
  });
});
