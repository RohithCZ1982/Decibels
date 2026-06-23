export const EDITABLE_STATUSES = ["DRAFT", "SENT", "APPROVED", "IN_PRODUCTION"];
export const INVOICE_STATUSES = ["APPROVED", "IN_PRODUCTION", "COMPLETED", "CLOSED"];

interface CalcItem {
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

interface CalcInput {
  items: CalcItem[];
  discount: number;
  includeGst: boolean;
  roundOff?: boolean;
}

export interface CalcResult {
  subtotal: number;
  discount: number;
  gstAmount: number;
  roundOff: number;
  grandTotal: number;
  gstBreakdown: { rate: number; taxable: number; gst: number }[];
}

export function calculateQuotationTotals(input: CalcInput): CalcResult {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const disc = input.discount;

  const rateMap = new Map<number, number>();
  for (const item of input.items) {
    if (item.unitPrice <= 0) continue;
    const lineTotal = item.quantity * item.unitPrice;
    rateMap.set(item.gstRate, (rateMap.get(item.gstRate) || 0) + lineTotal);
  }

  const gstBreakdown: { rate: number; taxable: number; gst: number }[] = [];
  let gstAmount = 0;
  for (const [rate, total] of rateMap) {
    const gst = input.includeGst ? (total * rate) / 100 : 0;
    gstBreakdown.push({ rate, taxable: total, gst });
    gstAmount += gst;
  }
  gstBreakdown.sort((a, b) => a.rate - b.rate);

  if (input.includeGst) {
    gstAmount = Math.round(gstAmount);
  }

  let preRoundTotal = subtotal + gstAmount - disc;
  let roundOff = 0;

  if (input.roundOff) {
    const rounded = Math.round(preRoundTotal / 100) * 100;
    roundOff = rounded - preRoundTotal;
  }

  const grandTotal = preRoundTotal + roundOff;

  return { subtotal, discount: disc, gstAmount, roundOff, grandTotal, gstBreakdown };
}

export function generateQuotationNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `DEC-${year}${month}-${random}`;
}
