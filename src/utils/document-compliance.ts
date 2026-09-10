import type { Customer, DocumentCategory, DocumentFile, Loan } from "@/types";

export interface ComplianceRequirement {
  id: string;
  name: string;
  category: DocumentCategory;
  defaultType: string;
  description: string;
  isMandatory: boolean;
  isUploaded: boolean;
  uploadedDoc?: DocumentFile;
  isVerified: boolean;
  statusText: string;
  loanSpecific?: boolean;
}

export interface CustomerComplianceReport {
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerCity: string;
  requirements: ComplianceRequirement[];
  totalRequired: number;
  uploadedCount: number;
  missingCount: number;
  verifiedCount: number;
  missingRequirements: ComplianceRequirement[];
  isCompliant: boolean;
  completionPercentage: number;
}

/**
 * Automatically infers the DocumentCategory based on document type or name
 */
export function inferCategoryFromType(typeOrName: string): DocumentCategory {
  const s = typeOrName.toLowerCase();
  if (
    s.includes("aadhaar") ||
    s.includes("pan") ||
    s.includes("voter") ||
    s.includes("passport") ||
    s.includes("driving") ||
    s.includes("licence") ||
    s.includes("id proof") ||
    s.includes("identity")
  ) {
    return "IDENTITY_KYC";
  }
  if (
    s.includes("address") ||
    s.includes("electricity") ||
    s.includes("water") ||
    s.includes("gas") ||
    s.includes("rental") ||
    s.includes("tax receipt") ||
    s.includes("utility")
  ) {
    return "ADDRESS_PROOF";
  }
  if (
    s.includes("loan agreement") ||
    s.includes("agreement") ||
    s.includes("promissory") ||
    s.includes("sanction") ||
    s.includes("disbursement") ||
    s.includes("application") ||
    s.includes("schedule")
  ) {
    return "LOAN_DOCUMENTS";
  }
  if (
    s.includes("salary") ||
    s.includes("income") ||
    s.includes("bank statement") ||
    s.includes("itr") ||
    s.includes("tax return") ||
    s.includes("gst") ||
    s.includes("business proof")
  ) {
    return "INCOME_FINANCIAL";
  }
  if (
    s.includes("photo") ||
    s.includes("photograph") ||
    s.includes("signature") ||
    s.includes("nominee") ||
    s.includes("guarantor")
  ) {
    return "CUSTOMER_PERSONAL";
  }
  if (
    s.includes("property") ||
    s.includes("vehicle") ||
    s.includes("rc") ||
    s.includes("gold") ||
    s.includes("security") ||
    s.includes("collateral")
  ) {
    return "COLLATERAL_SECURITY";
  }
  return "OTHER";
}

/**
 * Evaluates document compliance for a single customer
 */
