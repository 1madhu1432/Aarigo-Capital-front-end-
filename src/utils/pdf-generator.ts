import type { Customer, Loan, Payment, Receipt, Settings } from "@/types";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import { formatReceiptWhatsAppMessage, normalizePhoneForWhatsApp } from "./whatsapp";

export interface ReceiptPdfParams {
  receipt: Receipt;
  customer?: Customer | null | undefined;
  payment?: Payment | null | undefined;
  loan?: Loan | null | undefined;
  settings?: Settings | null | undefined;
  adminName?: string | undefined;
  remainingBalance?: number | undefined;
  principalPaid?: number | undefined;
  interestPaid?: number | undefined;
  lateFeePaid?: number | undefined;
}

/**
 * Generates an official, high-resolution vector PDF receipt using jsPDF.
 * Clean, modern layout matching institutional microfinance standards.
 */
export async function generateReceiptPdfBlob(params: ReceiptPdfParams): Promise<{ blob: Blob; filename: string }> {
  // Dynamically import jsPDF for full SSR and Vite bundle safety
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const {
    receipt,
    customer,
    payment,
    loan,
    settings,
    adminName,
    remainingBalance,
    principalPaid = 0,
    interestPaid = 0,
    lateFeePaid = 0,
  } = params;

  const businessName = settings?.businessName || "AARIGO CAPITAL";
  const businessAddress = settings?.businessAddress || "Market Road, Kadapa, Andhra Pradesh 516001";
  const businessPhone = settings?.businessPhone || "+91 98480 12345";
  const businessEmail = settings?.businessEmail || "admin@aarigocapital.com";
  const customerName = customer?.name || "Customer";
  const customerId = customer?.id || receipt.customerId;
  const customerMobile = customer?.mobile || "N/A";
  const loanId = receipt.loanId || loan?.id || "N/A";
  const paymentMethod = receipt.method || payment?.method || "Cash";
  const collector = payment?.collectedBy || adminName || "Authorized Field Officer";
  const receiptDate = fmtDate(receipt.date);
  const receiptTime = fmtDateTime(receipt.date);

  const pageWidth = 210;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2; // 178mm

  // 1. Top Decorative Brand Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 5, "F");

  // Accent line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 5, pageWidth, 1.5, "F");

  // 2. Header: Company Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(businessName.toUpperCase(), margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(businessAddress, margin, 23);
  doc.text(`Phone: ${businessPhone}  |  Email: ${businessEmail}`, margin, 27);

  // Top Right Badge: Receipt Identifier
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(pageWidth - margin - 58, 11, 58, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("OFFICIAL RECEIPT", pageWidth - margin - 29, 16, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.id, pageWidth - margin - 29, 23, { align: "center" });

  // Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, 32, pageWidth - margin, 32);

  // 3. Document Meta Grid (Receipt Date, Loan ID, Payment Ref, Mode)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 36, contentWidth, 22, 2, 2, "F");
  doc.rect(margin, 36, contentWidth, 22, "S");

  const colW = contentWidth / 4;
  const metaY = 41;

  // Col 1: Date & Time
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DATE & TIME", margin + 4, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(receiptDate, margin + 4, metaY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(receiptTime.split(" ").slice(-2).join(" "), margin + 4, metaY + 10);

  // Col 2: Loan Account
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("LOAN ACCOUNT", margin + colW + 4, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(loanId, margin + colW + 4, metaY + 5);
  doc.setFont("helvetica", "normal");
  doc.text(loan ? `${loan.interestMethod || loan.type || "Standard"} Loan` : "Active Loan", margin + colW + 4, metaY + 10);

  // Col 3: Payment ID / Mode
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PAYMENT MODE", margin + colW * 2 + 4, metaY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(paymentMethod, margin + colW * 2 + 4, metaY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(receipt.paymentId, margin + colW * 2 + 4, metaY + 10);

  // Col 4: Status
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("RECEIPT STATUS", margin + colW * 3 + 4, metaY);
  const isCancelled = receipt.status === "Cancelled";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  if (isCancelled) {
    doc.setTextColor(220, 38, 38); // red
    doc.text("CANCELLED", margin + colW * 3 + 4, metaY + 6);
  } else {
    doc.setTextColor(16, 185, 129); // emerald
    doc.text("SUCCESS / PAID", margin + colW * 3 + 4, metaY + 6);
  }

  // 4. Borrower & Officer Cards (2 side-by-side boxes)
  const boxW = (contentWidth - 6) / 2;
  const boxY = 63;
  const boxH = 26;

  // Borrower Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, boxY, boxW, boxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text("BORROWER / CUSTOMER DETAILS", margin + 4, boxY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName, margin + 4, boxY + 11.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Customer ID: ${customerId}`, margin + 4, boxY + 16.5);
  doc.text(`Mobile: ${customerMobile}`, margin + 4, boxY + 21);

  // Collecting Officer Box
  const officerX = margin + boxW + 6;
  doc.roundedRect(officerX, boxY, boxW, boxH, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(59, 130, 246);
  doc.text("COLLECTION & RECONCILIATION", officerX + 4, boxY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(collector, officerX + 4, boxY + 11.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Branch: Main Field Operations", officerX + 4, boxY + 16.5);
  if (payment?.bankTransactionId) {
    doc.text(`UTR / Ref: ${payment.bankTransactionId}`, officerX + 4, boxY + 21);
  } else {
    doc.text(`Status: Verified & Acknowledged`, officerX + 4, boxY + 21);
  }

  // 5. Itemized Breakdown Table
  let tableY = 95;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, tableY, contentWidth, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("DESCRIPTION / ITEM", margin + 4, tableY + 5.5);
  doc.text("AMOUNT (INR)", pageWidth - margin - 4, tableY + 5.5, { align: "right" });

  tableY += 8;

  // Table Rows
  const tableRows: [string, string, boolean][] = [];

  const emiOnlyPaid = Math.max(0, receipt.amount - lateFeePaid);
  if (principalPaid > 0) {
    tableRows.push(["Principal Repayment Component", inr(principalPaid), false]);
  }
  if (interestPaid > 0) {
    tableRows.push(["Interest Component", inr(interestPaid), false]);
  }
  if (principalPaid === 0 && interestPaid === 0 && emiOnlyPaid > 0) {
    tableRows.push(["EMI Repayment Amount", inr(emiOnlyPaid), false]);
  }
  if (lateFeePaid > 0) {
    tableRows.push(["Late Payment Penalty / Overdue Charges", inr(lateFeePaid), false]);
  }

  tableRows.forEach(([desc, amt], idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, tableY, contentWidth, 7.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, tableY + 7.5, pageWidth - margin, tableY + 7.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(desc, margin + 4, tableY + 5);

    doc.setFont("helvetica", "bold");
    doc.text(amt, pageWidth - margin - 4, tableY + 5, { align: "right" });

    tableY += 7.5;
  });

  // Total Highlight Row (Green banner)
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(margin, tableY, contentWidth, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL AMOUNT RECEIVED", margin + 4, tableY + 6.5);
  doc.setFontSize(11);
  doc.text(inr(receipt.amount), pageWidth - margin - 4, tableY + 6.5, { align: "right" });

  tableY += 10;

  // Outstanding balance if provided
  if (remainingBalance !== undefined) {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, tableY, contentWidth, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, tableY, contentWidth, 8, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("CLOSING PRINCIPAL OUTSTANDING", margin + 4, tableY + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(inr(remainingBalance), pageWidth - margin - 4, tableY + 5.5, { align: "right" });

    tableY += 12;
  } else {
    tableY += 6;
  }

  // 6. Security Stamp & Authorized Seal
  const sealY = Math.max(tableY, 155);

  // Digital Verification Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, sealY, 95, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text("SYSTEM VERIFIED RECEIPT", margin + 4, sealY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Digital Seal Ref: ${receipt.id}-${Date.now().toString(36).toUpperCase()}`, margin + 4, sealY + 11);
  doc.text("Valid official electronic acknowledgment. No physical signature required.", margin + 4, sealY + 16);
  doc.text(`Generated on: ${fmtDateTime(new Date().toISOString())}`, margin + 4, sealY + 20.5);

  // Signatory Box
  const sigX = pageWidth - margin - 65;
  doc.setDrawColor(203, 213, 225);
  doc.line(sigX, sealY + 16, sigX + 65, sealY + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Signatory", sigX + 32.5, sealY + 20.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(businessName, sigX + 32.5, sealY + 24, { align: "center" });

  // 7. Footer Note
  const footerY = 282;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  const footerText = settings?.receiptFooter || "Thank you for your prompt repayment. Please retain this receipt for your records.";
  doc.text(footerText, pageWidth / 2, footerY, { align: "center" });
  doc.text(`Aarigo Capital Loan Management & Collection System  |  Page 1 of 1`, pageWidth / 2, footerY + 4, { align: "center" });

  // Output as Blob
  const blob = doc.output("blob");
  const filename = `Receipt_${receipt.id}_${customerName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

  return { blob, filename };
}

/**
 * Directly downloads the generated Receipt PDF to the client device
 */
export async function downloadReceiptPdf(params: ReceiptPdfParams): Promise<string> {
  const { blob, filename } = await generateReceiptPdfBlob(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`PDF downloaded: ${filename}`);
  return filename;
}

/**
 * Universal WhatsApp PDF Sharing targeted to the registered phone number:
 * 1. On Mobile & Web Share API supported devices:
 *    Natively shares the actual PDF file directly to WhatsApp!
 * 2. On Desktop Web browsers:
 *    Automatically downloads the PDF, copies receipt details to clipboard,
 *    and opens the registered customer's WhatsApp chat with ready-to-paste instructions!
 */
export async function shareReceiptPdfOnWhatsApp(params: ReceiptPdfParams, targetPhone?: string): Promise<boolean> {
  const cleanPhone = normalizePhoneForWhatsApp(targetPhone || params.customer?.mobile || params.customer?.altMobile);
  const textMessage = formatReceiptWhatsAppMessage(params);

  try {
    toast.info("Generating official PDF receipt...");
    const { blob, filename } = await generateReceiptPdfBlob(params);
    const pdfFile = new File([blob], filename, { type: "application/pdf" });

    // Method 1: Web Share API Level 2 (Android, iOS, iPad, PWA, Chrome/Edge mobile)
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Receipt #${params.receipt.id}`,
          text: textMessage,
        });
        toast.success(`PDF Receipt ${params.receipt.id} shared to WhatsApp!`);
        return true;
      } catch (shareErr) {
        if ((shareErr as Error)?.name === "AbortError") {
          return false; // User closed the native share sheet
        }
        // Fall back to desktop method if native share failed
      }
    }

    // Method 2: Desktop WhatsApp Web Workflow
    // A) Automatically download the PDF file to user's device
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // B) Copy message to clipboard
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(textMessage);
      } catch {
        // Clipboard write error ignored
      }
    }

    // C) Open WhatsApp chat directly with the registered phone number
    const isMobile = typeof navigator !== "undefined" && /mobile|android|iphone|ipad/i.test(navigator.userAgent);
    const waUrl = cleanPhone
      ? isMobile
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`
        : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(textMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");

    // D) Show clear user instruction toast
    const phoneDisplay = cleanPhone ? `+${cleanPhone}` : "Customer";
    toast.success(
      `📄 "${filename}" downloaded! Opening WhatsApp for ${phoneDisplay}. Attach or drag & drop the PDF into the chat.`,
      { duration: 9000 }
    );
    return true;
  } catch (err) {
    console.error("PDF WhatsApp share error:", err);
    toast.error("Failed to generate PDF for WhatsApp share");
    return false;
  }
}

export interface EmiSchedulePdfParams {
  loan: Loan;
  customer?: Customer | null | undefined;
  sched: {
    rows: Array<{
      emiNo: number;
      dueDate: string;
      emiAmount: number;
      principalComponent: number;
      interestComponent: number;
      paidAmount: number;
      closingBalance: number;
      status: string;
    }>;
    totalPaid: number;
    totalPrincipalPaid: number;
    totalInterestPaid: number;
    outstandingPrincipal: number;
  };
  settings?: Settings | null | undefined;
}

/**
 * Generates an official, multi-page printable EMI Repayment Schedule PDF
 */
export async function generateEmiSchedulePdfBlob(params: EmiSchedulePdfParams): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { loan, customer, sched, settings } = params;
  const businessName = settings?.businessName || "AARIGO CAPITAL";
  const customerName = customer?.name || "Customer";
  const customerMobile = customer?.mobile || "N/A";

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const drawHeader = (pageNum: number) => {
    // Brand header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 4.5, "F");
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 4.5, pageWidth, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(businessName.toUpperCase(), margin, 15);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL LOAN REPAYMENT SCHEDULE", margin, 20);

    // Meta box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, 24, contentWidth, 16, 1.5, 1.5, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, 24, contentWidth, 16, 1.5, 1.5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("LOAN ID", margin + 3, 29);
    doc.text("BORROWER", margin + 45, 29);
    doc.text("LOAN AMOUNT", margin + 105, 29);
    doc.text("TENURE & FREQUENCY", margin + 145, 29);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(loan.id, margin + 3, 35);
    doc.text(`${customerName} (${customerMobile})`, margin + 45, 35);
    doc.text(inr(loan.principal), margin + 105, 35);
    doc.text(`${loan.tenure} Installments (${loan.frequency})`, margin + 145, 35);
  };

  drawHeader(1);

  // Table Column Headers
  const colWidths = [12, 24, 28, 28, 24, 26, 22, 18]; // sum = 182mm
  const colTitles = ["No", "Due Date", "EMI (INR)", "Principal", "Interest", "Paid (INR)", "Balance", "Status"];

  let curY = 46;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let curX = margin;
    colTitles.forEach((t, i) => {
      const align = i === 0 ? "center" : i >= 2 && i <= 6 ? "right" : "left";
      const printX = align === "center" ? curX + colWidths[i] / 2 : align === "right" ? curX + colWidths[i] - 2 : curX + 2;
      doc.text(t, printX, y + 4.8, { align: align as any });
      curX += colWidths[i];
    });
  };

  drawTableHeader(curY);
  curY += 7;

  let pageIndex = 1;

  // Print schedule rows
  sched.rows.forEach((row, idx) => {
    // Check page break
    if (curY > pageHeight - 25) {
      // Page footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${pageIndex}`, pageWidth / 2, pageHeight - 8, { align: "center" });

      doc.addPage();
      pageIndex++;
      drawHeader(pageIndex);
      curY = 46;
      drawTableHeader(curY);
      curY += 7;
    }

    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(margin, curY, contentWidth, 6, "F");
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, curY + 6, pageWidth - margin, curY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    const values = [
      String(row.emiNo),
      fmtDate(row.dueDate),
      inr(row.emiAmount),
      inr(row.principalComponent),
      inr(row.interestComponent),
      inr(row.paidAmount),
      inr(row.closingBalance),
      row.status,
    ];

    let rowX = margin;
    values.forEach((v, i) => {
      const align = i === 0 ? "center" : i >= 2 && i <= 6 ? "right" : "left";
      const printX = align === "center" ? rowX + colWidths[i] / 2 : align === "right" ? rowX + colWidths[i] - 2 : rowX + 2;
      if (i === 7) {
        // Status color
        if (v === "Paid") doc.setTextColor(16, 185, 129);
        else if (v === "Overdue") doc.setTextColor(220, 38, 38);
        else if (v === "Partial") doc.setTextColor(217, 119, 6);
        else doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", i === 2 ? "bold" : "normal");
        doc.setTextColor(51, 65, 85);
      }
      doc.text(v, printX, curY + 4.2, { align: align as any });
      rowX += colWidths[i];
    });

    curY += 6;
  });

  // Footer on final page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Page ${pageIndex} of ${pageIndex}  |  Generated on ${fmtDateTime(new Date().toISOString())}  |  ${businessName}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: "center" }
  );

  const blob = doc.output("blob");
  const filename = `EMI_Schedule_${loan.id}_${customerName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  return { blob, filename };
}

/**
 * Downloads the generated EMI Schedule PDF
 */
export async function downloadEmiSchedulePdf(params: EmiSchedulePdfParams): Promise<string> {
  const { blob, filename } = await generateEmiSchedulePdfBlob(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Downloaded: ${filename}`);
  return filename;
}

