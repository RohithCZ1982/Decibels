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
  notes: string | null;
  terms: string | null;
  customer: { name: string; mobile: string; email: string | null; address: string | null };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes: string | null;
  }>;
}

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

export async function generateQuotationPDF(quotation: QuotationData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  const logoData = await loadImage("/logo.png");

  // Header background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Red accent line (matching logo red)
  doc.setFillColor(220, 40, 40);
  doc.rect(0, 50, pageWidth, 2, "F");

  // Logo
  if (logoData) {
    doc.addImage(logoData, "PNG", margin, 10, 70, 10.5);
  } else {
    doc.setTextColor(220, 40, 40);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Decibels", margin, 22);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("AUDIO PVT LTD", margin, 29);
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Home Theater | Automation | Acoustics", margin, 38);
  doc.text("Mysuru, India | www.decibels.audio", margin, 43);

  // Quotation title
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION", pageWidth - margin, 16, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(quotation.quotationNumber, pageWidth - margin, 24, { align: "right" });
  doc.text(`Date: ${formatDate(quotation.createdAt)}`, pageWidth - margin, 31, { align: "right" });
  if (quotation.validUntil) {
    doc.text(`Valid Until: ${formatDate(quotation.validUntil)}`, pageWidth - margin, 38, { align: "right" });
  }

  // Customer details
  let y = 62;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text("BILL TO", margin, y);

  y += 6;
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(quotation.customer.name, margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.customer.mobile, margin, y);
  if (quotation.customer.email) {
    y += 5;
    doc.text(quotation.customer.email, margin, y);
  }
  if (quotation.customer.address) {
    y += 5;
    const addrLines = doc.splitTextToSize(quotation.customer.address, 100);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 4;
  }

  y += 8;

  // Items table
  const tableData = quotation.items.map((item, idx) => [
    (idx + 1).toString(),
    item.name + (item.notes ? `\n${item.notes}` : ""),
    item.quantity.toString(),
    formatINR(item.unitPrice),
    formatINR(item.total),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [230, 230, 230],
      lineWidth: 0.5,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [80, 80, 80],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  // Summary
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;
  const summaryX = pageWidth - margin - 80;

  const summaryLines: [string, string][] = [
    ["Subtotal", formatINR(quotation.subtotal)],
  ];
  if (quotation.discount > 0) {
    summaryLines.push(["Discount", `-${formatINR(quotation.discount)}`]);
  }
  summaryLines.push([`GST (${quotation.gstPercent}%)`, formatINR(quotation.gstAmount)]);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  summaryLines.forEach(([label, value]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label, summaryX, y);
    doc.setTextColor(30, 30, 30);
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 6;
  });

  // Grand total line
  doc.setFillColor(220, 40, 40);
  doc.rect(summaryX - 5, y - 2, pageWidth - margin - summaryX + 10, 0.5, "F");
  y += 5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 40, 40);
  doc.text("Grand Total", summaryX, y);
  doc.text(formatINR(quotation.grandTotal), pageWidth - margin, y, { align: "right" });

  // Notes
  if (quotation.notes) {
    y += 15;
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(quotation.notes, pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4;
  }

  // Terms
  if (quotation.terms) {
    y += 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const termLines = doc.splitTextToSize(quotation.terms, pageWidth - margin * 2);
    doc.text(termLines, margin, y);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFillColor(245, 245, 245);
  doc.rect(0, footerY - 5, pageWidth, 25, "F");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("Decibels Audio Pvt Ltd | Mysuru, India | www.decibels.audio | info@decibels.audio", pageWidth / 2, footerY, { align: "center" });

  doc.save(`${quotation.quotationNumber}.pdf`);
}
