"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerPoppins } from "./pdf-fonts";

interface QuotationData {
  quotationNumber: string;
  createdAt: string;
  validUntil: string | null;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  discount: number;
  grandTotal: number;
  roundOff?: number;
  includeGst?: boolean;
  status?: string;
  billDate?: string | null;
  notes: string | null;
  terms: string | null;
  title?: string | null;
  template?: { name: string } | null;
  createdBy?: { name: string };
  customer: {
    name: string;
    mobile: string;
    email: string | null;
    address: string | null;
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
    notes: string | null;
    division?: string;
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

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function loadImage(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = src;
  });
}

const PINK: [number, number, number] = [200, 50, 60];
const BLACK: [number, number, number] = [30, 30, 30];

export async function generateQuotationPDF(quotation: QuotationData) {
  const doc = new jsPDF("p", "mm", "a4");

  const [logoData, badgeData] = await Promise.all([
    loadImage("/logo.png"),
    loadImage("/25years.png"),
  ]);

  await registerPoppins(doc);

  drawQuotationPage(doc, quotation, logoData, badgeData);

  if (quotation.payments && quotation.payments.length > 0) {
    doc.addPage();
    drawPaymentsPage(doc, quotation, logoData, badgeData);
  }

  doc.addPage();
  drawTermsPage(doc);

  window.open(doc.output("bloburl"), "_blank");
}

