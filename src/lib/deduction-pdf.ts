"use client";

import jsPDF from "jspdf";
import { registerPoppins } from "./pdf-fonts";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface DeductionReceiptData {
  employeeName: string;
  employeeRole: string;
  reason: string;
  amount: number;
  date: string;
  notes: string | null;
  salaryMonth: number | null;
  salaryYear: number | null;
}

function formatINR(n: number) {
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }
  return convert(Math.round(num)) + " Rupees Only";
}

const NAVY: [number, number, number] = [20, 30, 80];
const RED: [number, number, number] = [180, 40, 40];
const GRAY: [number, number, number] = [120, 120, 120];
const LIGHT_GRAY: [number, number, number] = [200, 200, 200];

export async function generateDeductionReceiptPDF(data: DeductionReceiptData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  await registerPoppins(doc);
  const pw = 148;
  const ml = 12;
  const mr = pw - ml;
  const cw = pw - ml * 2;

  const dateObj = new Date(data.date);
  const dateStr = dateObj.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // --- Decorative top ornament ---
  const cx = pw / 2;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.line(cx - 22, 14, cx - 5, 14);
  doc.line(cx + 5, 14, cx + 22, 14);
  // Diamond
  doc.setFillColor(...NAVY);
  const dx = cx, dy = 11.5;
  doc.triangle(dx, dy - 2.5, dx - 2.5, dy, dx + 2.5, dy, "F");
  doc.triangle(dx, dy + 2.5, dx - 2.5, dy, dx + 2.5, dy, "F");

  // --- Title ---
  doc.setFontSize(24);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(...NAVY);
  doc.text(data.reason.toUpperCase(), cx, 25, { align: "center" });

  // Bottom ornament
  doc.setLineWidth(0.6);
  doc.line(cx - 22, 28, cx - 5, 28);
  doc.line(cx + 5, 28, cx + 22, 28);
  doc.setFontSize(8);
  doc.text("~", cx, 31, { align: "center" });

  // --- BILL TO banner ---
  let y = 38;
  doc.setFillColor(...NAVY);
  doc.triangle(ml, y, ml + 26, y, ml + 23, y + 7, "F");
  doc.rect(ml, y, 23, 7, "F");
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("BILL TO:", ml + 2, y + 5);

  // --- Date/Time box ---
  const boxX = mr - 48;
  const boxW = 48;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(boxX, y - 2, boxW, 14, 1.5, 1.5, "S");

  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.text("Date :", boxX + 5, y + 8);
  doc.setFont("Poppins", "normal");
  doc.text(dateStr, boxX + 18, y + 8);

  // --- Name field ---
  y += 14;
  const fieldLabelX = ml;
  const fieldValX = ml + 20;
  const fieldEndX = boxX - 3;

  const drawField = (label: string, value: string) => {
    doc.setTextColor(...NAVY);
    doc.setFontSize(10);
    doc.setFont("Poppins", "bold");
    doc.text(label, fieldLabelX, y);
    doc.setFont("Poppins", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(value, fieldValX, y);
    doc.setDrawColor(...LIGHT_GRAY);
    doc.setLineWidth(0.2);
    doc.line(fieldValX - 1, y + 1.5, fieldEndX, y + 1.5);
    y += 9;
  };

  drawField("Name :", data.employeeName);
  if (data.employeeRole) drawField("Role :", data.employeeRole);
  drawField("Type :", data.reason);
  if (data.salaryMonth && data.salaryYear) {
    drawField("Period :", `${MONTHS[data.salaryMonth - 1]} ${data.salaryYear}`);
  }
  if (data.notes) drawField("Notes :", data.notes);

  // --- AMOUNT IN WORDS box ---
  y += 14;
  doc.setFontSize(9);
  const words = numberToWords(data.amount);
  const wordLines = doc.splitTextToSize(words, cw - 48);
  const wordsBoxH = Math.max(22, 10 + wordLines.length * 5);

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(ml, y, cw, wordsBoxH, 1.5, 1.5, "S");

  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.text("AMOUNT IN WORDS :", ml + 4, y + 10);

  doc.setFont("Poppins", "bold");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.text(wordLines, ml + 46, y + 10);

  // --- AMOUNT IN FIGURE box ---
  y += wordsBoxH + 4;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(ml, y, cw, 16, 1.5, 1.5, "S");

  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.text("AMOUNT IN FIGURE :", ml + 4, y + 10);

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.roundedRect(ml + 44, y + 3, 42, 11, 1, 1, "S");
  doc.setFontSize(12);
  doc.setFont("Poppins", "bold");
  doc.setTextColor(...NAVY);
  doc.text(formatINR(data.amount), ml + 46, y + 10.5);

  // --- Signature ---
  y += 30;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(mr - 42, y, mr, y);
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("Poppins", "bold");
  doc.text("SIGNATURE", mr - 21, y + 6, { align: "center" });

  // --- Company footer ---
  const footerY = 196;
  doc.setFontSize(13);
  doc.setFont("Poppins", "bolditalic");
  doc.setTextColor(...RED);
  doc.text("Decibels", cx, footerY - 4, { align: "center" });
  doc.setFontSize(6);
  doc.setFont("Poppins", "normal");
  doc.setTextColor(...GRAY);
  doc.text("a u d i o   s y s t e m s", cx, footerY, { align: "center" });
  doc.setFontSize(6);
  doc.text("#277/A, Hebbal Industrial Area, Mysuru - 570 027, Karnataka, INDIA", cx, footerY + 4, { align: "center" });
  doc.text("Ph: 08212331331 | Mobile: 9972449311 | mani@decibelsaudio.com", cx, footerY + 7.5, { align: "center" });

  window.open(doc.output("bloburl"), "_blank");
}
