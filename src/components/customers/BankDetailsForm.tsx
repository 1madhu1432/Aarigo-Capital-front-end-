import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Eye, EyeOff, CheckCircle2, ShieldAlert, Plus, CreditCard, Lock } from "lucide-react";
import { useStore } from "@/store/app-store";
import { fmtDate } from "@/lib/format";
import type { BankDetail } from "@/types";

interface BankDetailsFormProps {
  customerId: string;
}

export function BankDetailsForm({ customerId }: BankDetailsFormProps) {
  const { bankDetails, addBankDetail, verifyBankDetail } = useStore();

  const [isAdding, setIsAdding] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [branch, setBranch] = useState("");
  const [accountType, setAccountType] = useState<BankDetail["accountType"]>("Savings");
  const [upiId, setUpiId] = useState("");

  // Control reveal of masked accounts
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const customerBankAccounts = useMemo(() => {
    return bankDetails.filter((b) => b.customerId === customerId);
  }, [bankDetails, customerId]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();

    if (!holderName.trim() || !bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      toast.error("Please fill in all required bank fields.");
      return;
    }

    if (accountNumber.trim() !== confirmAccount.trim()) {
      toast.error("Account Number and Confirm Account Number do not match.");
      return;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/i;
    if (!ifscRegex.test(ifsc.trim())) {
      toast.error("Invalid IFSC code format (e.g., HDFC0001234).");
      return;
    }

    addBankDetail({
      customerId,
      holderName: holderName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      branch: branch.trim() || undefined,
      accountType,
      upiId: upiId.trim() || undefined,
    });

    toast.success("Bank account added successfully!");
    setHolderName("");
    setBankName("");
    setAccountNumber("");
    setConfirmAccount("");
    setIfsc("");
    setBranch("");
    setUpiId("");
    setIsAdding(false);
  };

  const maskAccount = (accNo: string) => {
    if (!accNo || accNo.length < 4) return "****";
    const last4 = accNo.slice(-4);
    return `XXXXXX${last4}`;
  };

  return (
    <Card className="border border-border/80 bg-card">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-bold">Bank Account & Settlement Details</CardTitle>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAdding(!isAdding)}
          className="h-8 text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Bank Account
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Form to Add New Bank Details */}
        {isAdding && (
          <form onSubmit={handleSaveBank} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <span className="font-bold text-xs">New Bank Account Details</span>
              <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="holderName" className="text-[11px]">Account Holder Name *</Label>
                <Input
                  id="holderName"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bankName" className="text-[11px]">Bank Name *</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank / SBI"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="accountNumber" className="text-[11px]">Account Number *</Label>
                <Input
                  id="accountNumber"
                  type="password"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter Account Number"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmAccount" className="text-[11px]">Confirm Account Number *</Label>
                <Input
                  id="confirmAccount"
                  type="text"
                  value={confirmAccount}
                  onChange={(e) => setConfirmAccount(e.target.value)}
                  placeholder="Re-enter Account Number"
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ifsc" className="text-[11px]">IFSC Code *</Label>
                <Input
                  id="ifsc"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="h-8 text-xs font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="branch" className="text-[11px]">Branch Name (Optional)</Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g. MG Road Branch"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="accountType" className="text-[11px]">Account Type</Label>
                <Select value={accountType} onValueChange={(v) => setAccountType(v as BankDetail["accountType"])}>
                  <SelectTrigger id="accountType" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Savings">Savings Account</SelectItem>
                    <SelectItem value="Current">Current Account</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="upiId" className="text-[11px]">UPI ID (Optional)</Label>
                <Input
                  id="upiId"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. ramesh@okicici"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                Save Bank Details
              </Button>
            </div>
          </form>
        )}

        {/* Existing Accounts List */}
        {customerBankAccounts.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground space-y-1 border border-dashed border-border rounded-xl">
            <Building2 className="h-6 w-6 mx-auto opacity-40" />
            <p className="text-xs">No bank details added yet for this customer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customerBankAccounts.map((b) => (
              <div key={b.id} className="p-3.5 rounded-xl border border-border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                  <span className="font-bold text-xs text-foreground">{b.bankName}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      b.verified
                        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                    }`}
                  >
                    {b.verified ? "Verified" : "Not Verified"}
                  </Badge>
                </div>

                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Holder Name</span>
                    <span className="font-semibold font-sans">{b.holderName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-sans text-[11px]">Account No</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">
                        {revealedIds[b.id] ? b.accountNumber : maskAccount(b.accountNumber)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-muted-foreground cursor-pointer"
                        onClick={() => toggleReveal(b.id)}
                        title={revealedIds[b.id] ? "Mask details" : "Reveal details"}
                      >
                        {revealedIds[b.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">IFSC Code</span>
                    <span className="font-bold">{b.ifsc}</span>
                  </div>

                  {b.upiId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans text-[11px]">UPI ID</span>
                      <span>{b.upiId}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Type: {b.accountType}</span>
                  {!b.verified && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] text-emerald-700 border-emerald-500/40 hover:bg-emerald-500/10 cursor-pointer"
                      onClick={() => {
                        verifyBankDetail(b.id, "Verified by Admin");
                        toast.success("Bank details marked as verified!");
                      }}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Mark Verified
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
