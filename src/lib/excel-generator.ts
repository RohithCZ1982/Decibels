"use client";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface QuotationData {
  quotationNumber: string;
  title?: string | null;
  status?: string;
  billDate?: string | null;
  createdAt: string;
  validUntil: string | null;
  subtotal: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;
  roundOff?: number;
  includeGst?: boolean;
  notes: string | null;
  terms: string | null;
  template?: { name: string } | null;
  createdBy?: { name: string };
  customer: {
    name: string;
    mobile: string;
    email: string | null;
    address: string | null;
    gstNumber?: string | null;
  };
  items: Array<{
    name: string;
    description?: string | null;
    hsnCode?: string | null;
    quantity: number;
    unit?: string;
    unitPrice: number;
    discount?: number;
    gstRate?: number;
    total: number;
    divisionId?: string;
    division?: { id: string; name: string; slug: string; order: number };
    notes: string | null;
    item?: { code: string; description?: string | null; category: { name: string } } | null;
  }>;
  payments?: Array<{
    amount: number;
    date: string;
    mode: string;
    transactionId: string | null;
    notes: string | null;
    recordedBy?: { name: string };
  }>;
}

interface BankDetailData {
  name: string;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
}

const PINK = "C8323C";
const PINK_LIGHT = "E1646E";
const BLACK = "1E1E1E";
const CREAM = "F8F8F5";
const CREAM_DARK = "F0F0EB";
const WHITE = "FFFFFF";

const INVOICE_STATUSES = ["APPROVED", "IN_PRODUCTION", "COMPLETED", "CLOSED"];

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function applyBorder(cell: ExcelJS.Cell, color = "B4B4B4") {
  const side: ExcelJS.Border = { style: "thin", color: { argb: color } };
  cell.border = { top: side, bottom: side, left: side, right: side };
}

function headerFont(size = 10, color = WHITE): Partial<ExcelJS.Font> {
  return { bold: true, size, color: { argb: color }, name: "Calibri" };
}

function normalFont(size = 10, color = BLACK): Partial<ExcelJS.Font> {
  return { size, color: { argb: color }, name: "Calibri" };
}

function boldFont(size = 10, color = BLACK): Partial<ExcelJS.Font> {
  return { bold: true, size, color: { argb: color }, name: "Calibri" };
}

function fillBg(color: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

async function loadImageBase64(src: string): Promise<string> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1] || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

