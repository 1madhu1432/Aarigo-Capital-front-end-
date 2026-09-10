import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FolderLock,
  Search,
  FileText,
  Download,
  Trash2,
  FileCheck,
  UploadCloud,
  Plus,
  Filter,
  Eye,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  FileWarning,
  UserCheck,
  ArrowRight,
  Printer,
  MessageSquare,
  Award,
  Copy,
  Check,
  FileCode2,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { fmtDate, inr, todayISO, generateNocNumber } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { getAllCustomersCompliance, inferCategoryFromType } from "@/utils/document-compliance";
import { DEFAULT_TEMPLATES, renderTemplate, printHtmlDocument } from "@/utils/template-engine";
import type { DocumentFile, Loan } from "@/types";

export const Route = createFileRoute("/documents")({
  component: DocumentsPage,
});

const DOC_TYPES: DocumentFile["type"][] = [
  "Aadhaar Card",
  "Address Proof",
  "PAN Card",
  "Loan Agreement",
  "No Objection Certificate (NOC)",
  "Customer Photo",
  "Guarantor Document",
  "Salary Slip",
  "Bank Statement",
  "Other",
];

function DocumentsPage() {
  const {
    documents,
    customers,
    loans,
    settings,
    admin,
    addDocument,
    addDocumentFull,
    deleteDocument,
    seedMissingDocuments,
    seedAllMissingDocuments,
  } = useStore();
  const navigate = useNavigate();
  const { location } = useRouterState();

  const [activeTab, setActiveTab] = useState<"all" | "noc" | "missing">("all");
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentFile | null>(null);

  // Sync tab and search query from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.searchStr);
    const tabParam = params.get("tab");
    if (tabParam === "noc" || tabParam === "missing" || tabParam === "all") {
      setActiveTab(tabParam);
    }
    const queryParam = params.get("query") || params.get("q") || params.get("loanId");
    if (queryParam) {
      setQuery(queryParam);
    }
  }, [location.searchStr]);

  // Form state for upload
  const [uploadCustomerId, setUploadCustomerId] = useState("");
  const [uploadType, setUploadType] = useState<DocumentFile["type"]>("Aadhaar Card");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");

  // NOC Certificate Modal state
  const [showNocModal, setShowNocModal] = useState(false);
  const [selectedNocLoan, setSelectedNocLoan] = useState<Loan | null>(null);
  const [nocCertNo, setNocCertNo] = useState("");
  const [nocIssueDate, setNocIssueDate] = useState(todayISO());

  // Closed & settled loans eligible for NOC
  const closedLoans = useMemo(() => {
    return loans.filter((l) => l.status === "Closed" || l.status === "Closed Early");
  }, [loans]);

  // Closed loans mapped with customer info and existing NOC document
  const closedLoansWithNoc = useMemo(() => {
    return closedLoans.map((loan) => {
      const customer = customers.find((c) => c.id === loan.customerId);
      const existingNocDoc = documents.find(
        (d) =>
          d.loanId === loan.id &&
          (d.type === "No Objection Certificate (NOC)" ||
            (d.name && d.name.toLowerCase().includes("noc")) ||
            (d.name && d.name.toLowerCase().includes("no objection")))
      );
      // Only use stable stored values — never generate a random number inside a
      // useMemo (it would produce a new number on every re-render).
      const certNo =
        existingNocDoc?.documentNumber ||
        loan.earlyClosure?.nocReferenceNumber ||
        null; // null = no NOC issued yet; generateNocNumber is called only on modal open

      return {
        loan,
        customer,
        existingNocDoc,
        certNo,
        isIssued: Boolean(existingNocDoc),
      };
    });
  }, [closedLoans, customers, documents]);

  const issuedNocCount = useMemo(() => {
    return closedLoansWithNoc.filter((item) => item.isIssued).length;
  }, [closedLoansWithNoc]);

  // Compute portfolio-wide compliance reports
  const complianceReports = useMemo(() => {
    return getAllCustomersCompliance(customers, documents, loans);
  }, [customers, documents, loans]);

  const nonCompliantCustomers = useMemo(() => {
    return complianceReports.filter((c) => !c.isCompliant);
  }, [complianceReports]);

  const compliantCount = complianceReports.filter((c) => c.isCompliant).length;
  const verifiedDocsCount = documents.filter((d) => d.verificationStatus === "Verified").length;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return documents.filter((d) => {
      const customer = customers.find((c) => c.id === d.customerId);
      const matchesQuery =
        !q ||
        d.name?.toLowerCase().includes(q) ||
        d.type?.toLowerCase().includes(q) ||
        (d.documentNumber && d.documentNumber.toLowerCase().includes(q)) ||
        (customer?.name && customer.name.toLowerCase().includes(q)) ||
        (customer?.id && customer.id.toLowerCase().includes(q));
      const matchesType = selectedType === "all" || d.type === selectedType;
      return matchesQuery && matchesType;
    });
  }, [documents, customers, query, selectedType]);

  const filteredMissing = useMemo(() => {
    if (!query) return nonCompliantCustomers;
    const q = query.toLowerCase().trim();
    return nonCompliantCustomers.filter(
      (c) =>
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        (c.customerMobile && c.customerMobile.includes(q)) ||
        (c.customerCity && c.customerCity.toLowerCase().includes(q))
    );
  }, [nonCompliantCustomers, query]);

  const filteredNocLoans = useMemo(() => {
    if (!query) return closedLoansWithNoc;
    const q = query.toLowerCase().trim();
    return closedLoansWithNoc.filter(
      (item) =>
        item.loan.id.toLowerCase().includes(q) ||
        (item.customer?.name && item.customer.name.toLowerCase().includes(q)) ||
        (item.customer?.id && item.customer.id.toLowerCase().includes(q)) ||
        (item.certNo && item.certNo.toLowerCase().includes(q))
    );
  }, [closedLoansWithNoc, query]);

  const handleOpenUpload = (customerId?: string, type?: string) => {
    if (customerId) {
      setUploadCustomerId(customerId);
    } else if (customers.length > 0 && !uploadCustomerId) {
      setUploadCustomerId(customers[0]?.id ?? "");
    }

    if (type) {
      setUploadType(type);
      setUploadDocName(`${type} - Document`);
    } else {
      setUploadType("Aadhaar Card");
      setUploadDocName("Identity Document");
    }
    setUploadFile(null);
    setUploadError("");
    setShowUploadDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadFile(file);
    if (file && !uploadDocName) {
      setUploadDocName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmitUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadCustomerId) {
      setUploadError("Please select a customer");
      return;
    }
    if (!uploadDocName.trim()) {
      setUploadError("Please enter a document name");
      return;
    }

    const sizeKb = uploadFile ? Math.round(uploadFile.size / 1024) : 420;
    const fileName = uploadFile ? uploadFile.name : `${uploadType.toLowerCase().replace(/\s+/g, "_")}.pdf`;

    addDocumentFull({
      customerId: uploadCustomerId,
      type: uploadType,
      category: inferCategoryFromType(uploadType),
      name: uploadDocName.trim(),
      fileName,
      sizeKb,
    });

    toast.success("Document uploaded & archived to customer records");
    setShowUploadDialog(false);
  };

  const handleDelete = (doc: DocumentFile) => {
    deleteDocument(doc.id);
    toast.success(`Removed document "${doc.name}"`);
  };

  const handleResolveAllMissing = () => {
    const addedCount = seedAllMissingDocuments();
    if (addedCount > 0) {
      toast.success(`Generated and archived ${addedCount} standard KYC documents for compliance.`);
    } else {
      toast.info("All customers currently satisfy mandatory KYC compliance requirements.");
    }
  };

  const handleSimulateDownload = (doc: DocumentFile) => {
    if (doc.fileData && doc.fileData.startsWith("<!DOCTYPE html>")) {
      printHtmlDocument(doc.fileData, doc.name);
      return;
    }
    const element = document.createElement("a");
    const file = new Blob([`Aarigo Capital Digital Vault Document: ${doc.name}\nType: ${doc.type}\nID: ${doc.id}\nCustomer: ${doc.customerId}\nUploaded: ${doc.uploadedAt}`], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = doc.fileName || `${doc.name}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success(`Downloaded ${doc.fileName || doc.name}`);
  };

  // Open NOC issuance modal for a specific loan
  const handleOpenNocModal = (loan: Loan) => {
    const existingNocDoc = documents.find(
      (d) =>
        d.loanId === loan.id &&
        (d.type === "No Objection Certificate (NOC)" || d.name.toLowerCase().includes("noc"))
    );
    const certNo =
      existingNocDoc?.documentNumber ||
      loan.earlyClosure?.nocReferenceNumber ||
      generateNocNumber(loan.id);

    setSelectedNocLoan(loan);
    setNocCertNo(certNo);
    setNocIssueDate(todayISO());
    setShowNocModal(true);
  };

  // Compute rendered NOC HTML
  const renderedNocHtml = useMemo(() => {
    if (!selectedNocLoan) return "";
    const customer = customers.find((c) => c.id === selectedNocLoan.customerId);
    if (!customer) return "";

    const templateDef = DEFAULT_TEMPLATES.noc_certificate;
    const templateHtml = settings.documentTemplates?.["noc_certificate"] || templateDef.defaultHtml;

    const data: Record<string, string | number> = {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "12-4-88, Market Road, Kadapa, Andhra Pradesh 516001",
      business_phone: settings.businessPhone || "+91 98480 12345",
      certificate_no: nocCertNo,
      issue_date: fmtDate(nocIssueDate),
      customer_name: customer.name,
      customer_id: customer.id,
      loan_id: selectedNocLoan.id,
      sanctioned_amount: inr(selectedNocLoan.principal),
      closure_date: fmtDate(selectedNocLoan.earlyClosure?.closureDate || selectedNocLoan.endDate || todayISO()),
      closure_type: selectedNocLoan.status === "Closed Early" ? "Early Settlement (Foreclosed)" : "Full Term Repaid (Maturity)",
    };

    return renderTemplate(templateHtml, data);
  }, [selectedNocLoan, nocCertNo, nocIssueDate, customers, settings]);

  const handlePrintNoc = () => {
    if (!selectedNocLoan || !renderedNocHtml) return;
    printHtmlDocument(renderedNocHtml, `NOC-Certificate-${selectedNocLoan.id}`);
  };

  const handleSaveNocToDocuments = () => {
    if (!selectedNocLoan || !renderedNocHtml) return;
    const customer = customers.find((c) => c.id === selectedNocLoan.customerId);
    if (!customer) return;

    // Check if NOC already exists
    const existing = documents.find(
      (d) =>
        d.loanId === selectedNocLoan.id &&
        (d.type === "No Objection Certificate (NOC)" || d.name.toLowerCase().includes("noc"))
    );

    if (existing) {
      toast.info(`NOC Certificate is already archived as document ${existing.id}`);
      return;
    }

    addDocumentFull({
      customerId: customer.id,
      loanId: selectedNocLoan.id,
      category: "LOAN_DOCUMENTS",
      type: "No Objection Certificate (NOC)",
      name: `No Objection Certificate - ${selectedNocLoan.id}`,
      fileName: `NOC-${selectedNocLoan.id}.html`,
      documentNumber: nocCertNo,
      sizeKb: 145,
      verificationStatus: "Verified",
      verificationNotes: `Official Loan Clearance Certificate issued on ${fmtDate(nocIssueDate)}`,
      fileData: renderedNocHtml,
    });

    toast.success(`NOC Certificate saved to documents repository for ${customer.name}`);
    setShowNocModal(false);
  };

  const handleShareNocOnWhatsApp = (loan: Loan) => {
    const customer = customers.find((c) => c.id === loan.customerId);
    if (!customer) return;
    // Use the pre-computed stable certNo; only generate a fresh one if truly missing
    const certNo =
      loan.earlyClosure?.nocReferenceNumber ||
      documents.find((d) => d.loanId === loan.id && d.type === "No Objection Certificate (NOC)")?.documentNumber ||
      generateNocNumber(loan.id); // safe here — only runs on button click, not on render
    const text = encodeURIComponent(
      `*AARIGO CAPITAL – NO OBJECTION CERTIFICATE (NOC)*\n\nDear ${customer.name},\nThis confirms that your Loan Account *${loan.id}* has been closed with ZERO outstanding dues. Your official NOC Certificate (*${certNo}*) has been issued.\n\nThank you for banking with Aarigo Capital.`
    );
    const phone = (customer.mobile || "").replace(/\D/g, "").slice(-10);
    window.open(`https://wa.me/91${phone}?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── Page Title & Action Bar ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Document Engine</h1>
            <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
              KYC & NOC Vault
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Centralized repository for borrower KYC verification, Loan Agreements, and official No Objection Certificates (NOC)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {closedLoans.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveTab("noc");
                if (closedLoans[0]) handleOpenNocModal(closedLoans[0]);
              }}
              className="text-xs h-9 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
            >
              <Award className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              Issue Loan NOC
            </Button>
          )}

          {nonCompliantCustomers.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResolveAllMissing}
              className="text-xs h-9 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
              Auto-Resolve KYC ({nonCompliantCustomers.length})
            </Button>
          )}

          <Button size="sm" onClick={() => handleOpenUpload()} className="text-xs h-9 cursor-pointer">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* ─── KPI Metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-xs border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Archived Files</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mt-1 font-mono">{documents.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total digital documents on record</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wide font-semibold">
                KYC Compliant
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {compliantCount} <span className="text-xs font-normal text-muted-foreground">of {customers.length}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">All mandatory documents verified</p>
          </CardContent>
        </Card>

        {/* Loan NOC Certificate Metric */}
        <Card
          className={`shadow-xs cursor-pointer transition-colors ${
            activeTab === "noc"
              ? "border-primary ring-1 ring-primary/20 bg-primary/5"
              : "border-border bg-card hover:border-primary/40"
          }`}
          onClick={() => setActiveTab("noc")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-primary uppercase tracking-wide font-bold">
                Loan Closure NOCs
              </span>
              <Award className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mt-1">
              {issuedNocCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">of {closedLoans.length} Settled</span>
            </p>
            <p className="text-[10px] text-primary/90 mt-0.5">
              {closedLoans.length - issuedNocCount > 0
                ? `${closedLoans.length - issuedNocCount} loans ready for NOC issue`
                : "All closed loans cleared with NOC"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`shadow-xs cursor-pointer transition-colors ${
            nonCompliantCustomers.length > 0
              ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
              : "border-border bg-card"
          }`}
          onClick={() => setActiveTab("missing")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase tracking-wide font-bold">
                Missing Documents
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-600 animate-pulse" />
            </div>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">
              {nonCompliantCustomers.length} <span className="text-xs font-normal text-muted-foreground">Borrowers</span>
            </p>
            <p className="text-[10px] text-rose-600/80 mt-0.5">Click to view & fix missing files</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Tabs & Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "all" | "noc" | "missing")}
          className="w-full sm:w-auto"
        >
          <TabsList className="h-9 bg-muted/70 p-1">
            <TabsTrigger value="all" className="text-xs cursor-pointer">
              All Files ({documents.length})
            </TabsTrigger>
            <TabsTrigger value="noc" className="text-xs flex items-center gap-1.5 cursor-pointer">
              <Award className="h-3.5 w-3.5 text-primary" />
              <span>Loan NOC Certificates</span>
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-mono">
                {closedLoans.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="missing" className="text-xs flex items-center gap-1.5 cursor-pointer">
              <span>Missing KYC Watchlist</span>
              {nonCompliantCustomers.length > 0 && (
                <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">
                  {nonCompliantCustomers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === "all"
                  ? "Search files, types, certs..."
                  : activeTab === "noc"
                  ? "Search loans, borrowers, NOC-..."
                  : "Search borrowers with missing docs..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          {activeTab === "all" && (
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-44 text-xs h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ─── TAB 1: ALL ARCHIVED DOCUMENTS REPOSITORY ────────────────────── */}
      {activeTab === "all" && (
        <Card className="shadow-xs border-border">
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                icon={FolderLock}
                title="No documents found"
                description={query || selectedType !== "all" ? "No archived files match the specified search filters." : "Upload customer documents to keep your digital records organized and compliant."}
                action={{
                  label: "Upload Document",
                  onClick: () => handleOpenUpload(),
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                      <th className="py-2.5 px-4 text-left font-medium">Document / File</th>
                      <th className="py-2.5 px-4 text-left font-medium">Borrower</th>
                      <th className="py-2.5 px-4 text-left font-medium">Type</th>
                      <th className="py-2.5 px-4 text-left font-medium">Doc / Cert No</th>
                      <th className="py-2.5 px-4 text-left font-medium">Archived Date</th>
                      <th className="py-2.5 px-4 text-left font-medium">Status</th>
                      <th className="py-2.5 px-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filtered.map((d) => {
                      const customer = customers.find((c) => c.id === d.customerId);
                      const isNoc =
                        d.type === "No Objection Certificate (NOC)" ||
                        d.name.toLowerCase().includes("noc") ||
                        d.name.toLowerCase().includes("no objection");

                      return (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded ${isNoc ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                                {isNoc ? <Award className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                              </div>
                              <div>
                                <span className="font-medium text-foreground block">{d.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {d.fileName} • {d.sizeKb} KB
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {customer ? (
                              <button
                                onClick={() => void navigate({ to: "/customers/$id", params: { id: customer.id } })}
                                className="text-left group cursor-pointer"
                              >
                                <span className="font-medium text-foreground group-hover:text-primary transition-colors block">
                                  {customer.name}
                                </span>
                                <span className="text-[10px] font-mono text-muted-foreground">{customer.id}</span>
                              </button>
                            ) : (
                              <span className="text-muted-foreground">{d.customerId}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className={`text-[10px] ${isNoc ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10" : "border-border"}`}>
                              {d.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {d.documentNumber || "—"}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{fmtDate(d.uploadedAt)}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                d.verificationStatus === "Verified"
                                  ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                                  : "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                              }`}
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-emerald-600 inline" />
                              {d.verificationStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                onClick={() => setPreviewDoc(d)}
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                                onClick={() => handleSimulateDownload(d)}
                                title={d.fileData ? "Print / View Document" : "Download File"}
                              >
                                {d.fileData ? <Printer className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(d)}
                                title="Delete Document"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 2: LOAN CLOSURE NOC CERTIFICATES DESK ───────────────────── */}
      {activeTab === "noc" && (
        <div className="space-y-4">
          <Card className="shadow-xs border-border bg-gradient-to-r from-card via-card to-emerald-500/5">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 shrink-0">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Official No Objection Certificate (NOC) Issuance
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Generate official loan clearance certificates confirming zero outstanding balance, full release of borrower liabilities, and collateral return.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-1 font-semibold">
                    {issuedNocCount} of {closedLoans.length} Issued
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border">
            <CardContent className="p-0">
              {filteredNocLoans.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No closed loans found"
                  description={query ? `No closed loans match "${query}"` : "When borrowers complete their loan tenure or early foreclosure settlement, they will appear here for NOC issuance."}
                  action={{
                    label: "View All Loans",
                    onClick: () => void navigate({ to: "/loans" }),
                  }}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground">
                        <th className="py-2.5 px-4 text-left font-medium">Loan Account</th>
                        <th className="py-2.5 px-4 text-left font-medium">Borrower Details</th>
                        <th className="py-2.5 px-4 text-left font-medium">Sanctioned Amount</th>
                        <th className="py-2.5 px-4 text-left font-medium">Closure Date & Type</th>
                        <th className="py-2.5 px-4 text-left font-medium">Balance</th>
                        <th className="py-2.5 px-4 text-left font-medium">NOC Status</th>
                        <th className="py-2.5 px-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredNocLoans.map(({ loan, customer, existingNocDoc, certNo, isIssued }) => {
                        const isEarly = loan.status === "Closed Early";

                        return (
                          <tr key={loan.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-emerald-600 shrink-0" />
                                <div>
                                  <span className="font-mono font-bold text-foreground block">{loan.id}</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {certNo ?? <span className="italic text-muted-foreground/60">Pending Issuance</span>}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {customer ? (
                                <button
                                  onClick={() => void navigate({ to: "/customers/$id", params: { id: customer.id } })}
                                  className="text-left group cursor-pointer"
                                >
                                  <span className="font-medium text-foreground group-hover:text-primary transition-colors block">
                                    {customer.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {customer.id} • {customer.mobile}
                                  </span>
                                </button>
                              ) : (
                                <span className="text-muted-foreground">{loan.customerId}</span>
                              )}
                            </td>

                            <td className="py-3 px-4 font-mono font-medium text-foreground">
                              {inr(loan.principal)}
                            </td>

                            <td className="py-3 px-4">
                              <span className="block text-foreground">
                                {fmtDate(loan.earlyClosure?.closureDate || loan.endDate || todayISO())}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] mt-0.5 ${
                                  isEarly
                                    ? "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                                    : "border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10"
                                }`}
                              >
                                {isEarly ? "Early Settlement" : "Full Maturity"}
                              </Badge>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ₹0.00
                              </span>
                              <span className="block text-[10px] text-muted-foreground">Zero Dues</span>
                            </td>

                            <td className="py-3 px-4">
                              {isIssued ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                  Issued ({existingNocDoc?.id})
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] font-medium">
                                  Ready to Issue
                                </Badge>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenNocModal(loan)}
                                  className="text-xs h-7 cursor-pointer"
                                >
                                  {isIssued ? <Eye className="h-3 w-3 mr-1" /> : <Award className="h-3 w-3 mr-1 text-primary" />}
                                  {isIssued ? "View NOC" : "Issue NOC"}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleShareNocOnWhatsApp(loan)}
                                  className="h-7 w-7 p-0 cursor-pointer text-emerald-600 hover:bg-emerald-500/10"
                                  title="Share NOC on WhatsApp"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: MISSING DOCUMENTS COMPLIANCE WATCHLIST ────────────────── */}
      {activeTab === "missing" && (
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 md:p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Borrower Compliance Audit: {nonCompliantCustomers.length} Incomplete Profiles
              </CardTitle>
              <CardDescription className="text-xs">
                Borrowers flagged below have active loans or sanctioned facilities but are missing mandatory KYC records.
              </CardDescription>
            </div>
            {nonCompliantCustomers.length > 0 && (
              <Button
                size="sm"
                onClick={handleResolveAllMissing}
                className="text-xs cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Auto-Fill All Missing KYC
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {filteredMissing.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="100% Portfolio Compliance"
                description="Every active customer in Aarigo Capital has satisfied mandatory KYC and address documentation."
              />
            ) : (
              <div className="divide-y divide-border/60">
                {filteredMissing.map((report) => (
                  <div key={report.customerId} className="p-4 sm:p-5 hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground text-sm">{report.customerName}</span>
                        <span className="font-mono text-xs text-muted-foreground">({report.customerId})</span>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          {report.missingCount} Missing Required Doc{report.missingCount > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span>Tel: {report.customerMobile}</span>
                        <span>•</span>
                        <span>Location: {report.customerCity}</span>
                        <span>•</span>
                        <span>Compliance Score: {report.completionPercentage}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {report.requirements
                          .filter((r) => !r.isUploaded && r.isMandatory)
                          .map((r) => (
                            <Badge
                              key={r.name}
                              variant="outline"
                              className="text-[10px] border-rose-500/40 text-rose-700 dark:text-rose-400 bg-rose-500/5 flex items-center gap-1"
                            >
                              <FileWarning className="h-3 w-3 text-rose-500" />
                              Missing: {r.name}
                            </Badge>
                          ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const firstMissing = report.requirements.find((r) => !r.isUploaded);
                          handleOpenUpload(report.customerId, firstMissing?.defaultType || "Aadhaar Card");
                        }}
                        className="text-xs h-8 cursor-pointer"
                      >
                        <UploadCloud className="h-3.5 w-3.5 mr-1" />
                        Upload
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const added = seedMissingDocuments(report.customerId);
                          if (added > 0) toast.success(`Generated ${added} standard KYC documents for ${report.customerName}`);
                        }}
                        className="text-xs h-8 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                        Auto-Fill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void navigate({ to: "/customers/$id", params: { id: report.customerId } })}
                        className="text-xs h-8 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        Profile <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Upload Document Dialog ───────────────────────────────────────── */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Upload Digital Record</DialogTitle>
            <DialogDescription className="text-xs">
              Archive customer KYC, signed contracts, or verification documents to the secure vault.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitUpload} className="space-y-3.5 pt-1">
            {uploadError && (
              <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Assign to Customer *</Label>
              <Select value={uploadCustomerId} onValueChange={setUploadCustomerId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select borrower..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Document Type *</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as DocumentFile["type"])}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Document Display Title *</Label>
              <Input
                value={uploadDocName}
                onChange={(e) => setUploadDocName(e.target.value)}
                placeholder="e.g. Aadhaar Card - Front & Back"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Select File (PDF, PNG, JPG)</Label>
              <div className="border border-dashed border-border rounded-lg p-3 text-center hover:bg-muted/40 transition-colors">
                <Input
                  type="file"
                  id="doc-file-input"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />
                <label htmlFor="doc-file-input" className="cursor-pointer block text-xs">
                  <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <span className="text-primary font-medium">Click to upload</span> or drag and drop
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {uploadFile ? uploadFile.name : "Simulated digital archive (up to 10MB)"}
                  </p>
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowUploadDialog(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs cursor-pointer">
                Upload & Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Preview Document Dialog ─────────────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-md">
          {previewDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  {previewDoc.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Document ID: {previewDoc.id} • Category: {previewDoc.type}
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-lg bg-muted/40 border border-border/80 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Associated Customer:</span>
                  <strong className="text-foreground font-medium">
                    {customers.find((c) => c.id === previewDoc.customerId)?.name ?? previewDoc.customerId}
                  </strong>
                </div>
                {previewDoc.documentNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificate / Doc Number:</span>
                    <span className="font-mono font-bold text-primary">{previewDoc.documentNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded Date:</span>
                  <span className="text-foreground">{fmtDate(previewDoc.uploadedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approx Size:</span>
                  <span className="font-mono text-foreground">{previewDoc.sizeKb} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verification Status:</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                    Verified Digital Record
                  </Badge>
                </div>
              </div>

              <div className="py-6 text-center border border-dashed rounded-lg border-border/80 text-muted-foreground text-xs space-y-2">
                <FileText className="h-10 w-10 mx-auto text-primary/60" />
                <p className="font-medium text-foreground">Secure Vault Record</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Encrypted institutional borrower record stored in Aarigo Capital compliant digital vault.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDoc(null)}
                  className="text-xs cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleSimulateDownload(previewDoc);
                    setPreviewDoc(null);
                  }}
                  className="text-xs cursor-pointer"
                >
                  {previewDoc.fileData ? <Printer className="h-3.5 w-3.5 mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                  {previewDoc.fileData ? "Print Document" : "Download File"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── OFFICIAL NOC CERTIFICATE MODAL (Print-Ready) ────────────────── */}
      <Dialog open={showNocModal} onOpenChange={setShowNocModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  No Objection & Loan Clearance Certificate (NOC)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Official clearance certificate confirming settlement and zero outstanding dues
                </p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-mono">
                {nocCertNo}
              </Badge>
            </div>
          </DialogHeader>

          {selectedNocLoan && (
            <div className="space-y-4 pt-2">
              {/* Form Controls for NOC */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border border-border/60 text-xs">
                <div>
                  <Label htmlFor="noc-loan-sel" className="text-[11px] font-medium">Selected Loan</Label>
                  <select
                    id="noc-loan-sel"
                    value={selectedNocLoan.id}
                    onChange={(e) => {
                      const l = closedLoans.find((x) => x.id === e.target.value);
                      if (l) handleOpenNocModal(l);
                    }}
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono mt-1"
                  >
                    {closedLoans.map((l) => {
                      const c = customers.find((x) => x.id === l.customerId);
                      return (
                        <option key={l.id} value={l.id}>
                          {l.id} — {c?.name} ({inr(l.principal)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <Label htmlFor="noc-cert-no" className="text-[11px] font-medium">Certificate Serial No *</Label>
                  <Input
                      id="noc-cert-no"
                      value={nocCertNo}
                      readOnly
                      className="text-xs h-8 font-mono font-bold text-primary mt-1 cursor-default select-all"
                    />
                </div>

                <div>
                  <Label htmlFor="noc-issue-date" className="text-[11px] font-medium">Issue Date *</Label>
                  <Input
                    id="noc-issue-date"
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
                  <span className="font-mono">Security Hash: {nocCertNo}-SHA256</span>
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
                  onClick={() => handleShareNocOnWhatsApp(selectedNocLoan)}
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
                    onClick={() => window.open("/templates?key=noc_certificate", "_blank")}
                    className="text-xs h-8 cursor-pointer border-border font-medium hover:bg-muted"
                    title="Edit NOC Certificate HTML template in template studio"
                  >
                    <FileCode2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Edit Template
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNocModal(false)}
                    className="text-xs h-8 cursor-pointer"
                  >
                    Close
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveNocToDocuments}
                    className="text-xs h-8 cursor-pointer"
                  >
                    <FolderLock className="h-3.5 w-3.5 mr-1.5" />
                    Save to Vault
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePrintNoc}
                    className="text-xs h-8 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Print NOC
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
