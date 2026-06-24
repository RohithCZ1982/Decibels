"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { registerPoppins } from "./pdf-fonts";

interface AdvanceDeduction {
  amount: number;
  reason: string;
  date: string;
  notes: string | null;
}

interface AdvanceStatementData {
  employeeName: string;
  employeeRole: string;
  advanceAmount: number;
  advanceDate: string;
  interestRate: number;
  advanceNotes: string | null;
  deductions: AdvanceDeduction[];
  totalRepaid: number;
  principal: number;
  interest: number;
  outstanding: number;
}

function formatINR(n: number) {
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

const PINK: [number, number, number] = [200, 50, 60];
const BLACK: [number, number, number] = [30, 30, 30];

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

export async function generateAdvanceStatementPDF(data: AdvanceStatementData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const ml = 10;
  const re = pw - ml;
  const cw = pw - ml * 2;

  const [logoData, badgeData] = await Promise.all([
    loadImage("/logo.png"),
    loadImage("/25years.png"),
  ]);

  await registerPoppins(doc);

  // --- HEADER ---
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

  doc.setFontSize(6);
  doc.setFont("Poppins", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("#277/A, Hebbal Industrial Area, Mysuru – 570 027,", ml, 20);
  doc.text("Karnataka, INDIA. Ph : 08212331331 Mobile: 9972449311", ml, 23.5);
  doc.text("mani@decibelsaudio.com website: www.decibelsaudio.com", ml, 27);

  if (badgeData) {
    doc.addImage(badgeData, "PNG", re - 22, 4, 22, 22);
  }

  // --- TITLE ---
  let y = 34;
  doc.setFillColor(...PINK);
  doc.rect(ml, y, cw, 8, "F");
  doc.setFontSize(11);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Advance Salary Statement", pw / 2, y + 5.5, { align: "center" });
  y += 11;

  // --- EMPLOYEE & ADVANCE INFO ---
  const lblW = 35;
  const valW = cw / 2 - lblW;
  const rh = 6.5;

  const rows = [
    [{ label: "Employee", value: data.employeeName }, { label: "Role", value: data.employeeRole || "—" }],
    [{ label: "Advance Amount", value: formatINR(data.advanceAmount) }, { label: "Date", value: new Date(data.advanceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) }],
    [{ label: "Interest Rate", value: `${data.interestRate}% p.a.` }, { label: "Notes", value: data.advanceNotes || "—" }],
  ];

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.3);

  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const x = ml + i * (cw / 2);
      doc.setFillColor(248, 248, 245);
      doc.rect(x, y, lblW, rh, "FD");
      doc.rect(x + lblW, y, valW, rh, "S");

      doc.setFontSize(7);
      doc.setFont("Poppins", "bold");
      doc.setTextColor(120, 120, 120);
      doc.text(row[i].label, x + 2, y + 4.3);

      doc.setFontSize(8);
      doc.setFont("Poppins", "normal");
      doc.setTextColor(...BLACK);
      doc.text(row[i].value, x + lblW + 2, y + 4.3);
    }
    y += rh;
  }

  y += 6;

  // --- DEDUCTIONS TABLE ---
  if (data.deductions.length > 0) {
    doc.setFontSize(9);
    doc.setFont("Poppins", "bold");
    doc.setTextColor(...PINK);
    doc.text("Repayments / Deductions", ml, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["#", "Date", "Reason", "Amount", "Notes"]],
      body: data.deductions.map((d, i) => [
        (i + 1).toString(),
        new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        d.reason,
        formatINR(d.amount),
        d.notes || "—",
      ]),
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
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 97 },
      },
      margin: { left: ml, right: ml },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 4;
  } else {
    doc.setFontSize(9);
    doc.setFont("Poppins", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("No repayments recorded yet.", ml, y);
    y += 8;
  }

  // --- SUMMARY ---
  const sumLblW = 50;
  const sumValW = 35;
  const sumX = re - sumLblW - sumValW;
  const sumRH = 7;

  const summaryRows = [
    { label: "Total Advanced", value: formatINR(data.advanceAmount) },
    { label: "Total Repaid", value: formatINR(data.totalRepaid) },
    { label: "Principal Balance", value: formatINR(data.principal) },
    { label: "Accrued Interest", value: formatINR(Math.round(data.interest)) },
  ];

  for (const row of summaryRows) {
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.3);
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

  // Outstanding (highlighted)
  doc.setFillColor(...PINK);
  doc.setDrawColor(160, 160, 160);
  doc.rect(sumX, y, sumLblW, sumRH + 1, "FD");
  doc.rect(sumX + sumLblW, y, sumValW, sumRH + 1, "FD");
  doc.setFontSize(10);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Outstanding", sumX + 3, y + 5.5);
  doc.text(formatINR(Math.round(data.outstanding)), sumX + sumLblW + sumValW - 3, y + 5.5, { align: "right" });

  // --- SIGNATURE ---
  y += 30;
  doc.setFontSize(9);
  doc.setFont("Poppins", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Authorized by", re - 40, y);

  // --- FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont("Poppins", "normal");
  doc.text("This is a computer-generated document.", pw / 2, footerY, { align: "center" });
  doc.text("Decibels Audio Pvt Ltd | #277/A, Hebbal Industrial Area, Mysuru - 570 027", pw / 2, footerY + 4, { align: "center" });

  window.open(doc.output("bloburl"), "_blank");
}
