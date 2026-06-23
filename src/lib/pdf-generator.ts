"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    quantity: number;
    unit?: string;
    unitPrice: number;
    gstRate?: number;
    total: number;
    notes: string | null;
    item?: { code: string; category: { name: string } } | null;
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

const RED: [number, number, number] = [180, 40, 40];
const BLACK: [number, number, number] = [30, 30, 30];
const GOLD: [number, number, number] = [180, 150, 50];

export async function generateQuotationPDF(quotation: QuotationData) {
  const doc = new jsPDF("p", "mm", "a4");

  const logoData = await loadImage("/logo.png");

  drawQuotationPage(doc, quotation, logoData);

  doc.addPage();
  drawTermsPage(doc);

  doc.save(`${quotation.quotationNumber}.pdf`);
}

function drawQuotationPage(
  doc: jsPDF,
  q: QuotationData,
  logoData: string
) {
  const pw = 210;
  const ml = 10;
  const re = pw - ml;
  const cw = pw - ml * 2;

  // --- HEADER ---
  if (logoData) {
    doc.addImage(logoData, "PNG", ml, 6, 55, 8);
  } else {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bolditalic");
    doc.setTextColor(...RED);
    doc.text("Decibels", ml, 12);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("a u d i o   s y s t e m s", ml, 17);
  }

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("#277/A, Hebbal Industrial Area, Mysuru – 570 027,", ml, 18);
  doc.text("Karnataka, INDIA. Ph : 08212331331 Mobile: 9972449311", ml, 21.5);
  doc.text("mani@decibelsaudio.com website: www.decibelsaudio.com", ml, 25);

  // 25 Years badge
  const bx = re - 12;
  const by = 12;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.circle(bx, by, 9);
  doc.setLineWidth(0.4);
  doc.circle(bx, by, 7.5);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text("25", bx, by + 1, { align: "center" });
  doc.setFontSize(4);
  doc.text("YEARS", bx, by + 4.5, { align: "center" });

  // "Statement of Quotation" or "Tax Invoice"
  const INVOICE_STATUSES = ["APPROVED", "IN_PRODUCTION", "COMPLETED", "CLOSED"];
  const isInvoice = q.status && INVOICE_STATUSES.includes(q.status);
  doc.setFontSize(16);
  doc.setFont("times", "bolditalic");
  doc.setTextColor(...RED);
  doc.text(isInvoice ? "Tax Invoice" : "Statement of Quotation", re, 36, { align: "right" });

  // --- CUSTOMER DETAILS BOX ---
  const custY = 42;
  const custH = 30;

  doc.setFillColor(248, 248, 238);
  doc.rect(ml, custY, cw, custH, "F");
  doc.setDrawColor(210, 210, 200);
  doc.setLineWidth(0.2);
  doc.rect(ml, custY, cw, custH, "S");

  // Green tab
  doc.setFillColor(100, 130, 85);
  doc.rect(ml, custY, 32, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Customer Details", ml + 1.5, custY + 5);

  // JOB
  const jobX = pw / 2 + 5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...RED);
  doc.text("JOB :", jobX, custY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BLACK);
  doc.setFontSize(6.5);
  const jobLines = doc.splitTextToSize(
    "We are hereby sending the quotes required for setting up a Home Theater at your place.",
    re - jobX - 14
  );
  doc.text(jobLines, jobX + 14, custY + 3.5, { lineHeightFactor: 1.5 });

  // Customer name & address
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(q.customer.name, ml + 2, custY + 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(q.customer.address || "", ml + 2, custY + 21);

  // DATE & Ref
  const dX = re - 55;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("DATE:", dX, custY + 20);
  doc.setTextColor(...RED);
  doc.text(formatDate(q.billDate || q.createdAt), dX + 18, custY + 20);

  doc.setTextColor(...BLACK);
  doc.text("Ref. #", dX, custY + 26);
  doc.setTextColor(...RED);
  doc.text(q.quotationNumber, dX + 18, custY + 26);

  // --- RED TITLE BAR ---
  const barY = custY + custH + 4;
  doc.setFillColor(...RED);
  doc.rect(ml, barY, cw, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const titleText = q.title
    ? `Decibels Home Theater ${q.title}`
    : q.template
      ? `Decibels Home Theater ${q.template.name}`
      : "Decibels Home Theater Quotation";
  doc.text(titleText, pw / 2, barY + 5.5, { align: "center" });

  // --- ITEMS TABLE ---
  const tableY = barY + 12;

  const catOrder: string[] = [];
  const catMap = new Map<string, typeof q.items>();
  for (const item of q.items) {
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

  const body: string[][] = [];
  const rowTypes: ("item" | "subtotal" | "total")[] = [];
  let sl = 1;

  for (const group of groups) {
    for (const item of group.items) {
      body.push([
        sl.toString(),
        item.name,
        formatINR(item.unitPrice),
        item.quantity.toString(),
        item.unit || "No",
        formatINR(item.total),
        "",
      ]);
      rowTypes.push("item");
      sl++;
    }
    body.push(["", "", "", "", "", "", formatINR(group.subtotal)]);
    rowTypes.push("subtotal");
  }

  // --- FINANCIAL SUMMARY ROWS ---
  body.push(["", "", "", "", "", "Subtotal", formatINR(q.subtotal)]);
  rowTypes.push("subtotal");

  if (q.includeGst !== false) {
    const gstMap = new Map<number, number>();
    for (const item of q.items) {
      const rate = item.gstRate ?? 18;
      gstMap.set(rate, (gstMap.get(rate) || 0) + (item.total * rate) / 100);
    }
    const gstEntries = Array.from(gstMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [rate, amt] of gstEntries) {
      body.push(["", "", "", "", "", `GST @${rate}%`, formatINR(Math.round(amt))]);
      rowTypes.push("item");
    }
  }

  if (q.discount > 0) {
    body.push(["", "", "", "", "", "Discount", "-" + formatINR(q.discount)]);
    rowTypes.push("item");
  }

  if (q.roundOff && q.roundOff !== 0) {
    body.push(["", "", "", "", "", "Round Off", (q.roundOff > 0 ? "+" : "") + formatINR(q.roundOff)]);
    rowTypes.push("item");
  }

  body.push(["", "", "", "", "", "Grand Total", formatINR(q.grandTotal)]);
  rowTypes.push("total");

  autoTable(doc, {
    startY: tableY,
    head: [["Sl", "Product", "Price Rs.", "Qty", "", "Amount Rs.", "Total"]],
    body,
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
      textColor: BLACK,
      lineWidth: 0,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: RED,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 78 },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 10, halign: "center" },
      4: { cellWidth: 14 },
      5: { cellWidth: 27, halign: "right" },
      6: { cellWidth: 27, halign: "right" },
    },
    margin: { left: ml, right: ml },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const rt = rowTypes[data.row.index];
      if (rt === "subtotal") {
        data.cell.styles.textColor = RED;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
      }
      if (rt === "total") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 10;
      }
    },
    didDrawCell: (data) => {
      if (data.section === "head" && data.column.index === 6) {
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.5);
        const ly = data.cell.y + data.cell.height;
        doc.line(ml, ly, re, ly);
      }
      if (
        data.section === "body" &&
        rowTypes[data.row.index] === "total" &&
        data.column.index === 0
      ) {
        doc.setDrawColor(...BLACK);
        doc.setLineWidth(0.3);
        doc.line(ml, data.cell.y, re, data.cell.y);
      }
    },
  });

  // --- NOTES & FOOTER ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 6;

  if (q.notes) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bolditalic");
    doc.setTextColor(...RED);
    doc.text("Note :", ml, y);
    y += 4;

    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BLACK);
    doc.setFontSize(7);
    for (const line of q.notes.split("\n")) {
      if (!line.trim()) continue;
      const wrapped = doc.splitTextToSize(line.trim(), cw - 5);
      doc.text(wrapped, ml, y);
      y += wrapped.length * 3.5;
    }
  }

  y += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  const ref = "Terms And Conditions are enclosed herewith Attachment 1.";
  doc.text(ref, ml, y);
  const tw = doc.getTextWidth(ref);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ml, y + 0.8, ml + tw, y + 0.8);

  y += 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(q.includeGst !== false ? "GST included as detailed above." : "GST Not Applicable.", ml, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Authorized by", re - 40, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text(q.createdBy?.name || "N Manikantan Iyer", re - 40, y + 16);
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
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Terms and Conditions:", ml, y);
  y += 8;

  doc.setFontSize(8);

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
      text: "Work site should be ready to start work at the time of confirmation of work and free from other contractor’s interference.",
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
      text: "Seller shall have no liability or obligation to Buyer of any kind, including, but not limited to, any obligation to deliver Goods as a result of causes, conduct or occurrences beyond Seller’s reasonable control, including, but not limited to, commercial impracticability, fire, flood, act of war, terrorism, civil disorder or disobedience, act of public enemies, problems associated with transportation (including car or truck shortages), acts or failure to act of any state, federal or foreign governmental or regulatory authorities, labor disputes, strikes, or failure of suppliers to make timely deliveries of materials, goods or services to Seller.",
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
      text: "All rights granted to Seller herein shall be in addition to and not in lieu of Seller’s rights by operation of the law. No modification of this Agreement or any other provision of the contract shall be valid unless in writing and signed by Seller.",
    },
  ];

  for (const term of terms) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "italic");
    doc.setTextColor(30, 30, 30);
    doc.text(term.num, ml, y);

    if (term.label) {
      doc.setFont("helvetica", "bolditalic");
      const labelStr = term.label + ": ";
      doc.text(labelStr, textX, y);

      if (term.text) {
        const labelW = doc.getTextWidth(labelStr);
        doc.setFont("helvetica", "italic");
        y = renderWrappedAfterLabel(doc, term.text, textX, y, textW, labelW, lh);
      } else {
        y += lh;
      }
    } else if (term.text) {
      doc.setFont("helvetica", "italic");
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
        doc.setFont("helvetica", "italic");
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
