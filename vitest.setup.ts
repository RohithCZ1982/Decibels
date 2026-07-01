process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-for-vitest-do-not-use-in-production";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