export async function generateQuotationExcel(data: QuotationData, bankDetail?: BankDetailData | null) {
  const wb = new ExcelJS.Workbook();
  const isInvoice = data.status && INVOICE_STATUSES.includes(data.status);

  const [logoB64, badgeB64] = await Promise.all([
    loadImageBase64("/logo.png"),
    loadImageBase64("/25years.png"),
  ]);

  buildQuotationSheet(wb, data, !!isInvoice, logoB64, badgeB64, bankDetail);

  if (data.payments && data.payments.length > 0) {
    buildPaymentsSheet(wb, data);
  }

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${data.quotationNumber}.xlsx`);
}

function buildQuotationSheet(wb: ExcelJS.Workbook, q: QuotationData, isInvoice: boolean, logoB64: string, badgeB64: string, bankDetail?: BankDetailData | null) {
  const ws = wb.addWorksheet("Quotation");

  ws.columns = [
    { width: 5 },   // A - Sl
    { width: 35 },  // B - Product
    { width: 14 },  // C - HSN
    { width: 8 },   // D - Qty
    { width: 8 },   // E - Unit
    { width: 14 },  // F - Rate
    { width: 10 },  // G - Disc
    { width: 16 },  // H - Amount
  ];

  const hasDiscount = q.items.some((item) => (item.discount || 0) > 0);
  const lastCol = hasDiscount ? 8 : 7;
  let row = 1;

  // --- COMPANY HEADER WITH IMAGES ---
  ws.mergeCells(row, 1, row + 2, lastCol);
  ws.getRow(row).height = 20;
  ws.getRow(row + 1).height = 14;
  ws.getRow(row + 2).height = 14;

  if (logoB64) {
    const logoId = wb.addImage({ base64: logoB64, extension: "png" });
    ws.addImage(logoId, {
      tl: { col: 0, row: 0 },
      ext: { width: 200, height: 38 },
    });
  }

  if (badgeB64) {
    const badgeId = wb.addImage({ base64: badgeB64, extension: "png" });
    ws.addImage(badgeId, {
      tl: { col: lastCol - 2, row: 0 },
      ext: { width: 75, height: 75 },
    });
  }

  row = 4;

  // Address info below logo
  ws.mergeCells(row, 1, row, lastCol);
  const addrCell = ws.getCell(row, 1);
  addrCell.value = "#277/A, Hebbal Industrial Area, Mysuru – 570 027 | Ph: 08212331331 | Mobile: 9972449311";
  addrCell.font = normalFont(8, "666666");
  row++;

  ws.mergeCells(row, 1, row, lastCol);
  const addr2Cell = ws.getCell(row, 1);
  addr2Cell.value = "mani@decibelsaudio.com | www.decibelsaudio.com";
  addr2Cell.font = normalFont(8, "666666");
  row += 2;

  // --- TITLE BAR ---
  ws.mergeCells(row, 1, row, lastCol);
  const titleCell = ws.getCell(row, 1);
  titleCell.value = isInvoice ? "TAX INVOICE" : "STATEMENT OF QUOTATION";
  titleCell.font = headerFont(12);
  titleCell.fill = fillBg(PINK);
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(row).height = 22;
  row += 2;

  // --- REF / DATE ROW ---
  const infoItems: [string, string][] = [
    ["Ref #", q.quotationNumber],
    ["Date", formatDate(q.billDate || q.createdAt)],
  ];
  if (!isInvoice && q.validUntil) infoItems.push(["Valid Until", formatDate(q.validUntil)]);

  let infoCol = 1;
  for (const [label, value] of infoItems) {
    const c = ws.getCell(row, infoCol);
    c.value = `${label}: ${value}`;
    c.font = boldFont(10);
    c.fill = fillBg(CREAM);
    applyBorder(c);
    infoCol += 2;
  }
  row += 2;

  // --- CUSTOMER DETAILS ---
  const custFields: [string, string][] = [
    ["Customer", q.customer.name],
    ["Mobile", q.customer.mobile],
  ];
  if (q.customer.email) custFields.push(["Email", q.customer.email]);
  if (q.customer.address) custFields.push(["Address", q.customer.address]);
  if (q.customer.gstNumber) custFields.push(["GSTIN", q.customer.gstNumber]);

  for (const [label, value] of custFields) {
    const lc = ws.getCell(row, 1);
    lc.value = label;
    lc.font = boldFont(9, "787878");
    lc.fill = fillBg(CREAM);
    applyBorder(lc);

    ws.mergeCells(row, 2, row, lastCol);
    const vc = ws.getCell(row, 2);
    vc.value = value;
    vc.font = label === "Customer" ? boldFont(10) : normalFont(9);
    applyBorder(vc);
    row++;
  }
  row++;

  // --- QUOTATION TITLE ---
  const qtTitle = q.title
    ? `Decibels Home Theater ${q.title}`
    : q.template
      ? `Decibels Home Theater ${q.template.name}`
      : "Decibels Home Theater Quotation";
  ws.mergeCells(row, 1, row, lastCol);
  const qtCell = ws.getCell(row, 1);
  qtCell.value = qtTitle;
  qtCell.font = boldFont(11, PINK);
  qtCell.fill = fillBg(CREAM);
  qtCell.alignment = { horizontal: "center", vertical: "middle" };
  applyBorder(qtCell);
  ws.getRow(row).height = 20;
  row += 2;

  // --- ITEMS TABLE ---
  const divGroups = new Map<string, { name: string; order: number; items: typeof q.items }>();
  for (const item of q.items) {
    const divId = item.division?.id || item.divisionId || "unknown";
    if (!divGroups.has(divId)) divGroups.set(divId, { name: item.division?.name || "Unknown", order: item.division?.order ?? 0, items: [] });
    divGroups.get(divId)!.items.push(item);
  }
  const activeDivs = Array.from(divGroups.entries()).sort((a, b) => a[1].order - b[1].order);

  // Table header
  const headers = ["Sl", "Product Description", "HSN", "Qty", "Unit", "Rate (₹)"];
  if (hasDiscount) headers.push("Disc %");
  headers.push("Amount (₹)");

  for (let i = 0; i < headers.length; i++) {
    const c = ws.getCell(row, i + 1);
    c.value = headers[i];
    c.font = headerFont(9);
    c.fill = fillBg(PINK);
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(c, PINK);
  }
  ws.getRow(row).height = 20;
  row++;

  let sl = 1;
  for (const [, divGroup] of activeDivs) {
    const divItems = divGroup.items;

    // Division header
    if (activeDivs.length > 1) {
      ws.mergeCells(row, 1, row, lastCol);
      const dc = ws.getCell(row, 1);
      dc.value = divGroup.name;
      dc.font = headerFont(10);
      dc.fill = fillBg(PINK_LIGHT);
      dc.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(row).height = 20;
      row++;
    }

    // Group by category
    const catOrder: string[] = [];
    const catMap = new Map<string, typeof q.items>();
    for (const item of divItems) {
      const cat = item.item?.category?.name || "Other";
      if (!catMap.has(cat)) { catMap.set(cat, []); catOrder.push(cat); }
      catMap.get(cat)!.push(item);
    }

    for (const catName of catOrder) {
      const catItems = catMap.get(catName)!;
      const catTotal = catItems.reduce((s, i) => s + i.total, 0);

      // Category header
      if (catName !== "Other") {
        ws.mergeCells(row, 1, row, lastCol);
        const cc = ws.getCell(row, 1);
        cc.value = catName;
        cc.font = boldFont(9, PINK);
        cc.fill = fillBg(CREAM);
        applyBorder(cc);
        row++;
      }

      // Items
      for (const item of catItems) {
        const desc = item.description || item.item?.description || item.notes || "";
        const displayName = desc ? `${item.name}\n\n${desc}` : item.name;
        const discPct = item.discount || 0;

        const vals: (string | number)[] = [
          sl,
          displayName,
          item.hsnCode || "",
          item.quantity,
          item.unit || "No",
          formatINR(item.unitPrice),
        ];
        if (hasDiscount) vals.push(discPct > 0 ? `${discPct}%` : "");
        vals.push(formatINR(item.total));

        for (let i = 0; i < vals.length; i++) {
          const c = ws.getCell(row, i + 1);
          c.value = vals[i];
          c.font = i === 1
            ? { name: "Calibri", size: 9, color: { argb: BLACK }, bold: false }
            : normalFont(9);
          c.alignment = {
            horizontal: [0, 2, 3, 4].includes(i) ? "center" : [5, 6, 7].includes(i) ? "right" : "left",
            vertical: "middle",
            wrapText: i === 1,
          };
          applyBorder(c);
        }

        // Bold the item name part (first line)
        if (desc) {
          const nameCell = ws.getCell(row, 2);
          nameCell.value = {
            richText: [
              { text: item.name + "\n\n", font: { bold: true, size: 9, name: "Calibri", color: { argb: BLACK } } },
              { text: desc, font: { size: 8, name: "Calibri", color: { argb: "666666" } } },
            ],
          };
        } else {
          const nameCell = ws.getCell(row, 2);
          nameCell.font = boldFont(9);
        }

        sl++;
        row++;
      }

      // Category subtotal
      ws.mergeCells(row, 1, row, lastCol - 1);
      const stLbl = ws.getCell(row, 1);
      stLbl.value = "";
      stLbl.fill = fillBg(CREAM_DARK);
      applyBorder(stLbl);

      const stVal = ws.getCell(row, lastCol);
      stVal.value = formatINR(catTotal);
      stVal.font = boldFont(9, PINK);
      stVal.fill = fillBg(CREAM_DARK);
      stVal.alignment = { horizontal: "right" };
      applyBorder(stVal);
      row++;
    }

    // Division subtotal
    if (activeDivs.length > 1) {
      const divTotal = divItems.reduce((s, i) => s + i.total, 0);
      ws.mergeCells(row, 1, row, lastCol - 1);
      const dstLbl = ws.getCell(row, 1);
      dstLbl.value = `${divGroup.name} Total`;
      dstLbl.font = boldFont(10, PINK);
      dstLbl.fill = fillBg("E6E6E1");
      applyBorder(dstLbl);

      const dstVal = ws.getCell(row, lastCol);
      dstVal.value = formatINR(divTotal);
      dstVal.font = boldFont(10, PINK);
      dstVal.fill = fillBg("E6E6E1");
      dstVal.alignment = { horizontal: "right" };
      applyBorder(dstVal);
      row++;
    }
  }

  row++;

  // --- FINANCIAL SUMMARY ---
  const sumCol = lastCol - 2;
  const summaryLines: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Subtotal", value: formatINR(q.subtotal) },
  ];

  if (q.includeGst !== false) {
    const gstMap = new Map<number, number>();
    for (const item of q.items) {
      const rate = item.gstRate ?? 18;
      gstMap.set(rate, (gstMap.get(rate) || 0) + (item.total * rate) / 100);
    }
    for (const [rate, amt] of Array.from(gstMap.entries()).sort((a, b) => a[0] - b[0])) {
      summaryLines.push({ label: `GST @${rate}%`, value: formatINR(Math.round(amt)) });
    }
  }
  if (q.discount > 0) summaryLines.push({ label: "Discount", value: "- " + formatINR(q.discount) });
  if (q.roundOff && q.roundOff !== 0) summaryLines.push({ label: "Round Off", value: (q.roundOff > 0 ? "+ " : "") + formatINR(q.roundOff) });
  summaryLines.push({ label: "Grand Total", value: formatINR(q.grandTotal), highlight: true });

  for (const line of summaryLines) {
    const lc = ws.getCell(row, sumCol);
    ws.mergeCells(row, sumCol, row, lastCol - 1);
    lc.value = line.label;
    lc.font = line.highlight ? headerFont(11) : boldFont(9, "787878");
    lc.fill = fillBg(line.highlight ? PINK : CREAM);
    lc.alignment = { horizontal: "left", vertical: "middle" };
    applyBorder(lc);

    const vc = ws.getCell(row, lastCol);
    vc.value = line.value;
    vc.font = line.highlight ? headerFont(11) : normalFont(10);
    vc.fill = fillBg(line.highlight ? PINK : WHITE);
    vc.alignment = { horizontal: "right", vertical: "middle" };
    applyBorder(vc);

    if (line.highlight) ws.getRow(row).height = 22;
    row++;
  }

  row++;

  // --- BANK DETAILS ---
  if (bankDetail) {
    ws.mergeCells(row, 1, row, lastCol);
    const bc = ws.getCell(row, 1);
    bc.value = "Bank Details:";
    bc.font = boldFont(9, PINK);
    row++;

    const bankLines: [string, string][] = [
      ["Name", bankDetail.name],
      ["Bank", bankDetail.bankName],
      ["IFSC Code", bankDetail.ifscCode],
      ["Account Number", bankDetail.accountNumber],
    ];
    for (const [label, value] of bankLines) {
      const lc = ws.getCell(row, 1);
      lc.value = label;
      lc.font = boldFont(9, "787878");
      ws.mergeCells(row, 2, row, lastCol);
      const vc = ws.getCell(row, 2);
      vc.value = value;
      vc.font = normalFont(9);
      row++;
    }
    row++;
  }

  // --- NOTES ---
  if (q.notes) {
    ws.mergeCells(row, 1, row, lastCol);
    const nc = ws.getCell(row, 1);
    nc.value = "Notes:";
    nc.font = boldFont(9, PINK);
    row++;
    ws.mergeCells(row, 1, row, lastCol);
    const nv = ws.getCell(row, 1);
    nv.value = q.notes;
    nv.font = { italic: true, size: 9, name: "Calibri", color: { argb: BLACK } };
    nv.alignment = { wrapText: true };
    row++;
  }

  // GST note
  row++;
  ws.mergeCells(row, 1, row, lastCol);
  const gstNote = ws.getCell(row, 1);
  gstNote.value = q.includeGst !== false ? "GST included as detailed above." : "GST Not Applicable.";
  gstNote.font = normalFont(8, "666666");
}

function buildPaymentsSheet(wb: ExcelJS.Workbook, q: QuotationData) {
  const ws = wb.addWorksheet("Payments");
  const payments = q.payments || [];

  ws.columns = [
    { width: 5 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 20 },
    { width: 24 },
    { width: 18 },
  ];

  let row = 1;

  // Title
  ws.mergeCells(row, 1, row, 7);
  const tc = ws.getCell(row, 1);
  tc.value = "PAYMENTS";
  tc.font = boldFont(14, PINK);
  row++;

  ws.mergeCells(row, 1, row, 7);
  const rc = ws.getCell(row, 1);
  rc.value = `Ref: ${q.quotationNumber}  |  Customer: ${q.customer.name}`;
  rc.font = normalFont(9, "666666");
  row += 2;

  // Summary bar
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = q.grandTotal - totalPaid;

  const sumLabels = [
    [`Grand Total: ${formatINR(q.grandTotal)}`, BLACK],
    [`Total Paid: ${formatINR(totalPaid)}`, "008000"],
    [`Balance: ${formatINR(balance)}`, balance > 0 ? PINK : "008000"],
  ];
  for (let i = 0; i < sumLabels.length; i++) {
    const c = ws.getCell(row, 1 + i * 2);
    ws.mergeCells(row, 1 + i * 2, row, 2 + i * 2);
    c.value = sumLabels[i][0];
    c.font = boldFont(10, sumLabels[i][1]);
    c.fill = fillBg(CREAM);
    applyBorder(c);
  }
  row += 2;

  // Table header
  const headers = ["#", "Date", "Amount", "Mode", "Transaction ID", "Notes", "Recorded By"];
  for (let i = 0; i < headers.length; i++) {
    const c = ws.getCell(row, i + 1);
    c.value = headers[i];
    c.font = headerFont(9);
    c.fill = fillBg(PINK);
    c.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(c, PINK);
  }
  ws.getRow(row).height = 20;
  row++;

  // Payment rows
  for (let i = 0; i < payments.length; i++) {
    const p = payments[i];
    const vals = [
      i + 1,
      formatDate(p.date),
      formatINR(p.amount),
      p.mode.replace(/_/g, " "),
      p.transactionId || "—",
      p.notes || "—",
      p.recordedBy?.name || "—",
    ];
    for (let j = 0; j < vals.length; j++) {
      const c = ws.getCell(row, j + 1);
      c.value = vals[j];
      c.font = normalFont(9);
      c.alignment = { horizontal: j === 2 ? "right" : j === 0 ? "center" : "left", vertical: "middle" };
      applyBorder(c);
    }
    row++;
  }

  // Total row
  ws.mergeCells(row, 1, row, 2);
  const ftLbl = ws.getCell(row, 1);
  ftLbl.value = "Total";
  ftLbl.font = boldFont(10);
  ftLbl.fill = fillBg(CREAM);
  applyBorder(ftLbl);

  const ftVal = ws.getCell(row, 3);
  ftVal.value = formatINR(totalPaid);
  ftVal.font = boldFont(10);
  ftVal.fill = fillBg(CREAM);
  ftVal.alignment = { horizontal: "right" };
  applyBorder(ftVal);

  for (let j = 4; j <= 7; j++) {
    const c = ws.getCell(row, j);
    c.fill = fillBg(CREAM);
    applyBorder(c);
  }
}
