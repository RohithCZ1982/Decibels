import type { SessionUser } from "@/lib/auth";

export const adminSession: SessionUser = {
  id: "user_admin_1",
  name: "Admin User",
  email: "admin@decibels.audio",
  role: "ADMIN",
};

export const staffSession: SessionUser = {
  id: "user_staff_1",
  name: "Staff User",
  email: "staff@decibels.audio",
  role: "STAFF",
};
