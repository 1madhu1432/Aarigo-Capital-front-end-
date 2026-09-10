import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { WhatsAppBrandIcon } from "@/components/common/WhatsAppIcon";
import { Download, Phone, User, CheckCircle2, Copy, FileText, ArrowRight, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { normalizePhoneForWhatsApp } from "@/utils/whatsapp";

export interface WhatsAppShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  customerId?: string;
  registeredPhone?: string;
  altPhone?: string;
  guarantorPhone?: string;
  documentTitle: string; // e.g. "Payment Receipt #RC-000101"
  documentFilename: string; // e.g. "Receipt_RC-000101.pdf"
  onSendWhatsApp: (phone: string) => Promise<void> | void;
  onDownloadPdf?: () => Promise<void> | void;
  onCopyText?: () => void;
}

export function WhatsAppShareModal({
  open,
  onOpenChange,
  customerName = "Customer",
  customerId,
  registeredPhone = "",
  altPhone = "",
  guarantorPhone = "",
  documentTitle,
  documentFilename,
  onSendWhatsApp,
  onDownloadPdf,
  onCopyText,
}: WhatsAppShareModalProps) {
  const [selectedPhone, setSelectedPhone] = useState<string>(registeredPhone);
  const [customPhone, setCustomPhone] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Keep selected phone in sync when registeredPhone changes
  React.useEffect(() => {
    if (registeredPhone && !isCustom) {
      setSelectedPhone(registeredPhone);
    }
  }, [registeredPhone, isCustom]);

  const activePhone = isCustom ? customPhone : selectedPhone;
  const cleanTargetPhone = normalizePhoneForWhatsApp(activePhone);

  const handleSend = async () => {
    if (!cleanTargetPhone) {
      toast.error("Please provide or select a valid phone number");
      return;
    }
    setIsSending(true);
    try {
      await onSendWhatsApp(cleanTargetPhone);
      onOpenChange(false);
    } catch {
      toast.error("Failed to initiate WhatsApp share");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border">
        {/* Header with WhatsApp Brand Accent */}
        <DialogHeader className="p-4 bg-emerald-600 text-white flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-full bg-white/20">
              <WhatsAppBrandIcon className="h-5 w-5 fill-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white">
                Share PDF to Registered Mobile
              </DialogTitle>
              <DialogDescription className="text-[11px] text-emerald-100 mt-0.5">
                Targeting verified customer phone number
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs">
          {/* Document Summary Card */}
          <div className="p-3 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground text-xs">{documentTitle}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{documentFilename}</p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-medium">
              Ready to Share
            </Badge>
          </div>

          {/* Customer Details */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Borrower / Customer
            </Label>
            <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-background">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground text-xs">{customerName}</span>
              </div>
              {customerId && (
                <span className="font-mono text-[10px] text-muted-foreground">{customerId}</span>
              )}
            </div>
          </div>

          {/* Registered Phone Selection Options */}
          <div className="space-y-2">
            <Label className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">
              Select WhatsApp Destination Phone Number
            </Label>

            <div className="space-y-1.5">
              {/* Primary Registered Phone */}
              {registeredPhone && (
                <div
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedPhone(registeredPhone);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    !isCustom && selectedPhone === registeredPhone
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground text-xs font-mono">
                          +91 {registeredPhone.replace(/\D/g, "").slice(-10)}
                        </span>
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[9px] px-1.5 py-0">
                          Registered Primary
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Verified on-file mobile number</p>
                    </div>
                  </div>
                  {!isCustom && selectedPhone === registeredPhone && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              )}

              {/* Alternate Phone if available */}
              {altPhone && (
                <div
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedPhone(altPhone);
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    !isCustom && selectedPhone === altPhone
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground text-xs font-mono">
                      +91 {altPhone.replace(/\D/g, "").slice(-10)}
                    </span>
                    <Badge variant="outline" className="text-[9px]">Alternate</Badge>
                  </div>
                  {!isCustom && selectedPhone === altPhone && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              )}

              {/* Guarantor Phone if available */}
              {guarantorPhone && (
                <div
                  onClick={() => {
                    setIsCustom(false);
                    setSelectedPhone(guarantorPhone);
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    !isCustom && selectedPhone === guarantorPhone
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground text-xs font-mono">
                      +91 {guarantorPhone.replace(/\D/g, "").slice(-10)}
                    </span>
                    <Badge variant="outline" className="text-[9px]">Guarantor</Badge>
                  </div>
                  {!isCustom && selectedPhone === guarantorPhone && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              )}

              {/* Custom Number Input */}
              <div
                onClick={() => setIsCustom(true)}
                className={`p-2.5 rounded-lg border transition-all ${
                  isCustom ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground">Or enter different WhatsApp number:</span>
                </div>
                <Input
                  placeholder="e.g. 9876543210"
                  value={customPhone}
                  onChange={(e) => {
                    setIsCustom(true);
                    setCustomPhone(e.target.value);
                  }}
                  onFocus={() => setIsCustom(true)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Desktop User Step Guide */}
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1 text-[11px] text-muted-foreground">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Direct WhatsApp Workflow
            </p>
            <p>1. Clicking below opens the WhatsApp conversation with <strong>+{cleanTargetPhone || "..."}</strong>.</p>
            <p>2. The PDF receipt automatically downloads so you can simply drag &amp; drop it into the chat.</p>
            <p>3. The message also includes a direct verified link for the borrower to view/download online.</p>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {onDownloadPdf && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs cursor-pointer flex-1 sm:flex-none"
                onClick={() => onDownloadPdf()}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Download PDF
              </Button>
            )}
            {onCopyText && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs cursor-pointer flex-1 sm:flex-none"
                onClick={onCopyText}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy Text
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleSend}
            disabled={isSending || !cleanTargetPhone}
            className="h-8 text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 shadow-xs w-full sm:w-auto"
          >
            <WhatsAppBrandIcon className="h-3.5 w-3.5 mr-1.5 fill-white" />
            Send to +{cleanTargetPhone || "Registered Mobile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
