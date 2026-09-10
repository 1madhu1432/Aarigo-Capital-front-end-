import { useState, useMemo, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileCode2,
  Save,
  RotateCcw,
  Printer,
  Copy,
  Download,
  Eye,
  Check,
  Receipt,
  FileText,
  Calendar,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Info,
  Maximize2,
  Columns,
  Code,
  UserCheck,
  FileSignature,
  Banknote,
  ClipboardCheck,
  ShieldAlert,
  Search,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import {
  DEFAULT_TEMPLATES,
  TemplateDefinition,
  renderTemplate,
  printHtmlDocument,
} from "@/utils/template-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/templates")({
  validateSearch: (search: Record<string, unknown>) => ({
    key: (search.key as string) || (search.template as string) || "payment_receipt",
  }),
  component: TemplatesPage,
});

const TEMPLATE_KEYS = [
  "payment_receipt",
  "sanction_agreement",
  "emi_schedule",
  "account_statement",
  "noc_certificate",
  "demand_notice",
  "customer_application",
  "promissory_note",
  "disbursement_voucher",
  "visit_slip",
  "foreclosure_statement",
  "guarantor_undertaking",
] as const;

function TemplatesPage() {
  const searchParams = Route.useSearch();
  const { settings, updateSettings } = useStore();
  const [activeKey, setActiveKey] = useState<string>(
    searchParams.key && DEFAULT_TEMPLATES[searchParams.key] ? searchParams.key : "payment_receipt"
  );

  useEffect(() => {
    if (searchParams.key && DEFAULT_TEMPLATES[searchParams.key] && searchParams.key !== activeKey) {
      setActiveKey(searchParams.key);
    }
  }, [searchParams.key]);
  const [viewMode, setViewMode] = useState<"split" | "code" | "preview">("split");
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Template definitions
  const activeTemplateDef: TemplateDefinition = DEFAULT_TEMPLATES[activeKey] || DEFAULT_TEMPLATES.payment_receipt;

  // Working code in editor
  const customTemplates = settings.documentTemplates || {};
  const currentSavedCode = customTemplates[activeKey] || activeTemplateDef.defaultHtml;
  const [editorCode, setEditorCode] = useState<string>(currentSavedCode);

  // Update editorCode when switching active template
  useEffect(() => {
    const saved = customTemplates[activeKey] || DEFAULT_TEMPLATES[activeKey]?.defaultHtml || "";
    setEditorCode(saved);
  }, [activeKey, customTemplates]);

  const hasUnsavedChanges = editorCode !== currentSavedCode;
  const isCustomized = Boolean(customTemplates[activeKey] && customTemplates[activeKey] !== activeTemplateDef.defaultHtml);

  // Textarea ref for inserting tokens at cursor
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertToken = (tokenKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const token = `{{${tokenKey}}}`;
    const newText = editorCode.substring(0, start) + token + editorCode.substring(end);
    setEditorCode(newText);

    // Reposition cursor after the inserted token
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);

    toast.info(`Inserted token {{${tokenKey}}}`);
  };

  // Sample data dictionary for real-time preview
  const sampleData = useMemo(() => {
    const data: Record<string, string> = {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "Market Road, Kadapa, Andhra Pradesh 516001",
      business_phone: settings.businessPhone || "+91 98480 12345",
      business_email: settings.businessEmail || "admin@aarigocapital.com",
      receipt_footer: settings.receiptFooter || "Thank you for your timely repayment. Keep this receipt for your records.",
    };

    activeTemplateDef.variables.forEach((v) => {
      if (!data[v.key]) {
        data[v.key] = v.sample;
      }
    });

    return data;
  }, [settings, activeTemplateDef]);

  // Live rendered HTML for preview
  const renderedHtml = useMemo(() => {
    return renderTemplate(editorCode, sampleData);
  }, [editorCode, sampleData]);

  // Save handler
  const handleSave = () => {
    updateSettings({
      documentTemplates: {
        ...customTemplates,
        [activeKey]: editorCode,
      },
    });
    toast.success(`Saved customized HTML for "${activeTemplateDef.name}"`);
  };

  // Reset to default
  const handleReset = () => {
    if (confirm(`Reset "${activeTemplateDef.name}" to its original default HTML template?`)) {
      const updated = { ...customTemplates };
      delete updated[activeKey];
      updateSettings({ documentTemplates: updated });
      setEditorCode(activeTemplateDef.defaultHtml);
      toast.success(`Reset "${activeTemplateDef.name}" to default template`);
    }
  };

  // Copy HTML
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editorCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("HTML template copied to clipboard");
    } catch {
      toast.error("Failed to copy HTML");
    }
  };

  // Download HTML file
  const handleDownload = () => {
    const blob = new Blob([editorCode], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeKey}_template.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${activeKey}_template.html`);
  };

  // Test Print
  const handleTestPrint = () => {
    printHtmlDocument(renderedHtml, `${activeTemplateDef.name} Preview`);
  };

  const getTemplateIcon = (id: string) => {
    switch (id) {
      case "payment_receipt":
        return Receipt;
      case "sanction_agreement":
        return FileText;
      case "emi_schedule":
        return Calendar;
      case "account_statement":
        return FileSpreadsheet;
      case "noc_certificate":
        return ShieldCheck;
      case "demand_notice":
        return AlertTriangle;
      case "customer_application":
        return UserCheck;
      case "promissory_note":
        return FileSignature;
      case "disbursement_voucher":
        return Banknote;
      case "visit_slip":
        return ClipboardCheck;
      case "foreclosure_statement":
        return ShieldAlert;
      case "guarantor_undertaking":
        return ShieldCheck;
      default:
        return FileCode2;
    }
  };

  const categories = ["All", "Receipt", "Agreement", "Statement", "Certificate", "Notice", "Application", "Voucher"];

  const filteredKeys = useMemo(() => {
    return TEMPLATE_KEYS.filter((key) => {
      const t = DEFAULT_TEMPLATES[key];
      if (!t) return false;
      if (selectedCategory !== "All" && t.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesKey = key.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesKey) return false;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Document & Print HTML Templates
            </h1>
            <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/20">
              HTML + CSS Engine
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Customize and brand your official print documents, payment receipts, loan agreements, and clearance certificates
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9 cursor-pointer"
            onClick={handleTestPrint}
            title="Open physical print dialog with preview data"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Test Print
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9 cursor-pointer"
            onClick={handleCopy}
            title="Copy current HTML code"
          >
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy HTML"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9 cursor-pointer"
            onClick={handleDownload}
            title="Export .html file"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export .html
          </Button>

          {isCustomized && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-9 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={handleReset}
              title="Reset to default template"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset Default
            </Button>
          )}

          <Button
            size="sm"
            className={`text-xs h-9 font-medium cursor-pointer shadow-xs ${
              hasUnsavedChanges ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
            }`}
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {hasUnsavedChanges ? "Save Changes *" : "Saved"}
          </Button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/80 shadow-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const count = cat === "All" 
              ? TEMPLATE_KEYS.length 
              : TEMPLATE_KEYS.filter((k) => DEFAULT_TEMPLATES[k]?.category === cat).length;
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isCatActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat} <span className="opacity-70 text-[10px] ml-1">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[200px] md:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Template Selector Grid */}
      {filteredKeys.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20 text-muted-foreground text-xs">
          No templates found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredKeys.map((key) => {
            const t = DEFAULT_TEMPLATES[key];
            const Icon = getTemplateIcon(key);
            const isSelected = activeKey === key;
            const isTModified = Boolean(customTemplates[key] && customTemplates[key] !== t.defaultHtml);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                className={`p-3 text-left rounded-lg border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/40"
                    : "bg-card hover:bg-muted/40 border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div
                      className={`p-1.5 rounded-md ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex items-center gap-1">
                      {isTModified && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-bold leading-tight line-clamp-1">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.category}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Available Placeholder Variables Toolbar */}
      <Card className="shadow-xs border-border/80 bg-muted/20">
        <CardContent className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Available Dynamic Placeholders</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                (Click any tag to insert into HTML at cursor position)
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {activeTemplateDef.variables.length} tags available
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {activeTemplateDef.variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertToken(v.key)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded bg-background hover:bg-primary/10 border border-border/80 hover:border-primary/40 text-foreground transition-all cursor-pointer group shadow-2xs"
                title={`${v.description} (Sample: ${v.sample})`}
              >
                <span className="text-primary group-hover:scale-105 transition-transform">+</span>
                <span>{`{{${v.key}}}`}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor & Live Preview Panel */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>{activeTemplateDef.name}</span>
              {hasUnsavedChanges && (
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  Unsaved changes
                </span>
              )}
            </h2>
          </div>

          {/* View toggle buttons */}
          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/70 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === "split" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Columns className="h-3 w-3" />
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === "code" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code className="h-3 w-3" />
              <span className="hidden sm:inline">HTML Code</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-2.5 py-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === "preview" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">Live Preview</span>
            </button>
          </div>
        </div>

        {/* Dual Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Code Editor Panel */}
          {(viewMode === "split" || viewMode === "code") && (
            <div className={`space-y-1.5 ${viewMode === "code" ? "lg:col-span-2" : ""}`}>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>HTML & CSS Template Code</span>
                <span className="font-mono">{editorCode.length} characters • {editorCode.split("\n").length} lines</span>
              </div>
              <div className="relative rounded-lg border border-border bg-slate-950 text-slate-100 overflow-hidden shadow-sm">
                <textarea
                  ref={textareaRef}
                  value={editorCode}
                  onChange={(e) => setEditorCode(e.target.value)}
                  className="w-full h-[620px] p-4 font-mono text-xs leading-relaxed bg-transparent text-slate-100 resize-none outline-none selection:bg-primary/30"
                  spellCheck={false}
                  placeholder="Enter HTML and CSS markup here..."
                />
              </div>
            </div>
          )}

          {/* Live Preview Panel */}
          {(viewMode === "split" || viewMode === "preview") && (
            <div className={`space-y-1.5 ${viewMode === "preview" ? "lg:col-span-2" : ""}`}>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Real-Time Document Preview (A4 / Paper Sandbox)</span>
                <span className="text-[10px] text-emerald-600 font-medium">Live Interpolated Data</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2 shadow-sm overflow-hidden">
                <iframe
                  title="Document Preview"
                  srcDoc={renderedHtml}
                  className="w-full h-[620px] bg-white rounded border border-border/60 shadow-xs"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
