import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  User,
  Shield,
  Mail,
  Phone,
  Save,
  LogOut,
  Copy,
  Check,
  Building,
  Briefcase,
  Key,
  RefreshCw,
  Lock,
  Calendar,
  MapPin,
  FileBadge,
  Sparkles,
  Fingerprint,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { admin, updateAdmin, logout } = useStore();

  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Profile Form state
  const [form, setForm] = useState({
    accountUniqueId: admin.accountUniqueId || "ARG-ACC-88204",
    employeeCode: admin.employeeCode || "EMP-001",
    name: admin.name,
    email: admin.email,
    mobile: admin.mobile,
    altPhone: admin.altPhone || "9848099887",
    role: admin.role,
    designation: admin.designation || "Managing Director & Principal Officer",
    department: admin.department || "Executive & Risk Management",
    branch: admin.branch || "Kadapa Main Branch",
    joinedDate: admin.joinedDate || "2022-04-01",
    address: admin.address || "12-4-88, Market Road, Kadapa, Andhra Pradesh 516001",
  });

  // Security Form state
  const [securityForm, setSecurityForm] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
  });

  const handleCopyId = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(form.accountUniqueId);
      setCopiedId(true);
      toast.success(`Account Unique ID copied: ${form.accountUniqueId}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleGenerateNewId = () => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const newUniqueId = `ARG-ACC-${randomSuffix}`;
    setForm((prev) => ({ ...prev, accountUniqueId: newUniqueId }));
    toast.info(`New Account Unique ID generated: ${newUniqueId}`);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }
    if (!form.accountUniqueId.trim()) {
      toast.error("Account Unique ID cannot be empty");
      return;
    }

    updateAdmin(form);
    toast.success("Profile and Account details saved successfully");
  };

  const handleUpdateSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityForm.currentPin) {
      toast.error("Please enter your current PIN");
      return;
    }
    if (securityForm.newPin.length < 4) {
      toast.error("New PIN must be at least 4 digits");
      return;
    }
    if (securityForm.newPin !== securityForm.confirmPin) {
      toast.error("New PIN and Confirm PIN do not match");
      return;
    }

    setSecurityForm({ currentPin: "", newPin: "", confirmPin: "" });
    toast.success("Security PIN updated successfully! Next login requires new PIN.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Administrator Profile & Account
            </h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold">
              Institutional Admin
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage your personal identity, Account Unique ID Number, branch assignments, and security credentials
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer h-9"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Hero Account Overview & Unique ID Card */}
      <Card className="border-border bg-gradient-to-r from-card via-card to-primary/5 shadow-xs overflow-hidden">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-primary/20 shadow-sm ring-4 ring-primary/5">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl md:text-2xl">
                  {initials(form.name || admin.name)}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-foreground">{form.name}</h2>
                  <Badge variant="default" className="text-[10px] font-semibold uppercase tracking-wider">
                    {form.role}
                  </Badge>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {form.designation} • {form.department}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3 text-muted-foreground" />
                    {form.branch}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <FileBadge className="h-3 w-3 text-muted-foreground" />
                    {form.employeeCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Unique ID Highlight Box */}
            <div className="bg-background/80 border border-primary/20 rounded-lg p-3.5 md:p-4 min-w-[280px] shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Fingerprint className="h-3.5 w-3.5 text-primary" />
                  Account Unique ID Number
                </span>
                <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4 border-primary/30 text-primary">
                  PRIMARY
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-2 bg-card border border-border px-3 py-2 rounded-md font-mono">
                <span className="text-base md:text-lg font-bold text-primary tracking-wide">
                  {form.accountUniqueId}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyId}
                  className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                  title="Copy Account Unique ID"
                >
                  {copiedId ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                <span>Authorized Institutional Account</span>
                <button
                  type="button"
                  onClick={handleGenerateNewId}
                  className="text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border">
          <TabsTrigger value="general" className="text-xs flex items-center gap-1.5 cursor-pointer">
            <User className="h-3.5 w-3.5" />
            General Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs flex items-center gap-1.5 cursor-pointer">
            <Fingerprint className="h-3.5 w-3.5" />
            Account & Unique ID
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs flex items-center gap-1.5 cursor-pointer">
            <Lock className="h-3.5 w-3.5" />
            Security & PIN
          </TabsTrigger>
          <TabsTrigger value="permissions" className="text-xs flex items-center gap-1.5 cursor-pointer">
            <Shield className="h-3.5 w-3.5" />
            Access Matrix
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: GENERAL PROFILE EDIT */}
        <TabsContent value="general" className="space-y-4 m-0">
          <form onSubmit={handleSaveProfile}>
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 md:p-5 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">Personal & Official Contact Details</CardTitle>
                <CardDescription className="text-xs">
                  Update your contact details, designation, and branch allocations
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 md:p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs">Full Legal Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="e.g. Vikram Sharma"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs">Work Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="admin@aarigocapital.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Primary Mobile */}
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile" className="text-xs">Primary Mobile Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="mobile"
                        value={form.mobile}
                        onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                        className="pl-9 text-xs h-9 font-mono"
                        placeholder="e.g. 9848012345"
                        required
                      />
                    </div>
                  </div>

                  {/* Alternate Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="altPhone" className="text-xs">Alternate / Emergency Contact</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="altPhone"
                        value={form.altPhone}
                        onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                        className="pl-9 text-xs h-9 font-mono"
                        placeholder="e.g. 9848099887"
                      />
                    </div>
                  </div>

                  {/* Designation */}
                  <div className="space-y-1.5">
                    <Label htmlFor="designation" className="text-xs">Official Designation</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="designation"
                        value={form.designation}
                        onChange={(e) => setForm({ ...form, designation: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="e.g. Managing Director & Principal Officer"
                      />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-xs">Department</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="department"
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="e.g. Executive & Risk Management"
                      />
                    </div>
                  </div>

                  {/* Base Branch */}
                  <div className="space-y-1.5">
                    <Label htmlFor="branch" className="text-xs">Assigned Branch</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="branch"
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="e.g. Kadapa Main Branch"
                      />
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="joinedDate" className="text-xs">Appointment / Joined Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="joinedDate"
                        type="date"
                        value={form.joinedDate}
                        onChange={(e) => setForm({ ...form, joinedDate: e.target.value })}
                        className="pl-9 text-xs h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Physical Address */}
                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="address" className="text-xs">Office / Residential Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="pl-9 text-xs h-9"
                      placeholder="e.g. 12-4-88, Market Road, Kadapa, Andhra Pradesh"
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 md:p-5 border-t border-border/60 flex justify-end gap-3">
                <Button type="submit" size="sm" className="text-xs cursor-pointer">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Profile Changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* TAB 2: ACCOUNT & UNIQUE ID */}
        <TabsContent value="account" className="space-y-4 m-0">
          <form onSubmit={handleSaveProfile}>
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 md:p-5 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">Account Unique ID & System Identifiers</CardTitle>
                <CardDescription className="text-xs">
                  Your Account Unique ID number is the definitive system identifier used for transaction signing, receipt authorization, and audit logs.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 md:p-5 space-y-4 text-xs">
                {/* Account Unique ID field with generator */}
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label htmlFor="accountUniqueId" className="text-xs font-bold text-foreground">
                        Account Unique ID Number *
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Standard format: <code className="font-mono text-primary font-bold">ARG-ACC-XXXXX</code>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateNewId}
                      className="text-xs h-8 cursor-pointer bg-background hover:bg-muted"
                    >
                      <RefreshCw className="h-3 w-3 mr-1 text-primary" />
                      Generate New Unique ID
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Fingerprint className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                      <Input
                        id="accountUniqueId"
                        value={form.accountUniqueId}
                        onChange={(e) => setForm({ ...form, accountUniqueId: e.target.value.toUpperCase() })}
                        className="pl-9 text-sm h-10 font-mono font-bold tracking-wider text-primary bg-background"
                        placeholder="ARG-ACC-88204"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyId}
                      className="h-10 px-3 cursor-pointer text-xs"
                    >
                      {copiedId ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      <span className="ml-1.5 hidden sm:inline">Copy</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Employee Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="employeeCode" className="text-xs">Employee ID / Staff Code</Label>
                    <div className="relative">
                      <FileBadge className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="employeeCode"
                        value={form.employeeCode}
                        onChange={(e) => setForm({ ...form, employeeCode: e.target.value.toUpperCase() })}
                        className="pl-9 text-xs h-9 font-mono"
                        placeholder="EMP-001"
                      />
                    </div>
                  </div>

                  {/* System Role */}
                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-xs">Assigned System Role</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="role"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="Owner"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="p-3 bg-muted/40 rounded-md border border-border/60 text-[11px] text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Account Authorization Level:</span>
                    <span className="font-semibold text-foreground">Tier 1 Super Administrator (Full Control)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audit Trail Signer Key:</span>
                    <span className="font-mono text-foreground font-medium">{form.accountUniqueId}-PUB-2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Verification Status:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Institutional Verified</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 md:p-5 border-t border-border/60 flex justify-end">
                <Button type="submit" size="sm" className="text-xs cursor-pointer">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Account Identifiers
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* TAB 3: SECURITY & PIN */}
        <TabsContent value="security" className="space-y-4 m-0">
          <form onSubmit={handleUpdateSecurity}>
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 md:p-5 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">Security Credentials & Access PIN</CardTitle>
                <CardDescription className="text-xs">
                  Change your administrator passcode or PIN used for system approvals and day closing
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 md:p-5 space-y-4 text-xs">
                <div className="max-w-md space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPin" className="text-xs">Current Access PIN / Password *</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="currentPin"
                        type="password"
                        value={securityForm.currentPin}
                        onChange={(e) => setSecurityForm({ ...securityForm, currentPin: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newPin" className="text-xs">New Access PIN / Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPin"
                        type="password"
                        value={securityForm.newPin}
                        onChange={(e) => setSecurityForm({ ...securityForm, newPin: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="Minimum 4 characters"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPin" className="text-xs">Confirm New PIN *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPin"
                        type="password"
                        value={securityForm.confirmPin}
                        onChange={(e) => setSecurityForm({ ...securityForm, confirmPin: e.target.value })}
                        className="pl-9 text-xs h-9"
                        placeholder="Re-enter new PIN"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 border border-border/60 rounded-md text-[11px] space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Two-Factor Authentication (2FA)</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                      Enabled & Enforced
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    All financial reversals, early loan foreclosures, and day closures require 2FA verification.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="p-4 md:p-5 border-t border-border/60 flex justify-end">
                <Button type="submit" size="sm" className="text-xs cursor-pointer">
                  <Key className="h-3.5 w-3.5 mr-1.5" />
                  Update Access Credentials
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* TAB 4: ACCESS MATRIX */}
        <TabsContent value="permissions" className="space-y-4 m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 md:p-5 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Institutional Authorization Scope</CardTitle>
                  <CardDescription className="text-xs">
                    Assigned operational permissions linked to Account Unique ID: <span className="font-mono font-bold text-primary">{form.accountUniqueId}</span>
                  </CardDescription>
                </div>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                  SUPER ADMIN
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Loan Origination & Disbursement", desc: "Create, approve and disburse loans with no ceiling limit", ok: true },
                  { title: "EMI Collection & WhatsApp Sharing", desc: "Collect payments, generate receipts, trigger automated WhatsApp PDFs", ok: true },
                  { title: "Payment Reversal & Charge Correction", desc: "Authorized to reverse erroneous payments and recalculate balances", ok: true },
                  { title: "Early Loan Foreclosure (Settlement)", desc: "Foreclose active loans, waive future interest, apply early closure charges", ok: true },
                  { title: "Field Operations & Route Planning", desc: "Assign collection routes, record geo-verified visits and customer PTPs", ok: true },
                  { title: "Daily Cash Closing & Day Reconciliation", desc: "Submit, verify and lock daily physical cash closures against ledger", ok: true },
                  { title: "Borrower KYC & Document Compliance", desc: "Verify, reject, or archive Aadhaar/PAN/KYC documents and photos", ok: true },
                  { title: "Executive Analytics & Ledger Export", desc: "Export Excel spreadsheets, CSV data snapshots and accounting audits", ok: true },
                ].map((perm) => (
                  <div key={perm.title} className="p-3 rounded-lg border border-border/70 bg-card flex items-start gap-3">
                    <div className="p-1 rounded-full bg-emerald-500/15 text-emerald-600 shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-xs">{perm.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{perm.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
