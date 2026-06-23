"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface SalaryReceiptData {
  employeeName: string;
  employeeRole: string;
  month: number;
  year: number;
  salary: number;
  deductions: Array<{ reason: string; amount: number }>;
  totalDeductions: number;
  netPay: number;
}

function formatINR(n: number) {
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

const RED: [number, number, number] = [180, 40, 40];
const BLACK: [number, number, number] = [30, 30, 30];
const GOLD: [number, number, number] = [180, 150, 50];

export function generateSalaryReceiptPDF(data: SalaryReceiptData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const ml = 10;
  const re = pw - ml;
  const cw = pw - ml * 2;

  // --- HEADER (same as quotation) ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bolditalic");
  doc.setTextColor(...RED);
  doc.text("Decibels", ml, 12);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("a u d i o   s y s t e m s", ml, 17);

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

  // Title
  doc.setFontSize(16);
  doc.setFont("times", "bolditalic");
  doc.setTextColor(...RED);
  doc.text("Salary Receipt", re, 36, { align: "right" });

  // --- EMPLOYEE DETAILS BOX ---
  const custY = 42;
  const custH = 24;

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
  doc.text("Employee Details", ml + 1.5, custY + 5);

  // Employee name
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(data.employeeName, ml + 2, custY + 15);

  if (data.employeeRole) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(data.employeeRole, ml + 2, custY + 21);
  }

  // Period & Date
  const dX = re - 55;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text("PAY PERIOD:", dX, custY + 15);
  doc.setTextColor(...RED);
  doc.text(`${MONTHS[data.month - 1]} ${data.year}`, dX + 28, custY + 15);

  doc.setTextColor(...BLACK);
  doc.text("DATE:", dX, custY + 21);
  doc.setTextColor(...RED);
  doc.text(new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), dX + 28, custY + 21);

  // --- RED TITLE BAR ---
  const barY = custY + custH + 4;
  doc.setFillColor(...RED);
  doc.rect(ml, barY, cw, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`Salary Statement - ${MONTHS[data.month - 1]} ${data.year}`, pw / 2, barY + 5.5, { align: "center" });

  // --- EARNINGS TABLE ---
  const tableY = barY + 12;

  autoTable(doc, {
    startY: tableY,
    margin: { left: ml, right: ml },
    head: [["Description", "Amount"]],
    body: [["Base Salary", formatINR(data.salary)]],
    foot: [["Total Earnings", formatINR(data.salary)]],
    theme: "plain",
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      textColor: BLACK,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: RED,
      fontStyle: "bold",
      fontSize: 9,
    },
    footStyles: {
      fillColor: [248, 248, 238],
      textColor: BLACK,
      fontStyle: "bold",
      fontSize: 10,
    },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
    didDrawCell: (cellData) => {
      if (cellData.section === "head" && cellData.column.index === 1) {
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.5);
        const ly = cellData.cell.y + cellData.cell.height;
        doc.line(ml, ly, re, ly);
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = (doc as any).lastAutoTable.finalY + 8;

  // --- DEDUCTIONS TABLE ---
  if (data.deductions.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...RED);
    doc.text("Deductions", ml, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: ml, right: ml },
      head: [["Reason", "Amount"]],
      body: data.deductions.map((d) => [d.reason, formatINR(d.amount)]),
      foot: [["Total Deductions", formatINR(data.totalDeductions)]],
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
        textColor: BLACK,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: RED,
        fontStyle: "bold",
        fontSize: 9,
      },
      footStyles: {
        fillColor: [255, 245, 245],
        textColor: RED,
        fontStyle: "bold",
        fontSize: 10,
      },
      columnStyles: { 1: { halign: "right", cellWidth: 40 } },
      didDrawCell: (cellData) => {
        if (cellData.section === "head" && cellData.column.index === 1) {
          doc.setDrawColor(...RED);
          doc.setLineWidth(0.3);
          const ly = cellData.cell.y + cellData.cell.height;
          doc.line(ml, ly, re, ly);
        }
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- NET PAY BAR ---
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(ml, y, re, y);
  y += 3;

  doc.setFillColor(...RED);
  doc.rect(ml, y, cw, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("NET PAY", ml + 4, y + 7);
  doc.text(formatINR(data.netPay), re - 4, y + 7, { align: "right" });

  // --- SIGNATURE ---
  y += 30;
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(80, 80, 80);
  doc.text("Authorized by", re - 40, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text("N Manikantan Iyer", re - 40, y + 8);

  // --- FOOTER ---
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("This is a computer-generated document. No signature required.", pw / 2, footerY, { align: "center" });
  doc.text("Decibels Audio Pvt Ltd | #277/A, Hebbal Industrial Area, Mysuru - 570 027", pw / 2, footerY + 4, { align: "center" });

  window.open(doc.output("bloburl"), "_blank");
}
