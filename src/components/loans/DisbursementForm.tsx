import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, FileText, CheckCircle2, AlertCircle, Clock, Upload, ArrowRight, ShieldCheck, Download } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate } from "@/lib/format";
import type { Loan, Customer, DisbursementRecord, BankDetail } from "@/types";

interface DisbursementFormProps {
  loan: Loan;
  customer?: Customer;
  bankDetails?: BankDetail[];
  onSuccess?: () => void;
}

export function DisbursementForm({ loan, customer, bankDetails, onSuccess }: DisbursementFormProps) {
  const { disbursements, recordDisbursement, updateDisbursementStatus, addDocumentFull } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [method, setMethod] = useState<DisbursementRecord["method"]>("Bank Transfer");
  const [disbursementAmount, setDisbursementAmount] = useState<string>(String(loan.principal));
  const [utr, setUtr] = useState<string>(loan.bankTransactionId || "");
  const [bankName, setBankName] = useState<string>("");
  const [accountHolder, setAccountHolder] = useState<string>(customer?.name || "");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifsc, setIfsc] = useState<string>("");
  const [status, setStatus] = useState<DisbursementRecord["status"]>("Successful");
  const [notes, setNotes] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loanDisbursements = disbursements.filter((d) => d.loanId === loan.id);
  const currentDisbursement = loan.disbursement || loanDisbursements[0];

  const handleSelectBank = (bankId: string) => {
    const b = bankDetails?.find((x) => x.id === bankId);
    if (b) {
      setBankName(b.bankName);
      setAccountHolder(b.holderName);
      setAccountNumber(b.accountNumber);
      setIfsc(b.ifsc);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amt = parseFloat(disbursementAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Invalid disbursement amount.");
      return;
    }

    if ((method === "Bank Transfer" || method === "UPI") && !utr.trim()) {
      toast.error("UTR / Transaction Reference number is required for digital transfers.");
      return;
    }

    let proofDocId: string | undefined;
    let proofFileName: string | undefined;

    if (proofFile) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const fileData = evt.target?.result as string;
        const doc = addDocumentFull({
          customerId: loan.customerId,
          loanId: loan.id,
          category: "LOAN_DOCUMENTS",
          type: "Disbursement Proof",
          name: `Disbursement Receipt - ${loan.id}`,
          fileName: proofFile.name,
          sizeKb: Math.round(proofFile.size / 1024),
          fileData,
          verificationStatus: "Verified",
        });

        proofDocId = doc.id;
        proofFileName = doc.fileName;

        saveRecord(amt, proofDocId, proofFileName);
      };
      reader.readAsDataURL(proofFile);
    } else {
      saveRecord(amt, undefined, undefined);
    }
  };

  const saveRecord = (amt: number, docId?: string, docName?: string) => {
    const maskedAcc = accountNumber ? `XXXXXX${accountNumber.slice(-4)}` : undefined;

    recordDisbursement({
      loanId: loan.id,
      customerId: loan.customerId,
      approvedAmount: loan.principal,
      disbursementAmount: amt,
      method,
      date: new Date().toISOString().slice(0, 10),
      bankName: bankName.trim() || undefined,
      accountHolder: accountHolder.trim() || undefined,
      maskedAccount: maskedAcc,
      ifsc: ifsc.trim().toUpperCase() || undefined,
      utr: utr.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      proofDocumentId: docId,
      proofFileName: docName,
    });

    toast.success(`Disbursement of ${inr(amt)} recorded successfully!`);
    setIsOpen(false);
    if (onSuccess) onSuccess();
  };

  return (
    <Card className="border border-border/80 bg-card">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-bold">Loan Disbursement & Transfer Proof</CardTitle>
        </div>
        <Button
          size="sm"
          onClick={() => setIsOpen(true)}
          className="h-8 text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Record Disbursement
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Current Disbursement Details Card */}
        {currentDisbursement ? (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-xs text-foreground">Active Disbursement Record</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  currentDisbursement.status === "Successful"
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                    : currentDisbursement.status === "Pending"
                    ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-700 border-rose-500/30"
                }`}
              >
                {currentDisbursement.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans">Approved Amount</span>
                <span className="font-bold text-foreground">{inr(currentDisbursement.approvedAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans">Disbursed Amount</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{inr(currentDisbursement.disbursementAmount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans">Method</span>
                <span className="font-semibold font-sans">{currentDisbursement.method}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans">Disbursement Date</span>
                <span className="font-semibold font-sans">{fmtDate(currentDisbursement.date)}</span>
              </div>
              {currentDisbursement.bankName && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">Bank Name</span>
                  <span className="font-semibold font-sans">{currentDisbursement.bankName}</span>
                </div>
              )}
              {currentDisbursement.maskedAccount && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-sans">Account No</span>
                  <span className="font-bold">{currentDisbursement.maskedAccount}</span>
                </div>
              )}
              {currentDisbursement.utr && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[10px] font-sans">UTR / Tx Reference</span>
                  <span className="font-bold text-primary">{currentDisbursement.utr}</span>
                </div>
              )}
            </div>

            {currentDisbursement.proofFileName && (
              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-sans">Transfer Proof: {currentDisbursement.proofFileName}</span>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  Proof Attached
                </Badge>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground space-y-1 border border-dashed border-border rounded-xl">
            <Send className="h-6 w-6 mx-auto opacity-40" />
            <p className="text-xs">No disbursement recorded yet for this loan.</p>
          </div>
        )}

        {/* Form Modal */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Record Loan Disbursement</DialogTitle>
              <p className="text-xs text-muted-foreground">Loan ID: {loan.id} • Customer: {customer?.name}</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Disbursement Method</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as DisbursementRecord["method"])}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI Transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Disbursed Amount</Label>
                  <Input
                    type="number"
                    value={disbursementAmount}
                    onChange={(e) => setDisbursementAmount(e.target.value)}
                    className="h-8 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Select Saved Bank Account if available */}
              {bankDetails && bankDetails.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px]">Autofill Saved Customer Bank Account</Label>
                  <Select onValueChange={handleSelectBank}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankDetails.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.bankName} - XXXXXX{b.accountNumber.slice(-4)} ({b.holderName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Bank Name</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Account Holder</Label>
                  <Input
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Account Number</Label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter Account No"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">UTR / Transaction Ref *</Label>
                  <Input
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. UTR987654321"
                    className="h-8 text-xs font-mono"
                    required={method === "Bank Transfer" || method === "UPI"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Transfer Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as DisbursementRecord["status"])}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Successful">Successful</SelectItem>
                      <SelectItem value="Pending">Pending Confirmation</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px]">Upload Transfer Proof</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs w-full cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {proofFile ? proofFile.name.slice(0, 15) : "Select Proof File"}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px]">Disbursement Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Net principal transferred via IMPS"
                  className="h-8 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold">
                  Confirm Disbursement
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