export async function generateItemListPDF(quotation: QuotationData) {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = 210;
  const ml = 10;
  const re = pw - ml;
  const cw = pw - ml * 2;

  const [logoData, badgeData] = await Promise.all([
    loadImage("/logo.png"),
    loadImage("/25years.png"),
  ]);

  await registerPoppins(doc);
  drawHeader(doc, logoData, badgeData);

  let y = 32;

  // Title
  doc.setFillColor(...PINK);
  doc.rect(ml, y, cw, 8, "F");
  doc.setFontSize(11);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("List of Items", pw / 2, y + 5.5, { align: "center" });
  y += 11;

  // Ref & Customer row
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  const halfW = cw / 2;

  doc.setFillColor(248, 248, 245);
  doc.rect(ml, y, halfW, 7, "FD");
  doc.rect(ml + halfW, y, halfW, 7, "FD");

  doc.setFontSize(7);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("Ref # : ", ml + 2, y + 4.5);
  const refLblW = doc.getTextWidth("Ref # : ");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(quotation.quotationNumber, ml + 2 + refLblW, y + 4.5);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Customer : ", ml + halfW + 2, y + 4.5);
  const custLblW = doc.getTextWidth("Customer : ");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(quotation.customer.name, ml + halfW + 2 + custLblW, y + 4.5);
  y += 10;

  // Items table — Sl, Item, Description, Qty (grouped by division)
  const ilDivLabels: Record<string, string> = { HOME_THEATER: "Home Theater", ACOUSTICS: "Acoustics" };
  const ilDivOrder = ["HOME_THEATER", "ACOUSTICS"];
  const ilDivGroups = new Map<string, typeof quotation.items>();
  for (const item of quotation.items) {
    const div = item.division || "HOME_THEATER";
    if (!ilDivGroups.has(div)) ilDivGroups.set(div, []);
    ilDivGroups.get(div)!.push(item);
  }
  const ilActiveDivs = ilDivOrder.filter((d) => ilDivGroups.has(d));

  const body: string[][] = [];
  const ilRowTypes: ("divHeader" | "item")[] = [];
  let sl = 1;
  for (const div of ilActiveDivs) {
    if (ilActiveDivs.length > 1) {
      body.push(["", ilDivLabels[div] || div, "", ""]);
      ilRowTypes.push("divHeader");
    }
    for (const item of ilDivGroups.get(div)!) {
      const desc = item.description || item.item?.description || item.notes || "";
      body.push([sl.toString(), item.name, desc, item.quantity.toString()]);
      ilRowTypes.push("item");
      sl++;
    }
  }

  autoTable(doc, {
    startY: y,
    head: [["Sl", "Item", "Description", "Qty"]],
    body,
    theme: "grid",
    styles: {
      font: "Poppins",
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      textColor: BLACK,
      lineColor: [180, 180, 180],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [PINK[0], PINK[1], PINK[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 90 },
      3: { cellWidth: 18, halign: "center" },
    },
    margin: { left: ml, right: ml },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const rt = ilRowTypes[data.row.index];
      if (rt === "divHeader") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = [255, 255, 255] as [number, number, number];
        data.cell.styles.fillColor = [PINK[0], PINK[1], PINK[2]] as [number, number, number];
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(8);
  doc.setFont("Poppins", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Total Items: ${quotation.items.length}`, ml, y);

  doc.setFontSize(9);
  doc.setFont("Poppins", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Authorized by", re - 40, y + 10);

  window.open(doc.output("bloburl"), "_blank");
}

function drawHeader(doc: jsPDF, logoData: string, badgeData: string) {
  const ml = 10;
  const re = 200;

  if (logoData) {
    doc.addImage(logoData, "PNG", ml, 6, 55, 10);
  } else {
    doc.setFontSize(18);
    doc.setFont("Poppins", "bolditalic");
    doc.setTextColor(...PINK);
    doc.text("Decibels", ml, 12);
    doc.setFontSize(6);
    doc.setFont("Poppins", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("a u d i o   s y s t e m s", ml, 17);
  }

  doc.setFontSize(7);
  doc.setFont("Poppins", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("#277/A, Hebbal Industrial Area, Mysuru – 570 027,", ml, 20);
  doc.text("Karnataka, INDIA. Ph : 08212331331 Mobile: 9972449311", ml, 23.5);
  doc.text("mani@decibelsaudio.com website: www.decibelsaudio.com", ml, 27);

  if (badgeData) {
    doc.addImage(badgeData, "PNG", re - 22, 4, 22, 22);
  }
}

function drawQuotationPage(
  doc: jsPDF,
  q: QuotationData,
  logoData: string,
  badgeData: string
) {
  const pw = 210;
  const ml = 10;
  const re = pw - ml;
  const cw = pw - ml * 2;

  drawHeader(doc, logoData, badgeData);

  const INVOICE_STATUSES = ["APPROVED", "IN_PRODUCTION", "COMPLETED", "CLOSED"];
  const isInvoice = q.status && INVOICE_STATUSES.includes(q.status);

  let y = 32;

  // --- TITLE BAR ---
  doc.setFillColor(...PINK);
  doc.rect(ml, y, cw, 8, "F");
  doc.setFontSize(11);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(isInvoice ? "Tax Invoice" : "Statement of Quotation", pw / 2, y + 5.5, { align: "center" });
  y += 11;

  // --- REF / DATE / STATUS ROW ---
  const infoCells: { label: string; value: string }[] = [
    { label: "Ref #", value: q.quotationNumber },
    { label: "Date", value: formatDate(q.billDate || q.createdAt) },
  ];
  if (!isInvoice && q.validUntil) {
    infoCells.push({ label: "Valid Until", value: formatDate(q.validUntil) });
  } else if (!isInvoice && q.status) {
    infoCells.push({ label: "Status", value: q.status.replace(/_/g, " ") });
  }
  const cellW = Math.floor(cw / infoCells.length);
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);
  infoCells.forEach((cell, i) => {
    const x = ml + i * cellW;
    const w = i === infoCells.length - 1 ? cw - cellW * i : cellW;
    doc.setFillColor(245, 245, 240);
    doc.rect(x, y, w, 7, "FD");
    doc.setFontSize(7);
    doc.setFont("Poppins", "bold");
    doc.setTextColor(120, 120, 120);
    const lbl = cell.label + " : ";
    doc.text(lbl, x + 2, y + 4.5);
    const lblW = doc.getTextWidth(lbl);
    doc.setFontSize(8.5);
    doc.setFont("Poppins", "bold");
    doc.setTextColor(...BLACK);
    doc.text(cell.value, x + 2 + lblW, y + 4.5);
  });
  y += 10;

  // --- CUSTOMER DETAILS ---
  const custLblW = 28;
  const custValW = cw - custLblW;
  const rh = 6;
  const custFields = [
    { label: "Customer", value: q.customer.name, bold: true },
    { label: "Mobile", value: q.customer.mobile || "" },
    { label: "Email", value: q.customer.email || "" },
    { label: "Address", value: q.customer.address || "" },
  ];
  for (const field of custFields) {
    doc.setFontSize(field.bold ? 9 : 8);
    doc.setFont("Poppins", field.bold ? "bold" : "normal");
    const valLines = doc.splitTextToSize(field.value, custValW - 6);
    const lineH = field.bold ? 4 : 3.8;
    const fieldH = Math.max(rh, valLines.length * lineH + 2.5);

    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.3);
    doc.setFillColor(248, 248, 245);
    doc.rect(ml, y, custLblW, fieldH, "FD");
    doc.rect(ml + custLblW, y, custValW, fieldH, "S");
    doc.setFontSize(7);
    doc.setFont("Poppins", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(field.label, ml + 2, y + 4);
    doc.setFontSize(field.bold ? 9 : 8);
    doc.setFont("Poppins", field.bold ? "bold" : "normal");
    doc.setTextColor(...BLACK);
    doc.text(valLines, ml + custLblW + 3, y + 4);
    y += fieldH;
  }
  y += 4;

  // --- QUOTATION TITLE ---
  const titleText = q.title
    ? `Decibels Home Theater ${q.title}`
    : q.template
      ? `Decibels Home Theater ${q.template.name}`
      : "Decibels Home Theater Quotation";
  doc.setFillColor(245, 245, 238);
  doc.setDrawColor(160, 160, 160);
  doc.rect(ml, y, cw, 7, "FD");
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(...PINK);
  doc.text(titleText, pw / 2, y + 5, { align: "center" });
  y += 11;

  // --- ITEMS TABLE (grouped by Division then Category) ---
  const divisionLabels: Record<string, string> = {
    HOME_THEATER: "Home Theater",
    ACOUSTICS: "Acoustics",
  };
  const divisionOrder = ["HOME_THEATER", "ACOUSTICS"];

  const divGroups = new Map<string, typeof q.items>();
  for (const item of q.items) {
    const div = item.division || "HOME_THEATER";
    if (!divGroups.has(div)) divGroups.set(div, []);
    divGroups.get(div)!.push(item);
  }

  const activeDivisions = divisionOrder.filter((d) => divGroups.has(d));

  const tableBody: string[][] = [];
  const tRowTypes: ("divHeader" | "catHeader" | "item" | "subtotal" | "divSubtotal")[] = [];
  let sl = 1;

  const hasAnyDiscount = q.items.some((item) => (item.discount || 0) > 0);
  const colCount = hasAnyDiscount ? 8 : 7;

  for (const div of activeDivisions) {
    const divItems = divGroups.get(div)!;

    if (activeDivisions.length > 1) {
      const divRow = Array(colCount).fill("");
      divRow[1] = divisionLabels[div] || div;
      tableBody.push(divRow);
      tRowTypes.push("divHeader");
    }

    const catOrder: string[] = [];
    const catMap = new Map<string, typeof q.items>();
    for (const item of divItems) {
      const cat = item.item?.category?.name || "Other";
      if (!catMap.has(cat)) {
        catMap.set(cat, []);
        catOrder.push(cat);
      }
      catMap.get(cat)!.push(item);
    }

    const groups = catOrder.map((name) => {
      const items = catMap.get(name)!;
      return { name, items, subtotal: items.reduce((s, i) => s + i.total, 0) };
    });

    for (const group of groups) {
      const catRow = Array(colCount).fill("");
      catRow[1] = group.name;
      tableBody.push(catRow);
      tRowTypes.push("catHeader");

      for (const item of group.items) {
        const desc = item.description || item.item?.description || item.notes;
        const displayName = desc ? `${item.name}\n${desc}` : item.name;
        const discPct = item.discount || 0;
        const row = [
          sl.toString(),
          displayName,
          item.hsnCode || "",
          item.quantity.toString(),
          item.unit || "No",
          formatINR(item.unitPrice),
        ];
        if (hasAnyDiscount) row.push(discPct > 0 ? `${discPct}%` : "");
        row.push(formatINR(item.total));
        tableBody.push(row);
        tRowTypes.push("item");
        sl++;
      }

      const subRow = Array(colCount).fill("");
      subRow[colCount - 1] = formatINR(group.subtotal);
      tableBody.push(subRow);
      tRowTypes.push("subtotal");
    }

    if (activeDivisions.length > 1) {
      const divTotal = divItems.reduce((s, i) => s + i.total, 0);
      const divSubRow = Array(colCount).fill("");
      divSubRow[1] = `${divisionLabels[div] || div} Total`;
      divSubRow[colCount - 1] = formatINR(divTotal);
      tableBody.push(divSubRow);
      tRowTypes.push("divSubtotal");
    }
  }

  const headRow = ["Sl", "Product Description", "HSN", "Qty", "Unit", "Rate (₹)"];
  if (hasAnyDiscount) headRow.push("Disc");
  headRow.push("Amount (₹)");

  const colStyles: Record<number, object> = hasAnyDiscount
    ? {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 20, halign: "center", fontSize: 7 },
        3: { cellWidth: 13, halign: "center" },
        4: { cellWidth: 13, halign: "center" },
        5: { cellWidth: 26, halign: "right" },
        6: { cellWidth: 16, halign: "center" },
        7: { cellWidth: 32, halign: "right" },
      }
    : {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 68 },
        2: { cellWidth: 22, halign: "center", fontSize: 7 },
        3: { cellWidth: 13, halign: "center" },
        4: { cellWidth: 13, halign: "center" },
        5: { cellWidth: 30, halign: "right" },
        6: { cellWidth: 34, halign: "right" },
      };

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: tableBody,
    theme: "grid",
    styles: {
      font: "Poppins",
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      textColor: BLACK,
      lineColor: [180, 180, 180],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [PINK[0], PINK[1], PINK[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    columnStyles: colStyles,
    margin: { left: ml, right: ml },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const rt = tRowTypes[data.row.index];
      if (rt === "divHeader") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = [255, 255, 255] as [number, number, number];
        data.cell.styles.fillColor = [PINK[0], PINK[1], PINK[2]] as [number, number, number];
      }
      if (rt === "catHeader") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = PINK;
        data.cell.styles.fillColor = [248, 248, 245] as [number, number, number];
      }
      if (rt === "subtotal") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 240, 235] as [number, number, number];
        data.cell.styles.textColor = PINK;
      }
      if (rt === "divSubtotal") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        data.cell.styles.fillColor = [230, 230, 225] as [number, number, number];
        data.cell.styles.textColor = PINK;
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 2;

  // --- FINANCIAL SUMMARY (right-aligned bordered table) ---
  const sumLblW = 45;
  const sumValW = 35;
  const sumX = re - sumLblW - sumValW;
  const sumRH = 7;

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

  if (q.discount > 0) {
    summaryLines.push({ label: "Discount", value: "- " + formatINR(q.discount) });
  }

  if (q.roundOff && q.roundOff !== 0) {
    summaryLines.push({ label: "Round Off", value: (q.roundOff > 0 ? "+ " : "") + formatINR(q.roundOff) });
  }

  summaryLines.push({ label: "Grand Total", value: formatINR(q.grandTotal), highlight: true });

  for (const row of summaryLines) {
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.3);

    if (row.highlight) {
      doc.setFillColor(...PINK);
      doc.rect(sumX, y, sumLblW, sumRH + 1, "FD");
      doc.rect(sumX + sumLblW, y, sumValW, sumRH + 1, "FD");
      doc.setFontSize(10);
      doc.setFont("Poppins", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(row.label, sumX + 3, y + 5.5);
      doc.text(row.value, sumX + sumLblW + sumValW - 3, y + 5.5, { align: "right" });
      y += sumRH + 1;
    } else {
      doc.setFillColor(248, 248, 245);
      doc.rect(sumX, y, sumLblW, sumRH, "FD");
      doc.rect(sumX + sumLblW, y, sumValW, sumRH, "S");
      doc.setFontSize(8);
      doc.setFont("Poppins", "bold");
      doc.setTextColor(120, 120, 120);
      doc.text(row.label, sumX + 3, y + 4.8);
      doc.setFont("Poppins", "normal");
      doc.setTextColor(...BLACK);
      doc.text(row.value, sumX + sumLblW + sumValW - 3, y + 4.8, { align: "right" });
      y += sumRH;
    }
  }

  y += 6;

  // --- NOTES ---
  if (q.notes) {
    doc.setFontSize(8);
    doc.setFont("Poppins", "bold");
    doc.setTextColor(...PINK);
    doc.text("Notes:", ml, y);
    y += 4;
    doc.setFont("Poppins", "italic");
    doc.setTextColor(...BLACK);
    doc.setFontSize(7.5);
    for (const line of q.notes.split("\n")) {
      if (!line.trim()) continue;
      const wrapped = doc.splitTextToSize(line.trim(), cw - 5);
      doc.text(wrapped, ml + 2, y);
      y += wrapped.length * 3.5;
    }
    y += 2;
  }

  // --- FOOTER ---
  doc.setFontSize(7);
  doc.setFont("Poppins", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(q.includeGst !== false ? "GST included as detailed above." : "GST Not Applicable.", ml, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(...BLACK);
  const termsRef = "Terms And Conditions are enclosed herewith Attachment 1.";
  doc.text(termsRef, ml, y);
  const tw = doc.getTextWidth(termsRef);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ml, y + 0.8, ml + tw, y + 0.8);

  doc.setFontSize(9);
  doc.setFont("Poppins", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Authorized by", re - 40, y + 10);
}

function drawPaymentsPage(doc: jsPDF, q: QuotationData, logoData: string, badgeData: string) {
  const ml = 10;
  const re = 200;

  drawHeader(doc, logoData, badgeData);

  doc.setFontSize(16);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(...PINK);
  doc.text("Payments", re, 36, { align: "right" });

  doc.setDrawColor(...PINK);
  doc.setLineWidth(0.5);
  doc.line(ml, 40, re, 40);

  doc.setFontSize(8);
  doc.setFont("Poppins", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Ref: ${q.quotationNumber}  |  Customer: ${q.customer.name}`, ml, 45);

  const payments = q.payments || [];
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = q.grandTotal - totalPaid;

  // Summary bar
  const sumY = 49;
  doc.setFillColor(248, 248, 238);
  doc.rect(ml, sumY, re - ml, 10, "F");
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(...BLACK);
  doc.text(`Grand Total: ${formatINR(q.grandTotal)}`, ml + 4, sumY + 7);
  doc.text(`Total Paid: ${formatINR(totalPaid)}`, ml + 70, sumY + 7);
  doc.setTextColor(balance > 0 ? PINK[0] : 0, balance > 0 ? PINK[1] : 120, balance > 0 ? PINK[2] : 0);
  doc.text(`Balance: ${formatINR(balance)}`, ml + 140, sumY + 7);

  autoTable(doc, {
    startY: sumY + 14,
    margin: { left: ml, right: ml },
    head: [["#", "Date", "Amount", "Mode", "Transaction ID", "Notes", "Recorded By"]],
    body: payments.map((p, i) => [
      (i + 1).toString(),
      formatDate(p.date),
      formatINR(p.amount),
      p.mode.replace(/_/g, " "),
      p.transactionId || "—",
      p.notes || "—",
      p.recordedBy?.name || "—",
    ]),
    foot: [["", "", formatINR(totalPaid), "", "", "", ""]],
    theme: "grid",
    styles: {
      font: "Poppins",
    },
    headStyles: {
      fillColor: [PINK[0], PINK[1], PINK[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: BLACK,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    footStyles: {
      fillColor: [248, 248, 238],
      textColor: BLACK,
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 24 },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 28 },
      4: { cellWidth: 32 },
      5: { cellWidth: 38 },
      6: { cellWidth: 30 },
    },
  });
}

function renderWrappedAfterLabel(
  doc: jsPDF,
  text: string,
  x: number,
  startY: number,
  maxW: number,
  labelW: number,
  lh: number
): number {
  let y = startY;
  const words = text.split(" ");
  let line = "";
  let first = true;

  for (const word of words) {
    const test = line ? line + " " + word : word;
    const avail = first ? maxW - labelW : maxW;
    if (doc.getTextWidth(test) > avail && line) {
      if (y > 285) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, first ? x + labelW : x, y);
      y += lh;
      line = word;
      first = false;
    } else {
      line = test;
    }
  }
  if (line) {
    if (y > 285) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, first ? x + labelW : x, y);
    y += lh;
  }
  return y;
}

function drawTermsPage(doc: jsPDF) {
  const ml = 15;
  const textX = ml + 8;
  const textW = 172;
  const lh = 3.8;
  let y = 20;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont("Poppins", "bold");
  doc.text("Terms and Conditions:", ml, y);
  y += 8;

  doc.setFontSize(9);

  const terms: {
    num: string;
    label?: string;
    text?: string;
    bullets?: string[];
  }[] = [
    {
      num: "1.",
      label: "Payment",
      bullets: [
        "70% advance upon signing of Work Order, 20% upon delivery and Installation of the system & remaining 10% upon handing over the project.",
        "If any delay in payment beyond the credit period as above said will be charged a late payment fee of 5% of the amount due at a prorate basis for first 30 days, after completion of 30 days interest @ 18% per annum will be levied on outstanding payment.",
      ],
    },
    {
      num: "2.",
      label: "Warranty",
      text: "As per manufacturer Terms and Conditions.",
    },
    {
      num: "3.",
      label: "Designs and drawings",
      text: "Any changes in proposed Design and drawing will be charged extra either in pre-approval or during execution of work accordingly.",
    },
    {
      num: "4.",
      text: "Work site should be ready to start work at the time of confirmation of work and free from other contractor's interference.",
    },
    {
      num: "5.",
      label: "Material availability",
      text: "If import application, 6-8 weeks from the date of Advance.",
    },
    {
      num: "6.",
      label: "Project completion",
      text: "Project completion Report will be issued during commissioning and handing over of project upon 100% payment settled.",
    },
    {
      num: "7.",
      label: "Acoustics",
      text: "The Quotation for Acoustics included only for room Acoustics treatment, does not include any kind of Sound proofing.",
    },
    {
      num: "8.",
      label: "Taxation",
      text: "As per government law.",
    },
    {
      num: "9.",
      text: "Indemnification to the fullest extent permitted by law, buyer shall defend, indemnify and hold seller harmless from any and all claims, demands, subrogation claims by buyer, causes of action, controversies, liabilities, fines, regulatory actions, seizures of equipment, losses, costs, expenses arising from or in connection with claims asserted against seller for any damage, environmental liability, patent and/or intellectual property infringement resulting from property damage, delay or failure in delivery of the goods or any other claims, whether in negligence, tort, contract, or otherwise, relating to this terms and conditions.",
    },
    {
      num: "10.",
      text: "Buyer should not do modification or alteration of the goods.",
    },
    {
      num: "11.",
      label: "Force Majeure",
      text: "Seller shall have no liability or obligation to Buyer of any kind, including, but not limited to, any obligation to deliver Goods as a result of causes, conduct or occurrences beyond Seller's reasonable control, including, but not limited to, commercial impracticability, fire, flood, act of war, terrorism, civil disorder or disobedience, act of public enemies, problems associated with transportation (including car or truck shortages), acts or failure to act of any state, federal or foreign governmental or regulatory authorities, labor disputes, strikes, or failure of suppliers to make timely deliveries of materials, goods or services to Seller.",
    },
    {
      num: "12.",
      label: "Termination",
      text: "Seller may at is full discretion at any time terminate any order related to this Agreement in whole or in part by written notice to Buyer if any dispute arise.",
    },
    {
      num: "13.",
      label: "Alternative Dispute Resolution",
      text: "Any and all disputes, complaints, controversies, claims and grievances arising under, out of, in connection with, or in any manner related to this Agreement or the relationship of parties hereunder shall be settled by Indian Law.",
    },
    {
      num: "14.",
      label: "Interpretation",
      text: "All rights granted to Seller herein shall be in addition to and not in lieu of Seller's rights by operation of the law. No modification of this Agreement or any other provision of the contract shall be valid unless in writing and signed by Seller.",
    },
  ];

  for (const term of terms) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("Poppins", "italic");
    doc.setTextColor(30, 30, 30);
    doc.text(term.num, ml, y);

    if (term.label) {
      doc.setFont("Poppins", "bolditalic");
      const labelStr = term.label + ": ";
      doc.text(labelStr, textX, y);

      if (term.text) {
        const labelW = doc.getTextWidth(labelStr);
        doc.setFont("Poppins", "italic");
        y = renderWrappedAfterLabel(doc, term.text, textX, y, textW, labelW, lh);
      } else {
        y += lh;
      }
    } else if (term.text) {
      doc.setFont("Poppins", "italic");
      const lines = doc.splitTextToSize(term.text, textW);
      for (const l of lines) {
        if (y > 285) {
          doc.addPage();
          y = 20;
        }
        doc.text(l, textX, y);
        y += lh;
      }
    }

    if (term.bullets) {
      for (const bullet of term.bullets) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("Poppins", "italic");
        doc.text("•", textX + 2, y);
        const bLines = doc.splitTextToSize(bullet, textW - 8);
        for (const bl of bLines) {
          if (y > 285) {
            doc.addPage();
            y = 20;
          }
          doc.text(bl, textX + 6, y);
          y += lh;
        }
        y += 0.5;
      }
    }

    y += 1.5;
  }
}