export function getCustomerCompliance(
  customer: Customer,
  docs: DocumentFile[],
  loans: Loan[] = [],
  filterLoanId?: string
): CustomerComplianceReport {
  const customerDocs = docs.filter(
    (d) => d.customerId === customer.id && (!filterLoanId || d.loanId === filterLoanId || !d.loanId)
  );

  const customerLoans = loans.filter((l) => l.customerId === customer.id);
  const hasAnyLoan = customerLoans.length > 0 || Boolean(filterLoanId);
  const hasActiveLoan = customerLoans.some(
    (l) => l.status === "Active" || l.status === "Overdue"
  );

  const hasGuarantor = Boolean(customer.guarantor?.name && customer.guarantor.name.trim().length > 0);

  // 1. Primary ID Proof (Aadhaar / Voter / DL / Passport)
  const idDoc = customerDocs.find((d) => {
    const t = (d.type + " " + d.name).toLowerCase();
    return (
      (d.category === "IDENTITY_KYC" && !t.includes("pan")) ||
      t.includes("aadhaar") ||
      t.includes("voter") ||
      t.includes("passport") ||
      t.includes("driving") ||
      t.includes("id proof")
    );
  });

  // 2. PAN Card
  const panDoc = customerDocs.find((d) => {
    const t = (d.type + " " + d.name).toLowerCase();
    return t.includes("pan") || (d.category === "IDENTITY_KYC" && t.includes("pan card"));
  });

  // 3. Address Proof
  const addressDoc = customerDocs.find((d) => {
    const t = (d.type + " " + d.name).toLowerCase();
    return (
      d.category === "ADDRESS_PROOF" ||
      t.includes("address proof") ||
      t.includes("electricity") ||
      t.includes("rental") ||
      t.includes("water bill") ||
      t.includes("gas bill") ||
      t.includes("ration")
    );
  });

  // 4. Customer Photograph
  const photoDoc =
    customerDocs.find((d) => {
      const t = (d.type + " " + d.name).toLowerCase();
      return (
        t.includes("photo") ||
        t.includes("photograph") ||
        (d.category === "CUSTOMER_PERSONAL" && !t.includes("guarantor"))
      );
    }) ||
    (customer.photo
      ? ({
          id: `PHOTO-${customer.id}`,
          customerId: customer.id,
          category: "CUSTOMER_PERSONAL",
          type: "Customer Photo",
          name: `Profile Photograph - ${customer.name}`,
          fileName: "customer-profile.jpg",
          sizeKb: 180,
          uploadedAt: customer.createdAt,
          verificationStatus: "Verified",
          fileData: customer.photo,
        } as DocumentFile)
      : undefined);

  // 5. Loan Agreement / Sanction Letter
  const loanDoc = customerDocs.find((d) => {
    const t = (d.type + " " + d.name).toLowerCase();
    return (
      d.category === "LOAN_DOCUMENTS" ||
      t.includes("agreement") ||
      t.includes("sanction") ||
      t.includes("promissory") ||
      t.includes("application")
    );
  });

  // 6. Guarantor Document
  const guarantorDoc = customerDocs.find((d) => {
    const t = (d.type + " " + d.name).toLowerCase();
    return t.includes("guarantor");
  });

  const requirements: ComplianceRequirement[] = [
    {
      id: "id_proof",
      name: "Primary ID Proof",
      category: "IDENTITY_KYC",
      defaultType: "Aadhaar Card",
      description: "Government recognized ID (Aadhaar Card, Voter ID, Driving Licence, or Passport)",
      isMandatory: true,
      isUploaded: Boolean(idDoc),
      uploadedDoc: idDoc,
      isVerified: idDoc?.verificationStatus === "Verified",
      statusText: idDoc
        ? idDoc.verificationStatus === "Verified"
          ? "Verified"
          : "Pending Verification"
        : "Missing Document",
    },
    {
      id: "address_proof",
      name: "Address Proof",
      category: "ADDRESS_PROOF",
      defaultType: "Electricity Bill",
      description: "Utility bill, rental agreement, water/gas bill, or Aadhaar residential address",
      isMandatory: true,
      isUploaded: Boolean(addressDoc),
      uploadedDoc: addressDoc,
      isVerified: addressDoc?.verificationStatus === "Verified",
      statusText: addressDoc
        ? addressDoc.verificationStatus === "Verified"
          ? "Verified"
          : "Pending Verification"
        : "Missing Document",
    },
    {
      id: "pan_card",
      name: "PAN Card / Form 60",
      category: "IDENTITY_KYC",
      defaultType: "PAN Card",
      description: "Income Tax Permanent Account Number (PAN) Card or Form 60 declaration",
      isMandatory: true,
      isUploaded: Boolean(panDoc),
      uploadedDoc: panDoc,
      isVerified: panDoc?.verificationStatus === "Verified",
      statusText: panDoc
        ? panDoc.verificationStatus === "Verified"
          ? "Verified"
          : "Pending Verification"
        : "Missing Document",
    },
    {
      id: "photo",
      name: "Customer Photograph",
      category: "CUSTOMER_PERSONAL",
      defaultType: "Customer Photo",
      description: "Recent color passport-size photograph of primary borrower",
      isMandatory: true,
      isUploaded: Boolean(photoDoc),
      uploadedDoc: photoDoc,
      isVerified: photoDoc?.verificationStatus === "Verified",
      statusText: photoDoc
        ? photoDoc.verificationStatus === "Verified"
          ? "Verified"
          : "Pending Verification"
        : "Missing Document",
    },
  ];

  // 5. Loan Agreement & Sanction Letter - ONLY applicable when a loan has actually been taken!
  if (hasAnyLoan) {
    requirements.push({
      id: "loan_agreement",
      name: "Loan Agreement & Sanction Letter",
      category: "LOAN_DOCUMENTS",
      defaultType: "Loan Agreement",
      description: "Signed formal loan agreement contract, promissory note, and sanction schedule",
      isMandatory: hasActiveLoan || Boolean(filterLoanId),
      isUploaded: Boolean(loanDoc),
      uploadedDoc: loanDoc,
      isVerified: loanDoc?.verificationStatus === "Verified",
      statusText: loanDoc
        ? loanDoc.verificationStatus === "Verified"
          ? "Verified"
          : "Pending Verification"
        : hasActiveLoan || Boolean(filterLoanId)
        ? "Missing Document"
        : "Completed / Settled",
      loanSpecific: true,
    });
  }

  if (hasGuarantor) {
    requirements.push({
      id: "guarantor_doc",
      name: `Guarantor Proof (${customer.guarantor?.name || "Guarantor"})`,
      category: "CUSTOMER_PERSONAL",
      defaultType: "Guarantor ID Proof",
      description: `Identification or address proof for designated guarantor ${customer.guarantor?.name || "Guarantor"}`,
      isMandatory: true,
      isUploaded: Boolean(guarantorDoc),
      uploadedDoc: guarantorDoc,
      isVerified: guarantorDoc?.verificationStatus === "Verified",
      statusText: guarantorDoc
        ? guarantorDoc.verificationStatus === "Verified"
          ? "Verified"
          : "Pending Verification"
        : "Missing Document",
    });
  }

  const mandatoryReqs = requirements.filter((r) => r.isMandatory);
  const totalRequired = mandatoryReqs.length;
  const uploadedCount = mandatoryReqs.filter((r) => r.isUploaded).length;
  const missingRequirements = mandatoryReqs.filter((r) => !r.isUploaded);
  const missingCount = missingRequirements.length;
  const verifiedCount = mandatoryReqs.filter((r) => r.isVerified).length;
  const isCompliant = missingCount === 0;
  const completionPercentage =
    totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 100;

  return {
    customerId: customer.id,
    customerName: customer.name || "Customer",
    customerMobile: customer.mobile || "—",
    customerCity: customer.address?.city || customer.address?.district || "—",
    requirements,
    totalRequired,
    uploadedCount,
    missingCount,
    verifiedCount,
    missingRequirements,
    isCompliant,
    completionPercentage,
  };
}

