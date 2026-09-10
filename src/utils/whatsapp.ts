import type { Customer, Loan, Payment, Receipt, Settings } from "@/types";
import { inr, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

export interface ShareReceiptParams {
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
 * Normalizes Indian and international phone numbers for WhatsApp URL (wa.me/...)
 */
export function normalizePhoneForWhatsApp(mobile?: string | null): string {
  if (!mobile) return "";
  const cleaned = mobile.replace(/\D/g, "");
  if (!cleaned) return "";

  // If 10 digits (Standard Indian mobile), prepend country code 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  // If 12 digits starting with 91, return as is
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned;
  }

  // If 11 digits starting with 0, replace 0 with 91
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return `91${cleaned.slice(1)}`;
  }

  return cleaned;
}

/**
 * Formats a clean, high-standard official receipt text message for WhatsApp
 */
export function formatReceiptWhatsAppMessage(params: ShareReceiptParams): string {
  const {
    receipt,
    customer,
    payment,
    loan,
    settings,
    adminName,
    remainingBalance,
    principalPaid,
    interestPaid,
    lateFeePaid,
  } = params;

  const businessName = settings?.businessName || "AARIGO CAPITAL";
  const customerName = customer?.name || "Customer";
  const customerId = customer?.id || receipt.customerId;
  const loanId = receipt.loanId || loan?.id || "N/A";
  const amount = inr(receipt.amount);
  const method = receipt.method || payment?.method || "Cash";
  const dateTime = fmtDateTime(receipt.date);
  const collector = payment?.collectedBy || adminName || "Authorized Officer";

  const lines: string[] = [
    `🧾 *OFFICIAL PAYMENT RECEIPT*`,
    `*${businessName.toUpperCase()}*`,
    settings?.businessAddress ? `📍 ${settings.businessAddress}` : "",
    settings?.businessPhone ? `📞 ${settings.businessPhone}` : "",
    `───────────────────────`,
    `📄 *Receipt No:* ${receipt.id}`,
    `💳 *Payment Ref:* ${receipt.paymentId}`,
    `📅 *Date & Time:* ${dateTime}`,
    `───────────────────────`,
    `👤 *Borrower:* ${customerName}`,
    `🆔 *Customer ID:* ${customerId}`,
    customer?.mobile ? `📱 *Mobile:* ${customer.mobile}` : "",
    `💼 *Loan Ref:* ${loanId}`,
    `───────────────────────`,
    `💰 *AMOUNT RECEIVED:* ${amount}`,
    `🏷️ *Payment Mode:* ${method}`,
    receipt.status === "Cancelled" ? `⚠️ *Status: CANCELLED*` : `✅ *Status: Confirmed & Credited*`,
  ];

  // Optional itemized breakdown
  if (principalPaid !== undefined || interestPaid !== undefined || (lateFeePaid && lateFeePaid > 0)) {
    lines.push(`───────────────────────`);
    lines.push(`📊 *Breakdown:*`);
    if (principalPaid !== undefined) {
      lines.push(` • Principal: ${inr(principalPaid)}`);
    }
    if (interestPaid !== undefined) {
      lines.push(` • Interest: ${inr(interestPaid)}`);
    }
    if (lateFeePaid && lateFeePaid > 0) {
      lines.push(` • Late Charges Paid: ${inr(lateFeePaid)}`);
    }
  }

  // Outstanding loan balance
  if (remainingBalance !== undefined) {
    lines.push(`───────────────────────`);
    lines.push(`📉 *Remaining Principal Due:* ${inr(remainingBalance)}`);
  }

  // Direct online verification & PDF download link
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (origin) {
    lines.push(`───────────────────────`);
    lines.push(`📄 *View / Download Digital PDF Receipt:*`);
    lines.push(`${origin}/receipts?id=${receipt.id}`);
  }

  lines.push(`───────────────────────`);
  lines.push(`👨‍💼 *Collected By:* ${collector}`);
  lines.push(settings?.receiptFooter || `🙏 *Thank you for your prompt repayment!*`);
  lines.push(`_Preserve this message as official confirmation of your payment._`);

  return lines.filter(Boolean).join("\n");
}

/**
 * Builds the WhatsApp web / mobile share URL targeted to a specific phone number
 */
export function getWhatsAppReceiptUrl(params: ShareReceiptParams, targetPhone?: string): string {
  const text = formatReceiptWhatsAppMessage(params);
  const cleanPhone = normalizePhoneForWhatsApp(targetPhone || params.customer?.mobile);
  const isMobile = typeof navigator !== "undefined" && /mobile|android|iphone|ipad/i.test(navigator.userAgent);

  if (cleanPhone) {
    if (isMobile) {
      return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    }
    // On Desktop, opening web.whatsapp.com directly targets the registered customer's conversation
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  }

  // Fallback allowing officer to pick any WhatsApp contact
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Triggers WhatsApp sharing for a receipt targeted to a registered phone number
 */
export async function shareReceiptOnWhatsApp(params: ShareReceiptParams, targetPhone?: string): Promise<boolean> {
  try {
    const cleanPhone = normalizePhoneForWhatsApp(targetPhone || params.customer?.mobile);
    const url = getWhatsAppReceiptUrl(params, targetPhone);
    const text = formatReceiptWhatsAppMessage(params);

    // If Web Share API is available on mobile
    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `Payment Receipt ${params.receipt.id}`,
          text: text,
        });
        toast.success(`Receipt ${params.receipt.id} shared successfully`);
        return true;
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          window.open(url, "_blank", "noopener,noreferrer");
          toast.success("Opening WhatsApp with registered number...");
          return true;
        }
        return false;
      }
    }

    // Standard Desktop action
    window.open(url, "_blank", "noopener,noreferrer");
    const targetLabel = cleanPhone ? `to +${cleanPhone}` : "";
    toast.success(`Opening WhatsApp ${targetLabel} for receipt #${params.receipt.id}`);
    return true;
  } catch {
    toast.error("Failed to initiate WhatsApp share");
    return false;
  }
}