/**
 * Shares EMI Schedule PDF via WhatsApp
 */
export async function shareEmiSchedulePdfOnWhatsApp(params: EmiSchedulePdfParams): Promise<boolean> {
  const cleanPhone = normalizePhoneForWhatsApp(params.customer?.mobile);
  const businessName = params.settings?.businessName || "AARIGO CAPITAL";

  const messageText = [
    `📊 *EMI REPAYMENT SCHEDULE*`,
    `*${businessName.toUpperCase()}*`,
    `───────────────────────`,
    `💼 *Loan Ref:* ${params.loan.id}`,
    `👤 *Borrower:* ${params.customer?.name ?? "Customer"}`,
    `💰 *Principal Amount:* ${inr(params.loan.principal)}`,
    `🗓️ *Total Tenor:* ${params.loan.tenure} Installments (${params.loan.frequency})`,
    `📉 *Remaining Principal:* ${inr(params.sched.outstandingPrincipal)}`,
    `───────────────────────`,
    `Please find your complete verified repayment schedule document attached.`,
  ].join("\n");

  try {
    toast.info("Generating EMI Schedule PDF...");
    const { blob, filename } = await generateEmiSchedulePdfBlob(params);
    const pdfFile = new File([blob], filename, { type: "application/pdf" });

    // Web Share API Level 2 (Mobile / Tablets / Modern browsers)
    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `EMI Schedule - ${params.loan.id}`,
          text: messageText,
        });
        toast.success(`EMI Schedule shared via WhatsApp!`);
        return true;
      } catch (shareErr) {
        if ((shareErr as Error)?.name === "AbortError") {
          return false;
        }
      }
    }

    // Desktop Workflow: Download + Clipboard + Open WhatsApp
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(messageText);
      } catch {
        // Clipboard write failed or was denied, continue silently
      }
    }

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");

    toast.success(
      `📄 "${filename}" downloaded! Opening WhatsApp. Attach the PDF directly into the chat.`,
      { duration: 8000 }
    );
    return true;
  } catch (err) {
    console.error("EMI Schedule PDF share error:", err);
    toast.error("Failed to generate EMI Schedule PDF");
    return false;
  }
}