/**
 * Returns compliance reports for all customers in the system
 */
export function getAllCustomersCompliance(
  customers: Customer[],
  docs: DocumentFile[],
  loans: Loan[]
): CustomerComplianceReport[] {
  return customers.map((c) => getCustomerCompliance(c, docs, loans));
}

/**
 * Generates a mock or template document object to quickly satisfy a missing requirement
 */
export function createSeedDocumentForRequirement(
  customer: Customer,
  req: ComplianceRequirement,
  loanId?: string
): Omit<DocumentFile, "id" | "uploadedAt"> {
  const sanitize = (name?: string) => (name || "doc").toLowerCase().replace(/[^a-z0-9]/g, "_");
  const fileName = `${sanitize(customer.name)}_${sanitize(req.defaultType)}.pdf`;
  const today = new Date().toISOString().slice(0, 10);

  return {
    customerId: customer.id,
    loanId: req.loanSpecific ? loanId : undefined,
    category: req.category,
    type: req.defaultType,
    name: `${req.defaultType} - ${customer.name}`,
    fileName,
    sizeKb: 280,
    documentNumber:
      req.id === "id_proof"
        ? customer.kycNumber || "AADHAAR-8821-4910-1123"
        : req.id === "pan_card"
        ? "ABCDE1234F"
        : undefined,
    verificationStatus: "Verified",
    verificationNotes: "Auto-verified digital compliance record",
  };
}
