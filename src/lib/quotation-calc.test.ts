import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateQuotationTotals, generateQuotationNumber, EDITABLE_STATUSES, INVOICE_STATUSES } from "./quotation-calc";

describe("calculateQuotationTotals", () => {
  it("returns zeroed totals for an empty item list", () => {
    const result = calculateQuotationTotals({ items: [], discount: 0, includeGst: true });
    expect(result).toEqual({
      subtotal: 0,
      discount: 0,
      gstAmount: 0,
      roundOff: 0,
      grandTotal: 0,
      gstBreakdown: [],
    });
  });

  it("computes subtotal as quantity times unit price for a single item with no discount or gst", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 2, unitPrice: 500, gstRate: 18 }],
      discount: 0,
      includeGst: false,
    });
    expect(result.subtotal).toBe(1000);
    expect(result.gstAmount).toBe(0);
    expect(result.grandTotal).toBe(1000);
  });

  it("applies per-line discount percentage before summing the subtotal", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 1000, discount: 10, gstRate: 18 }],
      discount: 0,
      includeGst: false,
    });
    // 1000 * (1 - 10/100) = 900
    expect(result.subtotal).toBe(900);
  });

  it("subtracts the overall quotation discount from the grand total", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 1000, gstRate: 0 }],
      discount: 100,
      includeGst: false,
    });
    expect(result.subtotal).toBe(1000);
    expect(result.discount).toBe(100);
    expect(result.grandTotal).toBe(900);
  });

  it("calculates and rounds gst per rate group when includeGst is true", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 100, gstRate: 18 }],
      discount: 0,
      includeGst: true,
    });
    // 100 * 18% = 18 exactly
    expect(result.gstAmount).toBe(18);
    expect(result.gstBreakdown).toEqual([{ rate: 18, taxable: 100, gst: 18 }]);
    expect(result.grandTotal).toBe(118);
  });

  it("rounds the summed gst amount to the nearest whole number", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 100.5, gstRate: 18 }],
      discount: 0,
      includeGst: true,
    });
    // 100.5 * 0.18 = 18.09 -> rounds to 18
    expect(result.gstAmount).toBe(18);
  });

  it("does not apply gst when includeGst is false, even with a nonzero gstRate", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 100, gstRate: 18 }],
      discount: 0,
      includeGst: false,
    });
    expect(result.gstAmount).toBe(0);
    expect(result.gstBreakdown).toEqual([{ rate: 18, taxable: 100, gst: 0 }]);
  });

  it("groups items by gst rate and sorts the breakdown ascending by rate", () => {
    const result = calculateQuotationTotals({
      items: [
        { quantity: 1, unitPrice: 100, gstRate: 28 },
        { quantity: 1, unitPrice: 200, gstRate: 5 },
        { quantity: 1, unitPrice: 50, gstRate: 28 },
      ],
      discount: 0,
      includeGst: true,
    });
    expect(result.gstBreakdown.map((b) => b.rate)).toEqual([5, 28]);
    const rate28 = result.gstBreakdown.find((b) => b.rate === 28);
    expect(rate28?.taxable).toBe(150);
  });

  it("excludes items with a non-positive unit price from the gst breakdown", () => {
    const result = calculateQuotationTotals({
      items: [
        { quantity: 1, unitPrice: 0, gstRate: 18 },
        { quantity: 1, unitPrice: 100, gstRate: 18 },
      ],
      discount: 0,
      includeGst: true,
    });
    expect(result.gstBreakdown).toEqual([{ rate: 18, taxable: 100, gst: 18 }]);
  });

  it("rounds the pre-round total to the nearest 100 when roundOff is enabled", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 1050, gstRate: 0 }],
      discount: 0,
      includeGst: false,
      roundOff: true,
    });
    // preRoundTotal = 1050 -> rounds to 1100, roundOff = +50
    expect(result.roundOff).toBe(50);
    expect(result.grandTotal).toBe(1100);
  });

  it("supports a negative roundOff adjustment", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 1040, gstRate: 0 }],
      discount: 0,
      includeGst: false,
      roundOff: true,
    });
    // preRoundTotal = 1040 -> rounds to 1000, roundOff = -40
    expect(result.roundOff).toBe(-40);
    expect(result.grandTotal).toBe(1000);
  });

  it("leaves roundOff at 0 when roundOff is not requested", () => {
    const result = calculateQuotationTotals({
      items: [{ quantity: 1, unitPrice: 1050, gstRate: 0 }],
      discount: 0,
      includeGst: false,
    });
    expect(result.roundOff).toBe(0);
    expect(result.grandTotal).toBe(1050);
  });

  it("combines multiple items, per-line discounts, overall discount, gst, and round-off together", () => {
    const result = calculateQuotationTotals({
      items: [
        { quantity: 2, unitPrice: 500, discount: 10, gstRate: 18 }, // 900
        { quantity: 1, unitPrice: 300, gstRate: 5 }, // 300
      ],
      discount: 50,
      includeGst: true,
      roundOff: true,
    });
    // subtotal = 900 + 300 = 1200
    expect(result.subtotal).toBe(1200);
    // gst: 900*0.18=162, 300*0.05=15 -> 177
    expect(result.gstAmount).toBe(177);
    // preRoundTotal = 1200 + 177 - 50 = 1327 -> rounds to 1300, roundOff = -27
    expect(result.roundOff).toBe(-27);
    expect(result.grandTotal).toBe(1300);
  });
});

describe("generateQuotationNumber", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats as DEC-YYMM-XXXX", () => {
    vi.setSystemTime(new Date("2026-03-15T00:00:00Z"));
    const number = generateQuotationNumber();
    expect(number).toMatch(/^DEC-\d{4}-\d{4}$/);
    expect(number.startsWith("DEC-2603-")).toBe(true);
  });

  it("pads a single-digit month with a leading zero", () => {
    vi.setSystemTime(new Date("2026-01-05T00:00:00Z"));
    const number = generateQuotationNumber();
    expect(number.startsWith("DEC-2601-")).toBe(true);
  });

  it("pads the random suffix to 4 digits", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.00001);
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    const number = generateQuotationNumber();
    expect(number).toBe("DEC-2606-0000");
  });
});

describe("status constants", () => {
  it("defines the editable statuses used to gate quotation edits", () => {
    expect(EDITABLE_STATUSES).toEqual(["DRAFT", "SENT", "APPROVED", "IN_PRODUCTION"]);
  });

  it("defines the invoice-eligible statuses", () => {
    expect(INVOICE_STATUSES).toEqual(["APPROVED", "IN_PRODUCTION", "COMPLETED", "CLOSED"]);
  });
});
