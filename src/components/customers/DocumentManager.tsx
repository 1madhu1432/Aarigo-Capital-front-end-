import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  FileCheck,
  FileWarning,
  Award,
  Printer,
  MessageSquare,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { fmtDate, inr, todayISO, generateNocNumber } from "@/lib/format";
import { DEFAULT_TEMPLATES, renderTemplate, printHtmlDocument } from "@/utils/template-engine";
import { getCustomerCompliance, type ComplianceRequirement } from "@/utils/document-compliance";
import type { DocumentCategory, DocumentFile, DocumentVerificationStatus } from "@/types";

const CATEGORIES: { label: string; value: DocumentCategory; types: string[] }[] = [
  {
    label: "IDENTITY / KYC",
    value: "IDENTITY_KYC",
    types: ["Aadhaar Card", "PAN Card", "Voter ID", "Driving Licence", "Passport", "Other Government ID"],
  },
  {
    label: "ADDRESS PROOF",
    value: "ADDRESS_PROOF",
    types: ["Aadhaar", "Electricity Bill", "Water Bill", "Gas Bill", "Bank Statement", "Rental Agreement", "Property / House Tax Receipt", "Other Address Proof"],
  },
  {
    label: "INCOME / FINANCIAL",
    value: "INCOME_FINANCIAL",
    types: ["Salary Slip", "Bank Statement", "Income Tax Return", "Business Proof", "GST Certificate", "Other Income Proof"],
  },
  {
    label: "LOAN DOCUMENTS",
    value: "LOAN_DOCUMENTS",
    types: [
      "No Objection Certificate (NOC)",
      "Loan Application",
      "Loan Agreement",
      "Promissory Note",
      "Sanction Letter",
      "Disbursement Proof",
      "EMI Schedule",
      "Guarantor Agreement",
      "Other Loan Document",
    ],
  },
  {
    label: "CUSTOMER / PERSONAL",
    value: "CUSTOMER_PERSONAL",
    types: ["Customer Photo", "Signature", "Nominee Document", "Guarantor Photo", "Guarantor ID Proof", "Guarantor Address Proof"],
  },
  {
    label: "COLLATERAL / SECURITY",
    value: "COLLATERAL_SECURITY",
    types: ["Property Documents", "Vehicle Documents", "RC", "Insurance", "Gold / Security Documents", "Other Security Documents"],
  },
  {
    label: "OTHER",
    value: "OTHER",
    types: ["Other Document"],
  },
];

interface DocumentManagerProps {
  customerId: string;
  loanId?: string;
}

