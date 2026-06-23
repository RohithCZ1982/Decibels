"use client";

import jsPDF from "jspdf";

async function fetchFontBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let fontsLoaded = false;
let fontCache: Record<string, string> = {};

async function loadFonts() {
  if (fontsLoaded) return;
  const [regular, bold, italic, boldItalic, semiBold] = await Promise.all([
    fetchFontBase64("/fonts/Poppins-Regular.ttf"),
    fetchFontBase64("/fonts/Poppins-Bold.ttf"),
    fetchFontBase64("/fonts/Poppins-Italic.ttf"),
    fetchFontBase64("/fonts/Poppins-BoldItalic.ttf"),
    fetchFontBase64("/fonts/Poppins-SemiBold.ttf"),
  ]);
  fontCache = { regular, bold, italic, boldItalic, semiBold };
  fontsLoaded = true;
}

export async function registerPoppins(doc: jsPDF) {
  await loadFonts();

  doc.addFileToVFS("Poppins-Regular.ttf", fontCache.regular);
  doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");

  doc.addFileToVFS("Poppins-Bold.ttf", fontCache.bold);
  doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");

  doc.addFileToVFS("Poppins-Italic.ttf", fontCache.italic);
  doc.addFont("Poppins-Italic.ttf", "Poppins", "italic");

  doc.addFileToVFS("Poppins-BoldItalic.ttf", fontCache.boldItalic);
  doc.addFont("Poppins-BoldItalic.ttf", "Poppins", "bolditalic");

  doc.addFileToVFS("Poppins-SemiBold.ttf", fontCache.semiBold);
  doc.addFont("Poppins-SemiBold.ttf", "PoppinsSemiBold", "normal");

  doc.setFont("Poppins");
}
