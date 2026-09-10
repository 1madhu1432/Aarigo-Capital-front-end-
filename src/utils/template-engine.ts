/**
 * Template Engine & Default HTML Templates for LoanFlow Hub Documents
 */

export interface TemplateDefinition {
  id: string;
  name: string;
  category: "Receipt" | "Agreement" | "Schedule" | "Statement" | "Certificate" | "Notice" | "Application" | "Voucher";
  description: string;
  icon: string;
  defaultHtml: string;
  variables: { key: string; description: string; sample: string }[];
}

export const DEFAULT_TEMPLATES: Record<string, TemplateDefinition> = {
  payment_receipt: {
    id: "payment_receipt",
    name: "Payment Receipt",
    category: "Receipt",
    description: "Official customer repayment receipt for EMI collections (Thermal POS 80mm & A4/A5)",
    icon: "Receipt",
    variables: [
      { key: "business_name", description: "Lending institution / agency name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Registered business address", sample: "Shop 14, Main Market, Sector 22, Mumbai, MH" },
      { key: "business_phone", description: "Customer care / contact phone", sample: "+91 98765 43210" },
      { key: "business_email", description: "Business support email", sample: "support@loanflow.com" },
      { key: "receipt_id", description: "Receipt serial number", sample: "REC-2026-0842" },
      { key: "payment_id", description: "Payment transaction ID", sample: "PAY-1049" },
      { key: "date", description: "Payment date (formatted)", sample: "07 Sep 2026" },
      { key: "time", description: "Payment time", sample: "03:45 PM" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "customer_name", description: "Customer full name", sample: "Aarav Sharma" },
      { key: "customer_mobile", description: "Customer phone number", sample: "+91 98765 01234" },
      { key: "loan_id", description: "Loan contract ID", sample: "LN-001" },
      { key: "emi_no", description: "Installment number", sample: "4 of 12" },
      { key: "payment_method", description: "Method (Cash / UPI / Bank)", sample: "UPI (Google Pay)" },
      { key: "collector_name", description: "Collection agent / officer name", sample: "Rajesh Kumar (Agent #102)" },
      { key: "installment_amount", description: "Principal & interest EMI amount", sample: "₹2,500" },
      { key: "late_fee_paid", description: "Late fee charges paid", sample: "₹0" },
      { key: "total_paid", description: "Total received amount", sample: "₹2,500" },
      { key: "total_paid_words", description: "Amount in words", sample: "Two Thousand Five Hundred Rupees Only" },
      { key: "principal_component", description: "Principal portion of payment", sample: "₹2,150" },
      { key: "interest_component", description: "Interest portion of payment", sample: "₹350" },
      { key: "closing_balance", description: "Remaining loan balance", sample: "₹20,000" },
      { key: "receipt_footer", description: "Footer disclaimer note", sample: "Thank you for your timely repayment. Keep this receipt for your records." },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - {{receipt_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; font-size: 12px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      margin: 0;
      padding: 24px;
      line-height: 1.4;
    }
    .receipt-container {
      max-width: 480px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #cbd5e1;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .org-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      margin: 0 0 4px;
    }
    .org-sub {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .grid-table td {
      padding: 5px 0;
    }
    .grid-table td.label {
      color: #64748b;
      width: 40%;
    }
    .grid-table td.val {
      font-weight: 600;
      text-align: right;
      color: #0f172a;
    }
    .amount-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      margin-bottom: 16px;
    }
    .amount-val {
      font-size: 24px;
      font-weight: 800;
      color: #059669;
      font-family: monospace;
    }
    .amount-words {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-style: italic;
    }
    .footer {
      border-top: 2px dashed #cbd5e1;
      padding-top: 14px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
    }
    .stamp-box {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1 class="org-title">{{business_name}}</h1>
      <p class="org-sub">{{business_address}}</p>
      <p class="org-sub">Tel: {{business_phone}} | {{business_email}}</p>
      <div class="badge">Official Repayment Receipt</div>
    </div>

    <table class="grid-table">
      <tr>
        <td class="label">Receipt No:</td>
        <td class="val" style="font-family: monospace;">{{receipt_id}}</td>
      </tr>
      <tr>
        <td class="label">Date & Time:</td>
        <td class="val">{{date}} at {{time}}</td>
      </tr>
      <tr>
        <td class="label">Customer Name:</td>
        <td class="val">{{customer_name}} ({{customer_id}})</td>
      </tr>
      <tr>
        <td class="label">Loan Contract:</td>
        <td class="val" style="font-family: monospace;">{{loan_id}} (Installment: {{emi_no}})</td>
      </tr>
      <tr>
        <td class="label">Payment Mode:</td>
        <td class="val">{{payment_method}}</td>
      </tr>
      <tr>
        <td class="label">Collected By:</td>
        <td class="val">{{collector_name}}</td>
      </tr>
    </table>

    <div class="amount-box">
      <div class="section-title">Received With Thanks</div>
      <div class="amount-val">{{total_paid}}</div>
      <div class="amount-words">({{total_paid_words}})</div>
    </div>

    <table class="grid-table" style="border-top: 1px solid #f1f5f9; padding-top: 8px;">
      <tr>
        <td class="label">Principal Applied:</td>
        <td class="val">{{principal_component}}</td>
      </tr>
      <tr>
        <td class="label">Interest Applied:</td>
        <td class="val">{{interest_component}}</td>
      </tr>
      <tr>
        <td class="label">Late Charges / Penalties:</td>
        <td class="val">{{late_fee_paid}}</td>
      </tr>
      <tr style="font-weight: bold;">
        <td class="label" style="font-weight: 700; color: #0f172a;">Remaining Loan Balance:</td>
        <td class="val" style="color: #2563eb;">{{closing_balance}}</td>
      </tr>
    </table>

    <div class="stamp-box">
      <div>Authorized Signatory<br><strong>{{business_name}}</strong></div>
      <div style="text-align: right;">System Generated<br><strong>Verified Online</strong></div>
    </div>

    <div class="footer">
      <p>{{receipt_footer}}</p>
    </div>
  </div>
</body>
</html>`,
  },

  sanction_agreement: {
    id: "sanction_agreement",
    name: "Loan Sanction Agreement",
    category: "Agreement",
    description: "Legal lending contract between Borrower, Guarantor, and Financial Institution",
    icon: "FileText",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Business address", sample: "Sector 22, Mumbai, MH" },
      { key: "business_phone", description: "Business phone", sample: "+91 98765 43210" },
      { key: "loan_id", description: "Loan reference number", sample: "LN-2026-0042" },
      { key: "sanction_date", description: "Sanction date", sample: "01 Sep 2026" },
      { key: "first_emi_date", description: "First repayment due date", sample: "01 Oct 2026" },
      { key: "end_date", description: "Maturity / completion date", sample: "01 Sep 2027" },
      { key: "customer_name", description: "Borrower full name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Borrower ID", sample: "CUS-001" },
      { key: "customer_mobile", description: "Borrower phone", sample: "+91 98765 01234" },
      { key: "customer_address", description: "Borrower residence address", sample: "House 12, Gandhi Nagar, Andheri East, Mumbai" },
      { key: "kyc_number", description: "Aadhaar or PAN number", sample: "XXXX-XXXX-4821" },
      { key: "guarantor_name", description: "Guarantor full name", sample: "Sunita Sharma" },
      { key: "guarantor_mobile", description: "Guarantor mobile", sample: "+91 98765 99887" },
      { key: "guarantor_relationship", description: "Relationship with borrower", sample: "Spouse" },
      { key: "guarantor_address", description: "Guarantor residence address", sample: "Same as borrower" },
      { key: "principal", description: "Sanctioned loan amount", sample: "₹50,000" },
      { key: "processing_fee", description: "Upfront processing fee", sample: "₹1,000" },
      { key: "insurance", description: "Credit insurance charge", sample: "₹500" },
      { key: "net_disbursed", description: "Net payout to borrower", sample: "₹48,500" },
      { key: "interest_rate", description: "Annual interest rate %", sample: "18%" },
      { key: "interest_method", description: "Flat or Reducing balance", sample: "Flat" },
      { key: "total_interest", description: "Total calculated interest", sample: "₹9,000" },
      { key: "total_payable", description: "Total repayable amount", sample: "₹59,000" },
      { key: "tenure", description: "Loan repayment tenure", sample: "12 Months" },
      { key: "frequency", description: "Repayment frequency", sample: "Monthly" },
      { key: "emi_amount", description: "Installment amount", sample: "₹4,917" },
      { key: "disbursement_method", description: "Payout mode (Cash / Bank)", sample: "Bank Transfer" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loan Sanction Agreement - {{loan_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; font-size: 11px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 30px;
      line-height: 1.5;
    }
    .agreement-container {
      max-width: 750px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .org-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #2563eb;
      margin-top: 4px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .party-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      font-size: 11px;
      background: #f8fafc;
    }
    .party-card h4 {
      margin: 0 0 8px;
      font-size: 11px;
      text-transform: uppercase;
      color: #0284c7;
      font-weight: 700;
    }
    .terms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 11px;
    }
    .terms-table th, .terms-table td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
    }
    .terms-table th {
      background: #f1f5f9;
      text-align: left;
      font-weight: 600;
      color: #475569;
      width: 25%;
    }
    .terms-table td {
      font-weight: 600;
      width: 25%;
    }
    .clauses {
      font-size: 10.5px;
      color: #334155;
      margin: 16px 0;
      padding: 12px;
      background: #f8fafc;
      border-left: 3px solid #0284c7;
      border-radius: 0 6px 6px 0;
    }
    .clauses ol {
      margin: 0;
      padding-left: 18px;
    }
    .clauses li {
      margin-bottom: 6px;
    }
    .signatures {
      margin-top: 50px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      text-align: center;
      font-size: 11px;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      padding-top: 6px;
      font-weight: 600;
    }
    .sig-sub {
      font-size: 9px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="agreement-container">
    <div class="header">
      <div>
        <h1 class="org-title">{{business_name}}</h1>
        <div class="doc-title">Loan Sanction & Hypothecation Agreement</div>
      </div>
      <div class="meta-box">
        <strong>Loan ID:</strong> {{loan_id}}<br>
        <strong>Sanction Date:</strong> {{sanction_date}}
      </div>
    </div>

    <div class="parties-grid">
      <div class="party-card">
        <h4>1. Borrower Details</h4>
        <strong>Name:</strong> {{customer_name}} (ID: {{customer_id}})<br>
        <strong>Mobile:</strong> {{customer_mobile}}<br>
        <strong>KYC ID:</strong> {{kyc_number}}<br>
        <strong>Address:</strong> {{customer_address}}
      </div>
      <div class="party-card">
        <h4>2. Guarantor Details</h4>
        <strong>Name:</strong> {{guarantor_name}} ({{guarantor_relationship}})<br>
        <strong>Mobile:</strong> {{guarantor_mobile}}<br>
        <strong>Address:</strong> {{guarantor_address}}
      </div>
    </div>

    <h3 style="font-size: 12px; text-transform: uppercase; margin-bottom: 6px; color: #0f172a;">Sanction Terms & Financial Details</h3>
    <table class="terms-table">
      <tr>
        <th>Sanctioned Principal</th>
        <td style="color: #059669; font-size: 13px;">{{principal}}</td>
        <th>Net Payout Disbursed</th>
        <td>{{net_disbursed}}</td>
      </tr>
      <tr>
        <th>Interest Rate</th>
        <td>{{interest_rate}} ({{interest_method}})</td>
        <th>Total Interest</th>
        <td>{{total_interest}}</td>
      </tr>
      <tr>
        <th>Processing Fee</th>
        <td>{{processing_fee}}</td>
        <th>Loan Insurance</th>
        <td>{{insurance}}</td>
      </tr>
      <tr>
        <th>Repayment Tenure</th>
        <td>{{tenure}}</td>
        <th>EMI Installment</th>
        <td style="color: #2563eb; font-size: 13px;">{{emi_amount}} / {{frequency}}</td>
      </tr>
      <tr>
        <th>First EMI Date</th>
        <td>{{first_emi_date}}</td>
        <th>Maturity Date</th>
        <td>{{end_date}}</td>
      </tr>
      <tr>
        <th>Total Repayable</th>
        <td colspan="3" style="font-size: 13px;">{{total_payable}}</td>
      </tr>
    </table>

    <div class="clauses">
      <strong>Terms & Legal Undertakings:</strong>
      <ol>
        <li>The Borrower promises to repay the total loan amount with agreed interest in regular installments on or before the due date.</li>
        <li>In the event of default or late payment, the institution reserves the right to levy institutional late fee charges per day.</li>
        <li>The Guarantor acknowledges personal and joint liability for the full repayment of this loan obligation.</li>
        <li>The Borrower agrees that loan proceeds will only be utilized for lawful income generation or personal purposes.</li>
      </ol>
    </div>

    <div class="signatures">
      <div>
        <div class="sig-line">Borrower Signature</div>
        <div class="sig-sub">{{customer_name}}</div>
      </div>
      <div>
        <div class="sig-line">Guarantor Signature</div>
        <div class="sig-sub">{{guarantor_name}}</div>
      </div>
      <div>
        <div class="sig-line">Authorized Signatory</div>
        <div class="sig-sub">{{business_name}}</div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  emi_schedule: {
    id: "emi_schedule",
    name: "EMI Repayment Schedule",
    category: "Schedule",
    description: "Amortization schedule sheet with installment breakdown and institutional conditions",
    icon: "Calendar",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_phone", description: "Contact phone", sample: "+91 98765 43210" },
      { key: "loan_id", description: "Loan contract ID", sample: "LN-001" },
      { key: "customer_name", description: "Customer name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "principal", description: "Principal sanctioned", sample: "₹50,000" },
      { key: "emi_amount", description: "Installment amount", sample: "₹4,917" },
      { key: "tenure", description: "Tenure", sample: "12 Months" },
      { key: "frequency", description: "Frequency", sample: "Monthly" },
      { key: "start_date", description: "Start date", sample: "01 Sep 2026" },
      { key: "maturity_date", description: "End date", sample: "01 Sep 2027" },
      { key: "schedule_rows_html", description: "Dynamic HTML table rows for schedule", sample: "<tr><td>1</td><td>01 Oct 2026</td><td>₹4,917</td><td>₹4,167</td><td>₹750</td><td>₹45,833</td><td>Pending</td></tr>" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Repayment Schedule - {{loan_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; font-size: 11px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 24px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .org-title { font-size: 18px; font-weight: 800; margin: 0; }
    .doc-title { font-size: 13px; font-weight: 700; color: #2563eb; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 11px;
    }
    .summary-item .label { color: #64748b; font-size: 10px; text-transform: uppercase; }
    .summary-item .val { font-weight: 700; color: #0f172a; margin-top: 2px; }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .schedule-table th, .schedule-table td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
    }
    .schedule-table th {
      background: #f1f5f9;
      font-weight: 700;
      text-align: left;
    }
    .schedule-table tr:nth-child(even) { background: #fafafa; }
    .footer-note {
      margin-top: 20px;
      font-size: 10px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="org-title">{{business_name}}</h1>
      <div class="doc-title">EMI Repayment Schedule</div>
    </div>
    <div style="text-align: right; font-size: 11px;">
      <strong>Loan ID:</strong> {{loan_id}}<br>
      <strong>Customer:</strong> {{customer_name}} ({{customer_id}})
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-item"><div class="label">Principal</div><div class="val">{{principal}}</div></div>
    <div class="summary-item"><div class="label">EMI Amount</div><div class="val">{{emi_amount}}</div></div>
    <div class="summary-item"><div class="label">Tenure / Frequency</div><div class="val">{{tenure}} ({{frequency}})</div></div>
    <div class="summary-item"><div class="label">Start / Maturity</div><div class="val">{{start_date}} → {{maturity_date}}</div></div>
  </div>

  <table class="schedule-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th>Due Date</th>
        <th style="text-align: right;">Installment</th>
        <th style="text-align: right;">Principal</th>
        <th style="text-align: right;">Interest</th>
        <th style="text-align: right;">Closing Balance</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      {{schedule_rows_html}}
    </tbody>
  </table>

  <div class="footer-note">
    Installments are due on the specified dates. Grace periods and late charges apply as per agreement terms. Support: {{business_phone}}
  </div>
</body>
</html>`,
  },

  account_statement: {
    id: "account_statement",
    name: "Customer Account Statement",
    category: "Statement",
    description: "Official borrower ledger statement of debit, credit, and running balance dues",
    icon: "FileSpreadsheet",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Business address", sample: "Sector 22, Mumbai, MH" },
      { key: "business_phone", description: "Business phone", sample: "+91 98765 43210" },
      { key: "statement_date", description: "Statement generated on", sample: "07 Sep 2026" },
      { key: "customer_name", description: "Customer full name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "customer_mobile", description: "Customer phone", sample: "+91 98765 01234" },
      { key: "customer_address", description: "Customer address", sample: "Andheri East, Mumbai" },
      { key: "credit_limit", description: "Sanctioned credit limit", sample: "₹1,00,000" },
      { key: "active_loans_count", description: "Number of active loans", sample: "1" },
      { key: "total_outstanding", description: "Total current balance due", sample: "₹20,000" },
      { key: "overdue_balance", description: "Overdue pending amount", sample: "₹0" },
      { key: "ledger_rows_html", description: "Ledger transaction entries", sample: "<tr><td>01 Sep 2026</td><td>DISB-101</td><td>Loan Disbursement</td><td>₹50,000</td><td>—</td><td>₹50,000</td></tr>" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Account Statement - {{customer_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; font-size: 11px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 24px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .org-title { font-size: 18px; font-weight: 800; margin: 0; }
    .statement-badge {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .cust-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 11px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 16px;
      font-size: 11px;
      text-align: center;
    }
    .kpi-row .lbl { color: #64748b; font-size: 10px; text-transform: uppercase; }
    .kpi-row .val { font-weight: 700; font-size: 13px; margin-top: 2px; }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .ledger-table th, .ledger-table td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
    }
    .ledger-table th { background: #f1f5f9; font-weight: 700; }
    .ledger-table tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="org-title">{{business_name}}</h1>
      <p style="margin: 2px 0; font-size: 11px; color: #64748b;">{{business_address}} | Tel: {{business_phone}}</p>
    </div>
    <div style="text-align: right;">
      <span class="statement-badge">Official Account Statement</span>
      <p style="margin: 4px 0 0; font-size: 10px; color: #64748b;">Statement Date: {{statement_date}}</p>
    </div>
  </div>

  <div class="cust-info">
    <div>
      <strong>Customer:</strong> {{customer_name}} ({{customer_id}})<br>
      <strong>Mobile:</strong> {{customer_mobile}}<br>
      <strong>Address:</strong> {{customer_address}}
    </div>
    <div style="text-align: right;">
      <strong>Active Loans:</strong> {{active_loans_count}}<br>
      <strong>Credit Limit:</strong> {{credit_limit}}
    </div>
  </div>

  <div class="kpi-row">
    <div><div class="lbl">Credit Limit</div><div class="val">{{credit_limit}}</div></div>
    <div><div class="lbl">Active Loans</div><div class="val">{{active_loans_count}}</div></div>
    <div><div class="lbl">Total Outstanding</div><div class="val" style="color: #2563eb;">{{total_outstanding}}</div></div>
    <div><div class="lbl">Overdue Balance</div><div class="val" style="color: #dc2626;">{{overdue_balance}}</div></div>
  </div>

  <table class="ledger-table">
    <thead>
      <tr>
        <th style="text-align: left;">Date</th>
        <th style="text-align: left;">Ref No.</th>
        <th style="text-align: left;">Transaction Details</th>
        <th style="text-align: right;">Debit (₹)</th>
        <th style="text-align: right;">Credit (₹)</th>
        <th style="text-align: right;">Balance Due (₹)</th>
      </tr>
    </thead>
    <tbody>
      {{ledger_rows_html}}
    </tbody>
  </table>

  <p style="font-size: 10px; color: #64748b; margin-top: 16px; text-align: center;">
    This is a computer-generated statement and does not require physical stamp or signature.
  </p>
</body>
</html>`,
  },

  noc_certificate: {
    id: "noc_certificate",
    name: "No Objection Certificate (NOC)",
    category: "Certificate",
    description: "Official Loan Closure & Clearance Certificate confirming zero outstanding dues and full release of securities",
    icon: "ShieldCheck",
    variables: [
      { key: "business_name", description: "Institution name", sample: "AARIGO CAPITAL" },
      { key: "business_address", description: "Registered address", sample: "12-4-88, Market Road, Kadapa, Andhra Pradesh 516001" },
      { key: "business_phone", description: "Phone number", sample: "+91 98480 12345" },
      { key: "certificate_no", description: "NOC serial number", sample: "NOC-2026-0104" },
      { key: "issue_date", description: "Date of issuance", sample: "07 Sep 2026" },
      { key: "customer_name", description: "Borrower name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-000104" },
      { key: "account_id", description: "Account Unique ID", sample: "ACC-000104" },
      { key: "loan_id", description: "Settled Loan ID", sample: "LN-000104" },
      { key: "sanctioned_amount", description: "Original loan amount", sample: "₹50,000" },
      { key: "closure_date", description: "Loan closure date", sample: "05 Sep 2026" },
      { key: "closure_type", description: "Full Term or Early Settlement", sample: "Full Term Repaid (Normal Closure)" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>No Objection Certificate - {{certificate_no}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Geist", "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 30px 20px;
      line-height: 1.6;
    }
    .cert-frame {
      max-width: 720px;
      margin: 0 auto;
      border: 3px double #0D7A57;
      outline: 1px solid #cbd5e1;
      outline-offset: 4px;
      padding: 40px;
      background: #ffffff;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      position: relative;
    }
    .header { text-align: center; margin-bottom: 24px; }
    .emblem {
      display: inline-block;
      width: 44px;
      height: 44px;
      line-height: 44px;
      border-radius: 50%;
      background: #0D7A57;
      color: #ffffff;
      font-weight: 800;
      font-size: 18px;
      margin-bottom: 8px;
    }
    .org-title { font-size: 24px; font-weight: 800; letter-spacing: 1px; margin: 0; color: #0D7A57; text-transform: uppercase; }
    .org-sub { font-size: 11px; color: #64748b; margin: 2px 0; }
    .cert-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #0D7A57;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      padding: 8px 16px;
      margin: 22px 0 16px 0;
      border-radius: 4px;
      display: inline-block;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      font-size: 11px;
      color: #475569;
      margin-bottom: 20px;
    }
    .meta-bar strong { color: #0f172a; font-family: monospace; }
    .body-text { font-size: 13px; text-align: justify; margin-bottom: 20px; color: #1e293b; }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12px;
    }
    .details-table td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    .details-table td.label { background: #f8fafc; font-weight: 600; width: 42%; color: #475569; }
    .details-table td.val { font-weight: 700; color: #0f172a; font-family: monospace; font-size: 13px; }
    .cleared-badge {
      color: #059669;
      background: #ecfdf5;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 800;
      display: inline-block;
      border: 1px solid #a7f3d0;
    }
    .declaration-box {
      background: #f8fafc;
      border-left: 3px solid #0D7A57;
      padding: 12px 16px;
      font-size: 12px;
      color: #334155;
      margin: 18px 0;
      border-radius: 0 4px 4px 0;
    }
    .sign-section {
      margin-top: 48px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .sign-box {
      text-align: center;
      width: 220px;
      border-top: 1px solid #0f172a;
      padding-top: 6px;
      font-size: 11px;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 72px;
      font-weight: 900;
      color: rgba(13, 122, 87, 0.05);
      text-transform: uppercase;
      pointer-events: none;
      white-space: nowrap;
      letter-spacing: 6px;
    }
  </style>
</head>
<body>
  <div class="cert-frame">
    <div class="watermark">NIL DUES CLEARED</div>

    <div class="header">
      <div class="emblem">AC</div>
      <h1 class="org-title">{{business_name}}</h1>
      <p class="org-sub">{{business_address}}</p>
      <p class="org-sub">Customer Care: {{business_phone}} • Institutional Non-Banking Financial System</p>
      <div>
        <div class="cert-title">No Objection & Loan Clearance Certificate (NOC)</div>
      </div>
    </div>

    <div class="meta-bar">
      <div>Certificate Serial: <strong>{{certificate_no}}</strong></div>
      <div>Issue Date: <strong>{{issue_date}}</strong></div>
    </div>

    <div class="body-text">
      <p>TO WHOMSOEVER IT MAY CONCERN,</p>
      <p>This is to formally certify that borrower <strong>{{customer_name}}</strong> (Borrower ID: <strong>{{customer_id}}</strong>) has satisfactorily fulfilled and fully settled all repayment commitments towards the credit facility granted by <strong>{{business_name}}</strong> as detailed herein:</p>

      <table class="details-table">
        <tr>
          <td class="label">Loan Account Number:</td>
          <td class="val">{{loan_id}}</td>
        </tr>
        <tr>
          <td class="label">Borrower Account Number:</td>
          <td class="val">{{account_id}}</td>
        </tr>
        <tr>
          <td class="label">Original Sanctioned Principal:</td>
          <td class="val">{{sanctioned_amount}}</td>
        </tr>
        <tr>
          <td class="label">Settlement / Closure Date:</td>
          <td class="val">{{closure_date}}</td>
        </tr>
        <tr>
          <td class="label">Settlement Classification:</td>
          <td class="val">{{closure_type}}</td>
        </tr>
        <tr>
          <td class="label">Remaining Outstanding Balance:</td>
          <td class="val"><span class="cleared-badge">₹0.00 (Zero / Nil Cleared)</span></td>
        </tr>
      </table>

      <div class="declaration-box">
        <strong>Official Satisfaction & Release Declaration:</strong><br>
        We hereby declare and confirm that the aforementioned loan account is closed in full with NIL outstanding principal, interest, or late penalties. <strong>{{business_name}}</strong> holds <strong>NO OBJECTION</strong> against the borrower. All personal guarantees, promissory notes, and collateral liens pertaining to this facility stand completely discharged, revoked, and cancelled.
      </div>
    </div>

    <div class="sign-section">
      <div style="font-size: 10px; color: #64748b;">
        Place: Kadapa Central Operations<br>
        Digital Verification: SEC-NOC-{{certificate_no}}<br>
        System Clearance: Fully Verified & Locked
      </div>
      <div class="sign-box">
        <strong>Authorized Principal Officer</strong><br>
        For {{business_name}}
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  demand_notice: {
    id: "demand_notice",
    name: "Overdue Demand Notice",
    category: "Notice",
    description: "Formal default & recovery reminder notice sent to overdue borrowers",
    icon: "AlertTriangle",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_phone", description: "Branch contact phone", sample: "+91 98765 43210" },
      { key: "notice_date", description: "Notice dispatch date", sample: "07 Sep 2026" },
      { key: "customer_name", description: "Borrower name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "customer_address", description: "Borrower address", sample: "Andheri East, Mumbai" },
      { key: "loan_id", description: "Loan contract ID", sample: "LN-001" },
      { key: "overdue_installments", description: "Count of overdue EMIs", sample: "2" },
      { key: "overdue_amount", description: "Unpaid principal & interest", sample: "₹9,834" },
      { key: "late_fee_amount", description: "Accumulated late charges", sample: "₹450" },
      { key: "total_due_now", description: "Immediate amount payable", sample: "₹10,284" },
      { key: "due_by_date", description: "Final deadline date", sample: "12 Sep 2026" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Overdue Notice - {{loan_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 30px;
      line-height: 1.5;
    }
    .notice-container {
      max-width: 650px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #dc2626;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .org-title { font-size: 18px; font-weight: 800; margin: 0; color: #0f172a; }
    .badge {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
      padding: 4px 10px;
      font-weight: 700;
      font-size: 11px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      margin: 16px 0;
      font-size: 12px;
    }
    .due-amount-box {
      background: #fff1f2;
      border: 2px solid #fecdd3;
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      margin: 20px 0;
    }
    .due-val { font-size: 26px; font-weight: 800; color: #e11d48; font-family: monospace; }
  </style>
</head>
<body>
  <div class="notice-container">
    <div class="header">
      <div>
        <h1 class="org-title">{{business_name}}</h1>
        <p style="margin: 2px 0; font-size: 11px; color: #64748b;">Collections & Recovery Department</p>
      </div>
      <div>
        <span class="badge">Urgent: Overdue Notice</span>
      </div>
    </div>

    <div style="font-size: 11px; color: #475569; margin-bottom: 16px;">
      Date: <strong>{{notice_date}}</strong>
    </div>

    <div class="box">
      <strong>To:</strong><br>
      {{customer_name}} (ID: {{customer_id}})<br>
      {{customer_address}}
    </div>

    <p style="font-size: 12px;">
      <strong>Subject: Notice of Default & Demand for Immediate Payment — Loan #{{loan_id}}</strong>
    </p>

    <p style="font-size: 12px;">
      Dear {{customer_name}},
    </p>
    <p style="font-size: 12px; text-align: justify;">
      According to our records, your loan account #<strong>{{loan_id}}</strong> has <strong>{{overdue_installments}} overdue installment(s)</strong> that remain unpaid despite earlier reminders.
    </p>

    <div class="due-amount-box">
      <div style="font-size: 11px; text-transform: uppercase; color: #9f1239; font-weight: 700;">Total Immediate Due</div>
      <div class="due-val">{{total_due_now}}</div>
      <div style="font-size: 11px; color: #9f1239; margin-top: 4px;">
        (EMI Arrears: {{overdue_amount}} + Late Charges: {{late_fee_amount}})
      </div>
    </div>

    <p style="font-size: 12px; text-align: justify;">
      You are hereby advised to settle the immediate payable sum of <strong>{{total_due_now}}</strong> on or before <strong>{{due_by_date}}</strong> to avoid further late charges, credit score deterioration, and initiation of recovery proceedings.
    </p>

    <p style="font-size: 12px;">
      For assistance or immediate settlement, contact our helpline at <strong>{{business_phone}}</strong> or visit the nearest branch.
    </p>

    <div style="margin-top: 40px; font-size: 11px;">
      <strong>Authorized Officer</strong><br>
      Collections & Recovery Desk<br>
      {{business_name}}
    </div>
  </div>
</body>
</html>`,
  },

  customer_application: {
    id: "customer_application",
    name: "Customer Application & Enrollment",
    category: "Application",
    description: "Full borrower application record with KYC details, bank account, and nominee declarations",
    icon: "UserCheck",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Business address", sample: "Sector 22, Mumbai, MH" },
      { key: "business_phone", description: "Customer care phone", sample: "+91 98765 43210" },
      { key: "application_date", description: "Application date", sample: "07 Sep 2026" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "account_id", description: "Customer credit account ID", sample: "ACC-001" },
      { key: "credit_limit", description: "Approved credit limit", sample: "₹1,00,000" },
      { key: "customer_name", description: "Customer full name", sample: "Aarav Sharma" },
      { key: "guardian_name", description: "Father / Spouse name", sample: "Ramesh Sharma" },
      { key: "dob", description: "Date of birth", sample: "15 Aug 1990" },
      { key: "gender", description: "Gender", sample: "Male" },
      { key: "occupation", description: "Occupation / Trade", sample: "Retail Shopkeeper" },
      { key: "monthly_income", description: "Monthly income", sample: "35,000" },
      { key: "mobile", description: "Primary mobile number", sample: "+91 98765 01234" },
      { key: "alt_mobile", description: "Alternate mobile", sample: "+91 98765 09999" },
      { key: "kyc_type", description: "Identity document type", sample: "Aadhaar Card" },
      { key: "kyc_number", description: "KYC ID number", sample: "XXXX-XXXX-4812" },
      { key: "address_house", description: "House / Flat number", sample: "Flat 402, Sai Residency" },
      { key: "address_area", description: "Area / Street", sample: "Station Road" },
      { key: "address_city", description: "City / Town", sample: "Mumbai" },
      { key: "address_district", description: "District & State", sample: "Mumbai, Maharashtra" },
      { key: "address_pin", description: "Postal PIN code", sample: "400001" },
      { key: "nominee_name", description: "Nominee name", sample: "Priya Sharma" },
      { key: "nominee_relation", description: "Nominee relationship", sample: "Spouse" },
      { key: "nominee_mobile", description: "Nominee contact", sample: "+91 98765 04321" },
      { key: "guarantor_name", description: "Guarantor name", sample: "Vikram Malhotra" },
      { key: "guarantor_relation", description: "Guarantor relationship", sample: "Brother" },
      { key: "guarantor_mobile", description: "Guarantor phone", sample: "+91 98765 08888" },
      { key: "guarantor_address", description: "Guarantor residence address", sample: "Plot 12, Sector 4, Mumbai, MH" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Customer Application - {{customer_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; font-size: 11px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 24px;
      line-height: 1.4;
      font-size: 12px;
    }
    .app-container { max-width: 760px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 24px; border-radius: 8px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .org-name { font-size: 18px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0; }
    .doc-title { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-top: 4px; }
    .photo-box { width: 110px; height: 130px; border: 1px dashed #94a3b8; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #64748b; background: #f8fafc; border-radius: 4px; }
    .section-head { background: #f1f5f9; padding: 5px 8px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #1e293b; border-left: 3px solid #2563eb; margin: 14px 0 8px; }
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .data-table td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 11px; }
    .data-table td.lbl { background: #f8fafc; font-weight: 600; width: 25%; color: #475569; }
    .data-table td.val { width: 25%; }
    .undertaking { font-size: 10px; color: #475569; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; margin-top: 14px; background: #fcfcfc; }
    .sign-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 36px; text-align: center; font-size: 11px; }
    .sign-line { border-top: 1px solid #475569; padding-top: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="app-container">
    <div class="header">
      <div>
        <h1 class="org-name">{{business_name}}</h1>
        <p style="margin: 2px 0; font-size: 11px; color: #64748b;">{{business_address}} | Ph: {{business_phone}}</p>
        <div class="doc-title">Customer Enrollment & Account Application</div>
      </div>
      <div class="photo-box">
        Affix Recent<br>Passport Photo<br>(Signed Across)
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 12px; font-family: monospace;">
      <span><strong>Customer Ref:</strong> {{customer_id}}</span>
      <span><strong>Account ID:</strong> {{account_id}}</span>
      <span><strong>Date:</strong> {{application_date}}</span>
    </div>

    <div class="section-head">1. Primary Borrower Personal Information</div>
    <table class="data-table">
      <tr>
        <td class="lbl">Full Name</td>
        <td class="val"><strong>{{customer_name}}</strong></td>
        <td class="lbl">Father / Guardian</td>
        <td class="val">{{guardian_name}}</td>
      </tr>
      <tr>
        <td class="lbl">Primary Mobile</td>
        <td class="val">{{mobile}}</td>
        <td class="lbl">Alternate Mobile</td>
        <td class="val">{{alt_mobile}}</td>
      </tr>
      <tr>
        <td class="lbl">Date of Birth</td>
        <td class="val">{{dob}}</td>
        <td class="lbl">Gender</td>
        <td class="val">{{gender}}</td>
      </tr>
      <tr>
        <td class="lbl">Occupation / Trade</td>
        <td class="val">{{occupation}}</td>
        <td class="lbl">Monthly Income</td>
        <td class="val font-mono">₹{{monthly_income}}</td>
      </tr>
      <tr>
        <td class="lbl">KYC Proof Type</td>
        <td class="val">{{kyc_type}}</td>
        <td class="lbl">KYC Identification No.</td>
        <td class="val font-mono">{{kyc_number}}</td>
      </tr>
    </table>

    <div class="section-head">2. Residential & Communication Address</div>
    <table class="data-table">
      <tr>
        <td class="lbl">House / Flat No.</td>
        <td class="val">{{address_house}}</td>
        <td class="lbl">Street / Area</td>
        <td class="val">{{address_area}}</td>
      </tr>
      <tr>
        <td class="lbl">City / Town</td>
        <td class="val">{{address_city}}</td>
        <td class="lbl">District & State</td>
        <td class="val">{{address_district}}</td>
      </tr>
      <tr>
        <td class="lbl">PIN Code</td>
        <td class="val font-mono">{{address_pin}}</td>
        <td class="lbl">Approved Credit Limit</td>
        <td class="val font-mono"><strong>{{credit_limit}}</strong></td>
      </tr>
    </table>

    <div class="section-head">3. Nominee & Guarantor Records</div>
    <table class="data-table">
      <tr>
        <td class="lbl">Nominee Name</td>
        <td class="val">{{nominee_name}}</td>
        <td class="lbl">Relationship / Mobile</td>
        <td class="val">{{nominee_relation}} ({{nominee_mobile}})</td>
      </tr>
      <tr>
        <td class="lbl">Guarantor Name</td>
        <td class="val"><strong>{{guarantor_name}}</strong></td>
        <td class="lbl">Relationship / Mobile</td>
        <td class="val">{{guarantor_relation}} ({{guarantor_mobile}})</td>
      </tr>
      <tr>
        <td class="lbl">Guarantor Address</td>
        <td colspan="3">{{guarantor_address}}</td>
      </tr>
    </table>

    <div class="undertaking">
      <strong>Borrower Declaration:</strong> I hereby declare that the particulars given above are true, complete, and correct to the best of my knowledge. I authorize {{business_name}} to verify my credentials, KYC proofs, and credit information bureau records.
    </div>

    <div class="sign-row">
      <div>
        <div class="sign-line">Borrower Signature / Thumb</div>
        <div style="font-size: 10px; color: #64748b;">{{customer_name}}</div>
      </div>
      <div>
        <div class="sign-line">Guarantor Signature</div>
        <div style="font-size: 10px; color: #64748b;">{{guarantor_name}}</div>
      </div>
      <div>
        <div class="sign-line">Verifying Field Officer</div>
        <div style="font-size: 10px; color: #64748b;">{{business_name}}</div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  promissory_note: {
    id: "promissory_note",
    name: "Demand Promissory Note",
    category: "Agreement",
    description: "Statutory Section 4 Negotiable Instruments Act Promissory Note with revenue stamp box",
    icon: "FileSignature",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Lender registered office", sample: "Sector 22, Mumbai, MH" },
      { key: "note_date", description: "Execution date", sample: "01 Sep 2026" },
      { key: "place", description: "Execution city/place", sample: "Mumbai" },
      { key: "loan_id", description: "Loan reference number", sample: "LN-2026-0042" },
      { key: "principal_amount", description: "Principal figure (₹)", sample: "₹50,000" },
      { key: "principal_words", description: "Principal in words", sample: "Fifty Thousand Rupees Only" },
      { key: "interest_rate", description: "Annual interest rate %", sample: "18" },
      { key: "interest_method", description: "Interest calculation method", sample: "Flat" },
      { key: "customer_name", description: "Borrower name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "customer_address", description: "Borrower residence address", sample: "Andheri East, Mumbai, MH" },
      { key: "guarantor_name", description: "Guarantor name", sample: "Vikram Malhotra" },
      { key: "guarantor_address", description: "Guarantor address", sample: "Sector 4, Mumbai, MH" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Demand Promissory Note - {{loan_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Georgia", serif;
      color: #0f172a;
      background: #fff;
      padding: 30px;
      line-height: 1.6;
      font-size: 13px;
    }
    .note-container { max-width: 680px; margin: 0 auto; border: 2px solid #0f172a; padding: 32px; border-radius: 4px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .sub { font-size: 11px; text-transform: uppercase; color: #475569; margin-top: 4px; font-family: sans-serif; }
    .top-meta { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; font-family: sans-serif; }
    .revenue-stamp { width: 90px; height: 110px; border: 1px dashed #dc2626; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #dc2626; background: #fef2f2; font-family: sans-serif; }
    .covenant { text-align: justify; margin: 20px 0; font-size: 14px; text-indent: 40px; }
    .witness-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-family: sans-serif; }
    .sig-block { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 12px; margin-top: 36px; }
  </style>
</head>
<body>
  <div class="note-container">
    <div class="header">
      <div class="title">Demand Promissory Note</div>
      <div class="sub">(Under Section 4 of the Negotiable Instruments Act, 1881)</div>
    </div>

    <div class="top-meta">
      <div>
        <strong>Principal Sum:</strong> <span style="font-size: 16px; font-weight: bold;">{{principal_amount}}</span><br>
        <strong>Place:</strong> {{place}}<br>
        <strong>Date:</strong> {{note_date}}<br>
        <strong>Loan Reference:</strong> {{loan_id}}
      </div>
      <div class="revenue-stamp">
        Affix<br>₹1 / ₹20<br>Revenue Stamp<br>&amp; Cross-Sign
      </div>
    </div>

    <p class="covenant">
      <strong>ON DEMAND</strong>, I / We, <strong>{{customer_name}}</strong>, residing at {{customer_address}}, jointly and severally promise to pay to <strong>{{business_name}}</strong> or order, at their office situated at {{business_address}}, the sum of <strong>{{principal_amount}}</strong> (Rupees <em>{{principal_words}}</em>), together with interest thereon at the rate of <strong>{{interest_rate}}% per annum</strong> ({{interest_method}}), for value received this day in cash / electronic bank transfer.
    </p>

    <div style="margin: 24px 0; padding: 12px; border: 1px solid #cbd5e1; font-size: 12px; font-family: sans-serif; background: #f8fafc;">
      <strong>Borrower ID:</strong> {{customer_id}}<br>
      <strong>Guarantor:</strong> {{guarantor_name}} ({{guarantor_address}})
    </div>

    <div style="display: flex; justify-content: flex-end; margin-top: 40px; font-family: sans-serif;">
      <div style="text-align: center; width: 220px;">
        <div style="height: 40px;"></div>
        <div class="sig-block">
          <strong>{{customer_name}}</strong><br>
          (Signature Across Revenue Stamp)
        </div>
      </div>
    </div>

    <div class="witness-section">
      <div>
        <p style="font-size: 11px; text-transform: uppercase; font-weight: bold; margin-bottom: 24px;">Witness 1:</p>
        <div class="sig-block">
          Signature: _______________________<br>
          Name: __________________________<br>
          Address: ________________________
        </div>
      </div>
      <div>
        <p style="font-size: 11px; text-transform: uppercase; font-weight: bold; margin-bottom: 24px;">Witness 2:</p>
        <div class="sig-block">
          Signature: _______________________<br>
          Name: __________________________<br>
          Address: ________________________
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  disbursement_voucher: {
    id: "disbursement_voucher",
    name: "Loan Disbursement Voucher",
    category: "Voucher",
    description: "Official loan disbursement order with processing deductions and net payout breakdown",
    icon: "Banknote",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Business address", sample: "Sector 22, Mumbai, MH" },
      { key: "business_phone", description: "Branch phone", sample: "+91 98765 43210" },
      { key: "voucher_no", description: "Disbursement voucher number", sample: "DISB-2026-0042" },
      { key: "disbursement_date", description: "Date of disbursement", sample: "01 Sep 2026" },
      { key: "loan_id", description: "Loan reference number", sample: "LN-2026-0042" },
      { key: "customer_name", description: "Borrower full name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "customer_mobile", description: "Borrower mobile", sample: "+91 98765 01234" },
      { key: "sanctioned_amount", description: "Gross principal amount", sample: "₹50,000" },
      { key: "processing_fee", description: "Processing fee deducted", sample: "₹1,000" },
      { key: "insurance_fee", description: "Insurance premium deducted", sample: "₹500" },
      { key: "stamp_fee", description: "Documentation & stamp charges", sample: "₹250" },
      { key: "net_disbursed", description: "Net payout disbursed", sample: "₹48,250" },
      { key: "net_disbursed_words", description: "Net payout in words", sample: "Forty Eight Thousand Two Hundred Fifty Rupees Only" },
      { key: "payment_method", description: "Disbursement mode (Cash / Bank Transfer)", sample: "Bank Transfer (NEFT/IMPS)" },
      { key: "bank_ref_no", description: "Bank UTR / Transaction reference", sample: "UTR98412850123" },
      { key: "disbursed_by", description: "Cashier / Operator name", sample: "Rajesh Kumar (Operations Desk)" },
      { key: "checked_by", description: "Branch Manager / Auditor", sample: "Sunita Patel (Branch Manager)" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Disbursement Voucher - {{voucher_no}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; font-size: 12px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 24px;
      line-height: 1.4;
    }
    .voucher-container { max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .org-name { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; }
    .title { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 12px; }
    .calc-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .calc-table th, .calc-table td { padding: 8px 12px; border: 1px solid #cbd5e1; }
    .calc-table th { background: #f1f5f9; text-align: left; }
    .net-box { background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 6px; padding: 14px; text-align: center; margin: 16px 0; }
    .net-val { font-size: 24px; font-weight: 800; color: #059669; font-family: monospace; }
    .ack { font-size: 11px; color: #475569; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 4px; margin: 16px 0; }
    .sign-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 36px; text-align: center; font-size: 11px; }
    .sign-line { border-top: 1px solid #475569; padding-top: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="voucher-container">
    <div class="header">
      <div>
        <h1 class="org-name">{{business_name}}</h1>
        <p style="margin: 2px 0; font-size: 11px; color: #64748b;">{{business_address}} | Ph: {{business_phone}}</p>
      </div>
      <div style="text-align: right;">
        <span class="title">Disbursement Voucher</span>
        <p style="margin: 4px 0 0; font-size: 11px; font-family: monospace;">Voucher: <strong>{{voucher_no}}</strong></p>
        <p style="margin: 2px 0 0; font-size: 11px;">Date: {{disbursement_date}}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <strong>Borrower:</strong> {{customer_name}} ({{customer_id}})<br>
        <strong>Mobile:</strong> {{customer_mobile}}
      </div>
      <div style="text-align: right;">
        <strong>Loan Reference:</strong> {{loan_id}}<br>
        <strong>Payment Mode:</strong> {{payment_method}} (Ref: {{bank_ref_no}})
      </div>
    </div>

    <table class="calc-table">
      <thead>
        <tr>
          <th>Item Particulars</th>
          <th style="text-align: right; width: 140px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Gross Sanctioned Loan Principal</strong></td>
          <td style="text-align: right; font-weight: bold; font-family: monospace;">{{sanctioned_amount}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Less: Loan Processing Fee Deducted</td>
          <td style="text-align: right; color: #dc2626; font-family: monospace;">- {{processing_fee}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Less: Borrower Insurance Premium</td>
          <td style="text-align: right; color: #dc2626; font-family: monospace;">- {{insurance_fee}}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Less: Stamp Duty & Documentation Charges</td>
          <td style="text-align: right; color: #dc2626; font-family: monospace;">- {{stamp_fee}}</td>
        </tr>
      </tbody>
    </table>

    <div class="net-box">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #065f46;">Net Disbursed Payout (Credited / Handed Over)</div>
      <div class="net-val">{{net_disbursed}}</div>
      <div style="font-size: 11px; color: #047857; margin-top: 4px;">({{net_disbursed_words}})</div>
    </div>

    <div class="ack">
      <strong>Borrower Acknowledgment:</strong> I acknowledge receipt of the net disbursement sum of <strong>{{net_disbursed}}</strong> towards loan account #{{loan_id}} as specified above.
    </div>

    <div class="sign-row">
      <div>
        <div class="sign-line">Prepared By</div>
        <div style="font-size: 10px; color: #64748b;">{{disbursed_by}}</div>
      </div>
      <div>
        <div class="sign-line">Checked & Approved By</div>
        <div style="font-size: 10px; color: #64748b;">{{checked_by}}</div>
      </div>
      <div>
        <div class="sign-line">Borrower Signature</div>
        <div style="font-size: 10px; color: #64748b;">{{customer_name}}</div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  visit_slip: {
    id: "visit_slip",
    name: "Field Collection & Visit Slip",
    category: "Receipt",
    description: "Doorstep field collection visit receipt and recovery acknowledgement slip",
    icon: "ClipboardCheck",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_phone", description: "Branch helpline phone", sample: "+91 98765 43210" },
      { key: "visit_id", description: "Visit ID", sample: "VIS-2026-018" },
      { key: "visit_date", description: "Date of visit", sample: "07 Sep 2026" },
      { key: "visit_time", description: "Time of visit", sample: "11:30 AM" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "customer_name", description: "Customer name", sample: "Aarav Sharma" },
      { key: "customer_address", description: "Borrower residence address", sample: "Shop 4, Market Road" },
      { key: "customer_mobile", description: "Customer mobile", sample: "+91 98765 01234" },
      { key: "loan_id", description: "Loan contract ID", sample: "LN-001" },
      { key: "due_amount", description: "Total scheduled amount due", sample: "₹4,917" },
      { key: "visit_status", description: "Outcome (Paid / Partially Paid / Not Paid)", sample: "Paid" },
      { key: "collected_amount", description: "Amount collected on-spot", sample: "₹4,917" },
      { key: "collected_amount_words", description: "Collected amount in words", sample: "Four Thousand Nine Hundred Seventeen Rupees Only" },
      { key: "payment_method", description: "Payment mode (Cash / UPI)", sample: "Cash" },
      { key: "receipt_no", description: "Receipt ID reference", sample: "REC-2026-0842" },
      { key: "next_visit_date", description: "Next follow-up date", sample: "07 Oct 2026" },
      { key: "promise_amount", description: "Commitment promise amount", sample: "₹4,917" },
      { key: "agent_notes", description: "Field agent observations", sample: "Customer paid on doorstep. Shop is operational." },
      { key: "collector_name", description: "Field agent name", sample: "Rajesh Kumar (Badge #102)" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Field Collection Visit Slip - {{visit_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 6mm; font-size: 11px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 16px;
      line-height: 1.4;
      font-size: 12px;
    }
    .slip-container { max-width: 440px; margin: 0 auto; border: 1px dashed #64748b; padding: 16px; border-radius: 6px; }
    .header { text-align: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 12px; }
    .org { font-size: 16px; font-weight: 800; text-transform: uppercase; margin: 0; }
    .badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; font-size: 10px; font-weight: 700; border-radius: 4px; margin-top: 4px; }
    .grid { width: 100%; font-size: 11px; margin-bottom: 12px; border-collapse: collapse; }
    .grid td { padding: 4px 0; }
    .grid td.lbl { color: #64748b; width: 40%; }
    .grid td.val { font-weight: 600; width: 60%; }
    .collected-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; text-align: center; margin: 12px 0; }
    .amt { font-size: 20px; font-weight: 800; color: #16a34a; font-family: monospace; }
    .sign { display: flex; justify-content: space-between; margin-top: 24px; font-size: 10px; text-align: center; }
    .sign-box { border-top: 1px solid #64748b; padding-top: 4px; width: 140px; }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="header">
      <h1 class="org">{{business_name}}</h1>
      <p style="margin: 2px 0; font-size: 10px; color: #64748b;">Field Operations & Doorstep Recovery</p>
      <span class="badge">Visit Slip & Receipt</span>
    </div>

    <table class="grid">
      <tr><td class="lbl">Visit ID:</td><td class="val font-mono">{{visit_id}}</td></tr>
      <tr><td class="lbl">Date & Time:</td><td class="val">{{visit_date}} at {{visit_time}}</td></tr>
      <tr><td class="lbl">Borrower:</td><td class="val">{{customer_name}} ({{customer_id}})</td></tr>
      <tr><td class="lbl">Mobile / Address:</td><td class="val">{{customer_mobile}}, {{customer_address}}</td></tr>
      <tr><td class="lbl">Loan ID:</td><td class="val font-mono">{{loan_id}}</td></tr>
      <tr><td class="lbl">Scheduled Due:</td><td class="val">{{due_amount}}</td></tr>
      <tr><td class="lbl">Visit Outcome:</td><td class="val">{{visit_status}}</td></tr>
    </table>

    <div class="collected-box">
      <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #15803d;">Amount Collected On-Spot</div>
      <div class="amt">{{collected_amount}}</div>
      <div style="font-size: 10px; color: #15803d;">({{collected_amount_words}})</div>
      <div style="font-size: 10px; color: #475569; margin-top: 4px;">Mode: {{payment_method}} | Receipt: {{receipt_no}}</div>
    </div>

    <div style="font-size: 10px; color: #64748b; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; margin: 8px 0;">
      <strong>Next Promise / Follow-up:</strong> {{next_visit_date}} (Commitment: {{promise_amount}})<br>
      <strong>Collector Notes:</strong> {{agent_notes}}
    </div>

    <div class="sign">
      <div class="sign-box">
        Collector Signature<br>
        <strong>{{collector_name}}</strong>
      </div>
      <div class="sign-box">
        Borrower Signature / Ack<br>
        <strong>{{customer_name}}</strong>
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  foreclosure_statement: {
    id: "foreclosure_statement",
    name: "Early Foreclosure Settlement",
    category: "Statement",
    description: "Early loan pre-closure settlement ledger with unearned interest waiver calculation",
    icon: "ShieldAlert",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Business address", sample: "Sector 22, Mumbai, MH" },
      { key: "business_phone", description: "Helpline phone", sample: "+91 98765 43210" },
      { key: "statement_date", description: "Statement generation date", sample: "07 Sep 2026" },
      { key: "loan_id", description: "Loan reference ID", sample: "LN-001" },
      { key: "closure_date", description: "Foreclosure date", sample: "07 Sep 2026" },
      { key: "receipt_id", description: "Settlement receipt number", sample: "RCP-2026-00042" },
      { key: "customer_name", description: "Borrower name", sample: "Aarav Sharma" },
      { key: "customer_id", description: "Customer ID", sample: "CUS-001" },
      { key: "customer_mobile", description: "Customer phone", sample: "+91 98765 01234" },
      { key: "original_principal", description: "Original loan principal", sample: "₹50,000" },
      { key: "principal_paid_till_date", description: "Principal settled in EMIs", sample: "₹18,500" },
      { key: "outstanding_principal", description: "Remaining principal settled", sample: "₹31,500" },
      { key: "foreclosure_charge_pct", description: "Foreclosure fee percent", sample: "2" },
      { key: "foreclosure_charge", description: "Foreclosure fee amount", sample: "₹630" },
      { key: "future_interest_waived", description: "Unearned interest waived", sample: "₹4,250" },
      { key: "final_closure_amount", description: "Final settlement sum paid", sample: "₹32,130" },
      { key: "final_closure_amount_words", description: "Final settlement in words", sample: "Thirty Two Thousand One Hundred Thirty Rupees Only" },
      { key: "payment_method", description: "Payment mode", sample: "Bank Transfer (IMPS)" },
      { key: "bank_tx_id", description: "Bank transaction ref", sample: "TXN778401928" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Loan Foreclosure Statement - {{loan_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 10mm; font-size: 12px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 24px;
      line-height: 1.4;
    }
    .settle-container { max-width: 680px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 16px; }
    .org-name { font-size: 18px; font-weight: 800; text-transform: uppercase; margin: 0; }
    .title { font-size: 13px; font-weight: 700; color: #7c3aed; text-transform: uppercase; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
    .table th, .table td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    .table th { background: #f8fafc; text-align: left; }
    .total-box { background: #faf5ff; border: 2px solid #d8b4fe; border-radius: 6px; padding: 14px; text-align: center; margin: 16px 0; }
    .total-val { font-size: 26px; font-weight: 800; color: #7c3aed; font-family: monospace; }
    .sign-row { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; text-align: center; font-size: 11px; }
    .sign-line { border-top: 1px solid #475569; padding-top: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="settle-container">
    <div class="header">
      <div>
        <h1 class="org-name">{{business_name}}</h1>
        <p style="margin: 2px 0; font-size: 11px; color: #64748b;">{{business_address}} | Ph: {{business_phone}}</p>
      </div>
      <div style="text-align: right;">
        <span class="title">Early Closure Statement</span>
        <p style="margin: 4px 0 0; font-size: 11px;">Date: {{statement_date}}</p>
        <p style="margin: 2px 0 0; font-size: 11px; font-family: monospace;">Receipt: <strong>{{receipt_id}}</strong></p>
      </div>
    </div>

    <div style="margin-bottom: 16px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 6px;">
      <strong>Borrower:</strong> {{customer_name}} (Customer ID: {{customer_id}}) | Ph: {{customer_mobile}}<br>
      <strong>Loan Reference Number:</strong> {{loan_id}} | Closure Date: {{closure_date}}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Early Settlement Calculation Breakdown</th>
          <th style="text-align: right; width: 150px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Original Sanctioned Principal</td>
          <td style="text-align: right; font-family: monospace;">{{original_principal}}</td>
        </tr>
        <tr>
          <td>Principal Repaid in Regular EMIs Till Date</td>
          <td style="text-align: right; color: #059669; font-family: monospace;">- {{principal_paid_till_date}}</td>
        </tr>
        <tr style="background: #f1f5f9; font-weight: bold;">
          <td>Outstanding Principal Balance Settled</td>
          <td style="text-align: right; font-family: monospace;">{{outstanding_principal}}</td>
        </tr>
        <tr>
          <td>Early Foreclosure Charge ({{foreclosure_charge_pct}}%)</td>
          <td style="text-align: right; color: #7c3aed; font-family: monospace;">+ {{foreclosure_charge}}</td>
        </tr>
        <tr>
          <td>Future Unearned Interest Waived</td>
          <td style="text-align: right; color: #059669; font-family: monospace; font-weight: bold;">{{future_interest_waived}} (Saved)</td>
        </tr>
      </tbody>
    </table>

    <div class="total-box">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6b21a8;">Final One-Time Closure Settlement Paid</div>
      <div class="total-val">{{final_closure_amount}}</div>
      <div style="font-size: 11px; color: #7e22ce; margin-top: 4px;">({{final_closure_amount_words}})</div>
      <div style="font-size: 11px; color: #475569; margin-top: 4px;">Method: {{payment_method}} (Ref: {{bank_tx_id}})</div>
    </div>

    <p style="font-size: 11px; color: #64748b; text-align: justify; margin: 16px 0;">
      <strong>Full Discharge Certificate:</strong> We hereby confirm that the borrower has paid the complete outstanding settlement dues for Loan Account #{{loan_id}}. Future installments stand cancelled, and no further financial claims remain on this loan facility.
    </p>

    <div class="sign-row">
      <div>
        <div class="sign-line">Borrower Acknowledgment</div>
        <div style="font-size: 10px; color: #64748b;">{{customer_name}}</div>
      </div>
      <div>
        <div class="sign-line">Authorized Signatory / Branch Manager</div>
        <div style="font-size: 10px; color: #64748b;">{{business_name}}</div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },

  guarantor_undertaking: {
    id: "guarantor_undertaking",
    name: "Guarantor Deed of Guarantee",
    category: "Agreement",
    description: "Legal deed of guarantee and indemnity executed by borrower guarantor",
    icon: "ShieldCheck",
    variables: [
      { key: "business_name", description: "Institution name", sample: "LOANFLOW MICROFINANCE CORP" },
      { key: "business_address", description: "Lender office address", sample: "Sector 22, Mumbai, MH" },
      { key: "deed_date", description: "Date of deed execution", sample: "01 Sep 2026" },
      { key: "place", description: "Place of execution", sample: "Mumbai" },
      { key: "loan_id", description: "Loan contract ID", sample: "LN-2026-0042" },
      { key: "principal", description: "Guaranteed loan principal", sample: "₹50,000" },
      { key: "borrower_name", description: "Primary borrower name", sample: "Aarav Sharma" },
      { key: "borrower_id", description: "Borrower ID", sample: "CUS-001" },
      { key: "borrower_address", description: "Borrower residence", sample: "Andheri East, Mumbai, MH" },
      { key: "guarantor_name", description: "Guarantor full name", sample: "Vikram Malhotra" },
      { key: "guarantor_relation", description: "Relationship with borrower", sample: "Brother" },
      { key: "guarantor_mobile", description: "Guarantor phone", sample: "+91 98765 08888" },
      { key: "guarantor_id_type", description: "Guarantor ID document type", sample: "Aadhaar Card" },
      { key: "guarantor_id_no", description: "Guarantor ID number", sample: "XXXX-XXXX-9912" },
      { key: "guarantor_address", description: "Guarantor residence address", sample: "Plot 12, Sector 4, Mumbai, MH" },
    ],
    defaultHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Guarantor Deed of Guarantee - {{loan_id}}</title>
  <style>
    @media print {
      body { margin: 0; padding: 12mm; font-size: 12px; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      padding: 24px;
      line-height: 1.5;
    }
    .deed-container { max-width: 700px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 28px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .title { font-size: 18px; font-weight: 800; text-transform: uppercase; }
    .sub { font-size: 11px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .clause { font-size: 12px; text-align: justify; margin-bottom: 12px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 11px; margin: 16px 0; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 36px; text-align: center; font-size: 11px; }
    .sign-line { border-top: 1px solid #0f172a; padding-top: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="deed-container">
    <div class="header">
      <h1 class="title">Deed of Guarantee &amp; Indemnity</h1>
      <div class="sub">Irrevocable Joint &amp; Several Personal Guarantee</div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 16px;">
      <span><strong>Place:</strong> {{place}}</span>
      <span><strong>Date:</strong> {{deed_date}}</span>
      <span><strong>Loan Facility:</strong> {{loan_id}}</span>
    </div>

    <p class="clause">
      THIS DEED OF GUARANTEE is executed by <strong>{{guarantor_name}}</strong> (Relationship: {{guarantor_relation}}, Ph: {{guarantor_mobile}}, KYC: {{guarantor_id_type}} {{guarantor_id_no}}), residing at {{guarantor_address}} (hereinafter called the <strong>"Guarantor"</strong>), in favor of <strong>{{business_name}}</strong> (hereinafter called the <strong>"Lender"</strong>).
    </p>

    <div class="info-box">
      <strong>Borrower Name:</strong> {{borrower_name}} (ID: {{borrower_id}})<br>
      <strong>Borrower Address:</strong> {{borrower_address}}<br>
      <strong>Sanctioned Principal:</strong> {{principal}}
    </div>

    <div class="clause">
      <strong>NOW THIS DEED WITNESSETH AS FOLLOWS:</strong>
      <ol style="padding-left: 20px; margin-top: 8px;">
        <li style="margin-bottom: 8px;">In consideration of the Lender granting the loan facility of <strong>{{principal}}</strong> to the Borrower, the Guarantor unconditionally and irrevocably guarantees the due and punctual payment of all principal, interest, and charges.</li>
        <li style="margin-bottom: 8px;">The liability of the Guarantor shall be joint and several with that of the Borrower, and shall not be impaired by any time or indulgence granted by the Lender.</li>
        <li style="margin-bottom: 8px;">This Guarantee is a continuing guarantee and shall remain operative until all amounts due under the loan facility are settled in full.</li>
        <li style="margin-bottom: 8px;">The Guarantor confirms having read and understood the repayment terms, and freely binds their personal assets and estate as security.</li>
      </ol>
    </div>

    <div class="sign-grid">
      <div>
        <div style="height: 36px;"></div>
        <div class="sign-line">
          Signature / Thumb Impression of Guarantor<br>
          <strong>{{guarantor_name}}</strong>
        </div>
      </div>
      <div>
        <div style="height: 36px;"></div>
        <div class="sign-line">
          Accepted on Behalf of Lender<br>
          <strong>{{business_name}}</strong>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
};

/**
 * Render template by substituting {{variable_name}} with values
 */
export function renderTemplate(
  htmlTemplate: string,
  variables: Record<string, string | number | undefined | null>,
): string {
  let rendered = htmlTemplate;

  Object.entries(variables).forEach(([key, val]) => {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(placeholder, String(val ?? ""));
  });

  return rendered;
}

/**
 * Open a new window and print custom HTML directly
 */
export function printHtmlDocument(html: string, title = "Print Document") {
  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (!printWindow) {
    // Fallback using iframe if popup is blocked
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  // Safe timeout in case onload fired before listener
  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // already printed
    }
  }, 500);
}
