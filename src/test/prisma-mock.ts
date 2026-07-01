import { vi } from "vitest";

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

export function createMockPrisma() {
  const mock = {
    user: createModelMock(),
    division: createModelMock(),
    category: createModelMock(),
    subCategory: createModelMock(),
    item: createModelMock(),
    template: createModelMock(),
    templateItem: createModelMock(),
    customer: createModelMock(),
    quotation: createModelMock(),
    quotationItem: createModelMock(),
    payment: createModelMock(),
    projectNote: createModelMock(),
    stockTransaction: createModelMock(),
    helpTicket: createModelMock(),
    employee: createModelMock(),
    salary: createModelMock(),
    salaryDeduction: createModelMock(),
    salaryAdvance: createModelMock(),
    bankDetail: createModelMock(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: vi.fn() as any,
  };

  // Mimics real Prisma: accepts either an array of pending operations
  // (Promise.all semantics) or an interactive callback `(tx) => ...`.
  mock.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: typeof mock) => unknown)(mock);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  });

  return mock;
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