export function DocumentManager({ customerId, loanId }: DocumentManagerProps) {
  const { customers, loans, documents, settings, addDocumentFull, updateDocumentStatus, deleteDocument, seedMissingDocuments } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("IDENTITY_KYC");
  const [selectedType, setSelectedType] = useState<string>("Aadhaar Card");
  const [docName, setDocName] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  // NOC certificate modal & generation state for closed loans
  const [showNocModal, setShowNocModal] = useState(false);
  const [nocCertNo, setNocCertNo] = useState("");
  const [nocIssueDate, setNocIssueDate] = useState(todayISO());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const customer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);

  const customerLoans = useMemo(() => {
    return loans.filter((l) => l.customerId === customerId);
  }, [loans, customerId]);

  const hasCustomerLoans = customerLoans.length > 0 || Boolean(loanId);

  const customerDocs = useMemo(() => {
    return documents.filter((d) => {
      if (d.customerId !== customerId) return false;
      if (loanId && d.loanId && d.loanId !== loanId) return false;
      // If customer has NOT taken any loan, loan documents (agreements, sanctions) do not apply
      if (!hasCustomerLoans && d.category === "LOAN_DOCUMENTS") return false;
      return true;
    });
  }, [documents, customerId, loanId, hasCustomerLoans]);

  // Compute compliance and missing documents
  const compliance = useMemo(() => {
    if (!customer) return null;
    return getCustomerCompliance(customer, documents, loans, loanId);
  }, [customer, documents, loans, loanId]);

  const availableCategories = useMemo(() => {
    if (!hasCustomerLoans) {
      return CATEGORIES.filter((c) => c.value !== "LOAN_DOCUMENTS");
    }
    return CATEGORIES;
  }, [hasCustomerLoans]);

  const filteredDocs = useMemo(() => {
    if (filterCategory === "ALL") return customerDocs;
    if (filterCategory === "LOAN_DOCUMENTS" && !hasCustomerLoans) return [];
    return customerDocs.filter((d) => d.category === filterCategory);
  }, [customerDocs, filterCategory, hasCustomerLoans]);

  const currentLoan = useMemo(() => {
    return loanId ? loans.find((l) => l.id === loanId) : null;
  }, [loans, loanId]);

  const isClosedLoan = currentLoan?.status === "Closed" || currentLoan?.status === "Closed Early";

  const existingNoc = useMemo(() => {
    if (!loanId) return null;
    return documents.find(
      (d) =>
        d.loanId === loanId &&
        (d.type === "No Objection Certificate (NOC)" ||
          (d.name && d.name.toLowerCase().includes("noc")) ||
          (d.name && d.name.toLowerCase().includes("no objection")))
    );
  }, [documents, loanId]);

  const renderedNocHtml = useMemo(() => {
    if (!currentLoan || !customer) return "";
    // Use the certificate number already set in state (via handleOpenNocModal).
    // NEVER call generateNocNumber() here — doing so would produce a new random
    // number on every re-render, making the displayed number keep changing.
    const certNumber =
      nocCertNo ||
      existingNoc?.documentNumber ||
      currentLoan.earlyClosure?.nocReferenceNumber ||
      ""; // empty until the modal is opened and sets nocCertNo

    const templateDef = DEFAULT_TEMPLATES.noc_certificate;
    const templateHtml = settings.documentTemplates?.["noc_certificate"] || templateDef?.defaultHtml || "";

    const data: Record<string, string | number> = {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "12-4-88, Market Road, Kadapa, Andhra Pradesh 516001",
      business_phone: settings.businessPhone || "+91 98480 12345",
      certificate_no: certNumber,
      issue_date: fmtDate(nocIssueDate),
      customer_name: customer.name || "Customer",
      customer_id: customer.id,
      loan_id: currentLoan.id,
      sanctioned_amount: inr(currentLoan.principal),
      closure_date: fmtDate(currentLoan.earlyClosure?.closureDate || currentLoan.endDate || todayISO()),
      closure_type: currentLoan.status === "Closed Early" ? "Early Settlement (Foreclosed)" : "Full Term Repaid (Maturity)",
    };

    return renderTemplate(templateHtml, data);
  }, [currentLoan, customer, existingNoc, nocCertNo, nocIssueDate, settings]);

  const handleOpenNocModal = () => {
    const certNumber =
      existingNoc?.documentNumber ||
      currentLoan?.earlyClosure?.nocReferenceNumber ||
      generateNocNumber(currentLoan?.id ?? "");
    setNocCertNo(certNumber);
    setNocIssueDate(todayISO());
    setShowNocModal(true);
  };

  const handlePrintNoc = () => {
    if (!renderedNocHtml || !currentLoan) return;
    printHtmlDocument(renderedNocHtml, `NOC-Certificate-${currentLoan.id}`);
  };

  const handleSaveNocToVault = () => {
    if (!currentLoan || !customer || !renderedNocHtml) return;
    if (existingNoc) {
      toast.info(`NOC Certificate is already archived in documents as ${existingNoc.id}`);
      return;
    }
    const certNumber =
      nocCertNo ||
      currentLoan.earlyClosure?.nocReferenceNumber ||
      generateNocNumber(currentLoan.id);

    addDocumentFull({
      customerId: customer.id,
      loanId: currentLoan.id,
      category: "LOAN_DOCUMENTS",
      type: "No Objection Certificate (NOC)",
      name: `No Objection Certificate - ${currentLoan.id}`,
      fileName: `NOC-${currentLoan.id}.html`,
      documentNumber: certNumber,
      sizeKb: 145,
      verificationStatus: "Verified",
      verificationNotes: `Official Loan Clearance Certificate issued on ${fmtDate(nocIssueDate)}`,
      fileData: renderedNocHtml,
    });
    toast.success(`NOC Certificate saved to documents repository for ${customer.name}`);
    setShowNocModal(false);
  };

  const handleShareNocOnWhatsApp = () => {
    if (!customer || !currentLoan) return;
    const certNumber =
      nocCertNo ||
      existingNoc?.documentNumber ||
      currentLoan.earlyClosure?.nocReferenceNumber ||
      "";  // cert number is set in state when modal opens
    const text = encodeURIComponent(
      `*AARIGO CAPITAL – NO OBJECTION CERTIFICATE (NOC)*\n\nDear ${customer.name},\nThis confirms that your Loan Account *${currentLoan.id}* has been closed with ZERO outstanding dues. Your official NOC Certificate (*${certNumber}*) has been issued.\n\nThank you for banking with Aarigo Capital.`
    );
    const phone = (customer.mobile || "").replace(/\D/g, "").slice(-10);
    window.open(`https://wa.me/91${phone}?text=${text}`, "_blank");
  };

  const currentTypes = useMemo(() => {
    return CATEGORIES.find((c) => c.value === selectedCategory)?.types ?? ["Other Document"];
  }, [selectedCategory]);

  const handleCategoryChange = (val: DocumentCategory) => {
    setSelectedCategory(val);
    const cat = CATEGORIES.find((c) => c.value === val);
    if (cat && cat.types[0]) {
      setSelectedType(cat.types[0]);
    }
  };

  const handleFixMissing = (req: ComplianceRequirement) => {
    setSelectedCategory(req.category);
    setSelectedType(req.defaultType);
    setDocName(`${req.defaultType} - ${customer?.name ?? "Borrower"}`);
    if (req.id === "id_proof" && customer?.kycNumber) {
      setDocNumber(customer.kycNumber);
    } else {
      setDocNumber("");
    }
    setIsUploading(true);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleAutoResolveMissing = () => {
    const count = seedMissingDocuments(customerId, loanId);
    if (count > 0) {
      toast.success(`Resolved ${count} missing document${count > 1 ? "s" : ""}! All requirements verified.`);
    } else {
      toast.info("All required compliance documents are already uploaded.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileData = event.target?.result as string;
      const sizeKb = Math.round(file.size / 1024);

      addDocumentFull({
        customerId,
        loanId,
        category: selectedCategory,
        type: selectedType,
        name: docName.trim() || `${selectedType} - ${file.name}`,
        fileName: file.name,
        sizeKb,
        documentNumber: docNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        verificationStatus: "Verified",
        fileData,
      });

      toast.success(`${selectedType} uploaded and verified successfully!`);
      setDocName("");
      setDocNumber("");
      setExpiryDate("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = (doc: DocumentFile, status: DocumentVerificationStatus) => {
    updateDocumentStatus(doc.id, status, actionNotes.trim() || undefined);
    toast.success(`Document marked as ${status}`);
    setActionNotes("");
    if (previewDoc?.id === doc.id) {
      setPreviewDoc((prev) => (prev ? { ...prev, verificationStatus: status } : null));
    }
  };

  const handleDownload = (doc: DocumentFile) => {
    if (doc.fileData) {
      const a = document.createElement("a");
      a.href = doc.fileData;
      a.download = doc.fileName;
      a.click();
    } else {
      // Fallback text download simulation
      const content = `Aarigo Capital Document Archive\nDocument ID: ${doc.id}\nCustomer ID: ${doc.customerId}\nType: ${doc.type}\nFile Name: ${doc.name}\nUploaded: ${doc.uploadedAt}\nSize: ${doc.sizeKb} KB\n\n[Verified Secure KYC Document Content]`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${doc.name.replace(/\.[^/.]+$/, "")}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${doc.name}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── 0. Closed Loan Clearance & Official NOC Banner ───────────────── */}
      {isClosedLoan && currentLoan && (
        <Card className="border border-emerald-500/40 bg-emerald-500/5 shadow-xs">
          <CardHeader className="p-4 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-bold text-foreground">
                      Loan Clearance & No Objection Certificate (NOC)
                    </CardTitle>
                    {existingNoc ? (
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        NOC Issued ({existingNoc.documentNumber || existingNoc.id})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-[10px] font-semibold">
                        Ready to Issue
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Loan {currentLoan.id} has been fully cleared with zero outstanding dues. Official No Objection Certificate is available for borrower release and collateral return.
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenNocModal}
                  className="text-xs h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                >
                  <Award className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  {existingNoc ? "View NOC Certificate" : "Issue & Print NOC"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShareNocOnWhatsApp}
                  className="h-8 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                  title="Share NOC on WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* ─── 1. Compliance Audit & Missing Documents Panel ─────────────────── */}
      {compliance && (
        <Card className={`border shadow-xs transition-all ${compliance.isCompliant ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"}`}>
          <CardHeader className="p-4 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${compliance.isCompliant ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/20 text-rose-700 dark:text-rose-300"}`}>
                  {compliance.isCompliant ? <ShieldCheck className="h-5 w-5" /> : <FileWarning className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-bold text-foreground">
                      Document Compliance & Missing Checklist
                    </CardTitle>
                    {compliance.isCompliant ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        KYC & Loan Compliant
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] font-semibold animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {compliance.missingCount} Missing Required Document{compliance.missingCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {compliance.isCompliant
                      ? "All mandatory KYC identity, address, and loan agreement files are archived on record."
                      : "Action required: Complete the missing mandatory documents below to clear compliance checks."}
                  </CardDescription>
                </div>
              </div>

              {!compliance.isCompliant && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoResolveMissing}
                  className="text-xs h-8 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer shrink-0 self-start sm:self-center"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
                  Auto-Resolve All ({compliance.missingCount})
                </Button>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">
                  Compliance Completion ({compliance.uploadedCount} of {compliance.totalRequired} Mandatory Documents)
                </span>
                <span className="font-bold text-foreground">{compliance.completionPercentage}%</span>
              </div>
              <Progress
                value={compliance.completionPercentage}
                className={`h-1.5 ${compliance.isCompliant ? "[&>div]:bg-emerald-600" : "[&>div]:bg-rose-600"}`}
              />
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {compliance.requirements.map((req) => (
                <div
                  key={req.id}
                  className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-all ${
                    req.isUploaded
                      ? "bg-card border-border/80"
                      : "bg-rose-500/10 border-rose-500/30 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className={`font-semibold text-xs ${req.isUploaded ? "text-foreground" : "text-rose-700 dark:text-rose-300"}`}>
                          {req.name}
                        </p>
                        {req.isMandatory && (
                          <span className="text-[9px] text-destructive font-bold">*</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {req.description}
                      </p>
                    </div>

                    {req.isUploaded ? (
                      <Badge
                        variant="outline"
                        className={`text-[9px] shrink-0 font-medium ${
                          req.isVerified
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {req.isVerified ? (
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        ) : (
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                        )}
                        {req.statusText}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] shrink-0 font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40"
                      >
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        Missing
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground truncate">
                      {req.isUploaded
                        ? `File: ${req.uploadedDoc?.fileName ?? "On record"}`
                        : `Required: ${req.defaultType}`}
                    </span>

                    {req.isUploaded ? (
                      req.uploadedDoc && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewDoc(req.uploadedDoc!)}
                          className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleFixMissing(req)}
                        className="h-6 px-2 text-[10px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shrink-0"
                      >
                        <Upload className="h-2.5 w-2.5 mr-1" />
                        Upload Missing
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 2. Top Action Bar & Upload Section ───────────────────────────── */}
      <Card className="border border-border/80 bg-card">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-bold">Document Vault & Verification</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsUploading(!isUploading)}
              className="h-8 text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Upload Document
            </Button>
          </div>
        </CardHeader>

        {/* Upload Form Modal/Section */}
        {isUploading && (
          <CardContent className="p-4 border-t border-border/60 bg-muted/20 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">Upload & Record Document</span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setIsUploading(false)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Category</Label>
                <Select value={selectedCategory} onValueChange={(v) => handleCategoryChange(v as DocumentCategory)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTypes.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Document Label / Title</Label>
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Front & Back Aadhaar"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Doc / ID Number (Optional)</Label>
                <Input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer w-full"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Select File & Save
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─── 3. Category Filter Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          size="sm"
          variant={filterCategory === "ALL" ? "default" : "outline"}
          onClick={() => setFilterCategory("ALL")}
          className="h-7 text-xs rounded-full cursor-pointer shrink-0"
        >
          All ({customerDocs.length})
        </Button>
        {availableCategories.map((cat) => {
          const count = customerDocs.filter((d) => d.category === cat.value).length;
          return (
            <Button
              key={cat.value}
              size="sm"
              variant={filterCategory === cat.value ? "default" : "outline"}
              onClick={() => setFilterCategory(cat.value)}
              className="h-7 text-xs rounded-full cursor-pointer shrink-0"
            >
              {cat.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* ─── 4. Documents List Table ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center space-y-3 text-muted-foreground">
            <FileText className="h-9 w-9 mx-auto opacity-40 text-primary" />
            <div>
              <p className="text-xs font-semibold text-foreground">No documents uploaded for this category</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Upload official KYC or agreement files, or click "Auto-Resolve" to clear missing items.
              </p>
            </div>
            {compliance && !compliance.isCompliant && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoResolveMissing}
                className="text-xs h-8 border-rose-500/30 text-rose-700 dark:text-rose-300"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Auto-Create Missing Documents
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Category / Type</th>
                  <th className="p-3">Document Name</th>
                  <th className="p-3">Doc Number</th>
                  <th className="p-3">Uploaded</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-bold text-foreground">{doc.type}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{(doc.category || "OTHER").replace("_", " ")}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{doc.fileName} ({doc.sizeKb} KB)</p>
                    </td>
                    <td className="p-3 font-mono text-xs text-foreground">
                      {doc.documentNumber || "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {fmtDate(doc.uploadedAt)}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] gap-1 ${
                          doc.verificationStatus === "Verified"
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                            : doc.verificationStatus === "Rejected"
                            ? "bg-rose-500/10 text-rose-700 border-rose-500/30"
                            : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                        }`}
                      >
                        {doc.verificationStatus === "Verified" && <CheckCircle2 className="h-3 w-3" />}
                        {doc.verificationStatus === "Rejected" && <XCircle className="h-3 w-3" />}
                        {doc.verificationStatus === "Pending" && <Clock className="h-3 w-3" />}
                        {doc.verificationStatus}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 cursor-pointer"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => {
                            deleteDocument(doc.id);
                            toast.success("Document deleted");
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 5. Preview & Verification Dialog ──────────────────────────────── */}
      {previewDoc && (
        <Dialog open={Boolean(previewDoc)} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center justify-between">
                <span>{previewDoc.type}</span>
                <Badge
                  variant="outline"
                  className={
                    previewDoc.verificationStatus === "Verified"
                      ? "bg-emerald-500/10 text-emerald-700"
                      : previewDoc.verificationStatus === "Rejected"
                      ? "bg-rose-500/10 text-rose-700"
                      : "bg-amber-500/10 text-amber-700"
                  }
                >
                  {previewDoc.verificationStatus}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Category: {previewDoc.category} • File: {previewDoc.fileName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              {/* Preview Window */}
              <div className="w-full h-64 rounded-xl border border-border bg-black/5 flex items-center justify-center overflow-hidden">
                {previewDoc.fileData?.startsWith("data:image/") ? (
                  <img src={previewDoc.fileData} alt={previewDoc.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-primary opacity-60" />
                    <p className="font-semibold text-xs">{previewDoc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{previewDoc.fileName} ({previewDoc.sizeKb} KB)</p>
                  </div>
                )}
              </div>

              {/* Doc Metadata */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Document ID</span>
                  <span className="font-mono font-semibold">{previewDoc.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Uploaded Date</span>
                  <span className="font-semibold">{fmtDate(previewDoc.uploadedAt)}</span>
                </div>
                {previewDoc.documentNumber && (
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Doc Number</span>
                    <span className="font-mono font-semibold">{previewDoc.documentNumber}</span>
                  </div>
                )}
                {previewDoc.expiryDate && (
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Expiry Date</span>
                    <span className="font-semibold">{fmtDate(previewDoc.expiryDate)}</span>
                  </div>
                )}
              </div>

              {/* Verification Controls */}
              <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                <span className="font-bold text-xs block">Update Verification Status</span>
                <Input
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Verification notes (e.g. Aadhaar verified against Govt Portal)"
                  className="h-8 text-xs"
                />
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-rose-500/40 text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                    onClick={() => handleVerify(previewDoc, "Rejected")}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject Document
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    onClick={() => handleVerify(previewDoc, "Verified")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Mark Verified
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── 6. Official NOC Certificate Preview & Issuance Modal ───────── */}
      {isClosedLoan && currentLoan && (
        <Dialog open={showNocModal} onOpenChange={setShowNocModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="h-4 w-4 text-emerald-600" />
                    No Objection & Loan Clearance Certificate (NOC)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Official clearance certificate confirming settlement and zero outstanding dues for Loan {currentLoan.id}
                  </DialogDescription>
                </div>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-mono">
                  {nocCertNo || existingNoc?.documentNumber || "NOC"}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border/60 text-xs">
                <div>
                  <Label htmlFor="dm-noc-cert-no" className="text-[11px] font-medium">Certificate Serial No *</Label>
                  <Input
                      id="dm-noc-cert-no"
                      value={nocCertNo}
                      readOnly
                      className="text-xs h-8 font-mono font-bold text-primary mt-1 cursor-default select-all"
                    />
                </div>

                <div>
                  <Label htmlFor="dm-noc-issue-date" className="text-[11px] font-medium">Issue Date *</Label>
                  <Input
                    id="dm-noc-issue-date"
                    type="date"
                    value={nocIssueDate}
                    onChange={(e) => setNocIssueDate(e.target.value)}
                    className="text-xs h-8 mt-1"
                  />
                </div>
              </div>

              {/* Rendered Live Certificate Preview */}
              <div className="border border-border/80 rounded-lg overflow-hidden bg-white shadow-inner">
                <div className="p-2 bg-muted/60 border-b border-border/60 flex items-center justify-between text-[11px] text-muted-foreground px-3">
                  <span>Document Preview (Standard A4 / Letter)</span>
                  <span className="font-mono">Security Hash: {nocCertNo || "NOC"}-SHA256</span>
                </div>
                <div
                  className="p-6 text-black bg-white overflow-x-auto min-h-[420px]"
                  dangerouslySetInnerHTML={{ __html: renderedNocHtml }}
                />
              </div>

              <DialogFooter className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleShareNocOnWhatsApp}
                  className="text-xs h-8 cursor-pointer text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30 w-full sm:w-auto"
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                  Share on WhatsApp
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNocModal(false)}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Close
                  </Button>

                  {!existingNoc && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSaveNocToVault}
                      className="text-xs h-8 cursor-pointer border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Save to Vault
                    </Button>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePrintNoc}
                    className="text-xs h-8 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print Certificate
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
