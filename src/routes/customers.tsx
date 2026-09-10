import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MapPin,
  CreditCard,
  ArrowRight,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/app-store";
import type { NewCustomerInput } from "@/store/app-store";
import { inr, fmtDate } from "@/lib/format";
import { getCustomerCompliance } from "@/utils/document-compliance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportDropdown } from "@/components/common/ExportDropdown";

export const Route = createFileRoute("/customers")({
  component: CustomersRouteComponent,
});

function CustomersRouteComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChild = pathname !== "/customers" && pathname !== "/customers/";
  if (isChild) {
    return <Outlet />;
  }
  return <CustomersPage />;
}

const defaultForm: NewCustomerInput = {
  name: "",
  guardianName: "",
  mobile: "",
  altMobile: "",
  dob: "",
  gender: "Male",
  occupation: "",
  monthlyIncome: 0,
  address: { house: "", area: "", city: "", district: "", state: "", pin: "", landmark: "" },
  kycType: "Aadhaar",
  kycNumber: "",
  nominee: { name: "", relationship: "", mobile: "", address: "" },
  guarantor: { name: "", relationship: "", mobile: "", address: "" },
  creditLimit: 0,
};

function CustomersPage() {
  const { customers, loans, accounts, emis, documents, addCustomer } = useStore();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState<NewCustomerInput>(defaultForm);
  const [formStep, setFormStep] = useState(1);
  const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
  const [guarantorSameAsNominee, setGuarantorSameAsNominee] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(location.searchStr);
    if (p.get("action") === "new") {
      setShowAddDialog(true);
    }
  }, [location.searchStr]);
interface CustomerFormErrors {
  name?: string;
  mobile?: string;
  gender?: string;
  occupation?: string;
  house?: string;
  area?: string;
  city?: string;
  state?: string;
  pin?: string;
  kycNumber?: string;
  nomineeName?: string;
}

  const [errors, setErrors] = useState<CustomerFormErrors>({});

  const filtered = useMemo(() =>
    customers.filter((c) => {
      const q = query.toLowerCase();
      const acc = accounts.find((a) => a.customerId === c.id);
      const matchesQ =
        (c.name || "").toLowerCase().includes(q) ||
        (c.id || "").toLowerCase().includes(q) ||
        (acc ? (acc.id || "").toLowerCase().includes(q) : false) ||
        (c.mobile || "").includes(q) ||
        (c.address?.city || "").toLowerCase().includes(q) ||
        (c.address?.area || "").toLowerCase().includes(q);
      const matchesStatus = filterStatus === "all" || c.status === filterStatus;
      return matchesQ && matchesStatus;
    }),
    [customers, accounts, query, filterStatus]
  );

  const customersExportData = useMemo(() => {
    const headers = [
      "Customer ID",
      "Full Name",
      "Mobile",
      "Alt Mobile",
      "Status",
      "Occupation",
      "Monthly Income",
      "Area",
      "City",
      "District",
      "State",
      "PIN Code",
      "KYC Type",
      "KYC Number",
      "Credit Limit",
      "Active Loans Count",
      "Overdue EMIs Count",
    ];

    const rows = filtered.map((c) => {
      const activeLoans = loans.filter((l) => l.customerId === c.id && l.status === "Active").length;
      const overdueEmis = emis.filter((e) => e.customerId === c.id && e.status === "Overdue").length;
      return [
        c.id || "",
        c.name || "",
        c.mobile || "",
        c.altMobile || "",
        c.status || "Active",
        c.occupation || "",
        c.monthlyIncome || 0,
        c.address?.area || "",
        c.address?.city || "",
        c.address?.district || "",
        c.address?.state || "",
        c.address?.pin || "",
        c.kycType || "",
        c.kycNumber || "",
        c.creditLimit || 0,
        activeLoans,
        overdueEmis,
      ];
    });

    return { headers, rows };
  }, [filtered, loans, emis]);

  const validateStep1 = () => {
    const e: CustomerFormErrors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) e.mobile = "Valid 10-digit mobile required";
    if (!form.gender) e.gender = "Gender is required";
    if (!form.occupation.trim()) e.occupation = "Occupation is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: CustomerFormErrors = {};
    if (!form.address.house.trim()) e.house = "House/Flat required";
    if (!form.address.area.trim()) e.area = "Area required";
    if (!form.address.city.trim()) e.city = "City required";
    if (!form.address.state.trim()) e.state = "State required";
    if (!form.address.pin.trim() || !/^\d{6}$/.test(form.address.pin)) e.pin = "Valid 6-digit PIN required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: CustomerFormErrors = {};
    if (!form.kycNumber.trim()) e.kycNumber = "KYC number required";
    if (!form.nominee.name.trim()) e.nomineeName = "Nominee name required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (formStep === 1 && validateStep1()) setFormStep(2);
    else if (formStep === 2 && validateStep2()) setFormStep(3);
    else if (formStep === 3 && validateStep3()) setFormStep(4);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const finalForm = {
      ...form,
      guarantor: guarantorSameAsNominee ? { ...form.nominee } : form.guarantor,
    };
    try {
      setIsSubmitting(true);
      const result = await addCustomer(finalForm);
      setNewCustomerId(result.customer.id);
      setFormStep(5); // Success step
      toast.success("Customer added successfully and saved to database!");
    } catch (err: any) {
      console.error("Failed to create customer:", err);
      toast.error(err?.message || "Failed to create customer in database");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setForm(defaultForm);
    setFormStep(1);
    setErrors({});
    setNewCustomerId(null);
    setGuarantorSameAsNominee(true);
  };

  const setField = <K extends keyof NewCustomerInput>(key: K, value: NewCustomerInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Customer Directory</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage borrower profiles, credit limits, KYC records and contact information
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
            {customers.length} Customers
          </Badge>
          <ExportDropdown
            label="Export Customers"
            filename={`customers_${filterStatus.toLowerCase()}`}
            sheetName="Customers"
            headers={customersExportData.headers}
            rows={customersExportData.rows}
          />
          <Button size="sm" className="text-xs h-9 cursor-pointer" onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, Customer ID (CUS-xxx), Account Unique ID (ACC-xxx), mobile or city..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["all", "Active", "Inactive", "Blocked"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
              className="text-xs h-9 flex-1 sm:flex-none capitalize cursor-pointer"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Customer Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={query ? `No customers match "${query}"` : "No customers in this category."}
          action={query ? { label: "Clear Search", onClick: () => setQuery("") } : { label: "Add Customer", onClick: () => setShowAddDialog(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const customerLoans = loans.filter((l) => l.customerId === c.id);
            const activeLoans = customerLoans.filter((l) => l.status === "Active");
            const account = accounts.find((a) => a.customerId === c.id);
            const overdueEmis = emis.filter((e) => e.customerId === c.id && e.status === "Overdue");
            const hasOverdue = overdueEmis.length > 0;
            const compliance = getCustomerCompliance(c, documents, loans);

            return (
              <Card
                key={c.id}
                className="shadow-xs hover:border-primary/40 transition-all cursor-pointer group"
                onClick={() => void navigate({ to: "/customers/$id", params: { id: c.id } })}
              >
                <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs"
                      style={{ backgroundColor: `hsl(${c.photoHue || 120}, 65%, 45%)` }}
                    >
                      {(c.name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {c.name || "Unnamed Customer"}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{c.id}</span>
                        {account && (
                          <span className="text-primary font-semibold">({account.id})</span>
                        )}
                        <span>•</span>
                        <span>{c.occupation || "Employed"}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <StatusBadge status={c.status || "Active"} />
                      {compliance.isCompliant ? (
                        <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                          KYC OK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                          {compliance.missingCount} Missing
                        </Badge>
                      )}
                    </div>
                    {hasOverdue && (
                      <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/30">
                        {overdueEmis.length} Overdue
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Active Loans</span>
                      <span className="font-semibold text-foreground">{activeLoans.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Credit Limit</span>
                      <span className="font-semibold text-foreground">
                        {account ? inr(account.creditLimit) : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-muted-foreground text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{c.mobile || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className='truncate'>{c.address?.area || c.address?.house || ""}{c.address?.city ? `, ${c.address.city}` : ""}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Member since {fmtDate(c.createdAt)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigate({ to: "/customers/$id", params: { id: c.id } });
                      }}
                      className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform hover:underline cursor-pointer"
                    >
                      View Profile <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {formStep === 5 ? "Customer Added!" : `Add New Customer — Step ${formStep} of 4`}
            </DialogTitle>
          </DialogHeader>

          {/* Progress */}
          {formStep < 5 && (
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full ${s <= formStep ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {formStep === 1 && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. Ravi Kumar Sharma"
                    className="mt-1 h-9 text-xs"
                  />
                  {errors.name && <p className="text-destructive text-[10px] mt-0.5">{errors.name}</p>}
                </div>
                <div>
                  <Label className="text-xs">Guardian / S/o / D/o</Label>
                  <Input
                    value={form.guardianName}
                    onChange={(e) => setField("guardianName", e.target.value)}
                    placeholder="Father/Husband name"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mobile Number *</Label>
                  <Input
                    value={form['mobile']}
                    onChange={(e) => setField('mobile', e.target.value)}
                    placeholder='10-digit mobile'
                    className='mt-1 h-9 text-xs'
                    maxLength={10}
                  />
                  {errors['mobile'] && <p className='text-destructive text-[10px] mt-0.5'>{errors['mobile']}</p>}
                </div>
                <div>
                  <Label className="text-xs">Alternate Mobile</Label>
                  <Input
                    value={form['altMobile']}
                    onChange={(e) => setField('altMobile', e.target.value)}
                    placeholder='Optional'
                    className='mt-1 h-9 text-xs'
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label className="text-xs">Date of Birth</Label>
                  <Input
                    type="date"
                    value={form['dob']}
                    onChange={(e) => setField('dob', e.target.value)}
                    className='mt-1 h-9 text-xs'
                  />
                </div>
                <div>
                  <Label className="text-xs">Gender *</Label>
                  <Select value={form['gender']} onValueChange={(v) => setField('gender', v as "Male" | "Female" | "Other")}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Male", "Female", "Other"].map((g) => (
                        <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors['gender'] && <p className="text-destructive text-[10px] mt-0.5">{errors['gender']}</p>}
                </div>
                <div>
                  <Label className="text-xs">Occupation *</Label>
                  <Input
                    value={form['occupation']}
                    onChange={(e) => setField('occupation', e.target.value)}
                    placeholder='e.g. Farmer, Trader, Labourer'
                    className='mt-1 h-9 text-xs'
                  />
                  {errors['occupation'] && <p className="text-destructive text-[10px] mt-0.5">{errors['occupation']}</p>}
                </div>
                <div>
                  <Label className="text-xs">Monthly Income (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form['monthlyIncome'] || ''}
                    onChange={(e) => setField('monthlyIncome', parseFloat(e.target.value) || 0)}
                    placeholder='0'
                    className='mt-1 h-9 text-xs'
                  />
                </div>
                <div>
                  <Label className="text-xs">Credit Limit (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form['creditLimit'] || ''}
                    onChange={(e) => setField('creditLimit', parseFloat(e.target.value) || 0)}
                    placeholder='0'
                    className='mt-1 h-9 text-xs'
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {formStep === 2 && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">House / Flat / Plot *</Label>
                  <Input
                    value={form.address['house']}
                    onChange={(e) => setField('address', { ...form.address, house: e.target.value })}
                    placeholder='e.g. 12A, Near School'
                    className='mt-1 h-9 text-xs'
                  />
                  {errors['house'] && <p className="text-destructive text-[10px] mt-0.5">{errors['house']}</p>}
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Area / Colony *</Label>
                  <Input
                    value={form.address['area']}
                    onChange={(e) => setField('address', { ...form.address, area: e.target.value })}
                    placeholder='e.g. Malviya Nagar'
                    className='mt-1 h-9 text-xs'
                  />
                  {errors['area'] && <p className="text-destructive text-[10px] mt-0.5">{errors['area']}</p>}
                </div>
                <div>
                  <Label className="text-xs">Landmark</Label>
                  <Input
                    value={form.address['landmark']}
                    onChange={(e) => setField("address", { ...form.address, landmark: e.target.value })}
                    placeholder="e.g. Near Temple"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">City *</Label>
                  <Input
                    value={form.address['city']}
                    onChange={(e) => setField('address', { ...form.address, city: e.target.value })}
                    placeholder='e.g. Jaipur'
                    className='mt-1 h-9 text-xs'
                  />
                  {errors['city'] && <p className="text-destructive text-[10px] mt-0.5">{errors['city']}</p>}
                </div>
                <div>
                  <Label className="text-xs">District</Label>
                  <Input
                    value={form.address['district']}
                    onChange={(e) => setField("address", { ...form.address, district: e.target.value })}
                    placeholder="e.g. Jaipur"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">State *</Label>
                  <Input
                    value={form.address['state']}
                    onChange={(e) => setField('address', { ...form.address, state: e.target.value })}
                    placeholder='e.g. Rajasthan'
                    className='mt-1 h-9 text-xs'
                  />
                  {errors['state'] && <p className="text-destructive text-[10px] mt-0.5">{errors['state']}</p>}
                </div>
                <div>
                  <Label className="text-xs">PIN Code *</Label>
                  <Input
                    value={form.address['pin']}
                    onChange={(e) => setField('address', { ...form.address, pin: e.target.value })}
                    placeholder='6-digit PIN'
                    className='mt-1 h-9 text-xs'
                    maxLength={6}
                  />
                  {errors['pin'] && <p className="text-destructive text-[10px] mt-0.5">{errors['pin']}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: KYC & Nominee */}
          {formStep === 3 && (
            <div className="space-y-4 text-xs">
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">KYC Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">KYC Type *</Label>
                    <Select value={form['kycType']} onValueChange={(v) => setField('kycType', v as typeof form.kycType)}>
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Aadhaar", "PAN", "Voter ID", "Driving Licence"].map((k) => (
                          <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">KYC Number *</Label>
                    <Input
                      value={form['kycNumber']}
                      onChange={(e) => setField('kycNumber', e.target.value)}
                      placeholder='Document number'
                      className='mt-1 h-9 text-xs'
                    />
                    {errors['kycNumber'] && <p className="text-destructive text-[10px] mt-0.5">{errors['kycNumber']}</p>}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Nominee Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nominee Name *</Label>
                    <Input
                      value={form.nominee['name']}
                      onChange={(e) => {
                        const updated = { ...form.nominee, name: e.target.value };
                        setField('nominee', updated);
                        if (guarantorSameAsNominee) {
                          setField('guarantor', { ...form.guarantor, name: e.target.value });
                        }
                      }}
                      placeholder='Nominee full name'
                      className='mt-1 h-9 text-xs'
                    />
                    {errors['nomineeName'] && <p className="text-destructive text-[10px] mt-0.5">{errors['nomineeName']}</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      value={form.nominee['relationship']}
                      onChange={(e) => {
                        const updated = { ...form.nominee, relationship: e.target.value };
                        setField('nominee', updated);
                        if (guarantorSameAsNominee) {
                          setField('guarantor', { ...form.guarantor, relationship: e.target.value });
                        }
                      }}
                      placeholder='e.g. Spouse, Brother, Father'
                      className='mt-1 h-9 text-xs'
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nominee Mobile</Label>
                    <Input
                      value={form.nominee['mobile']}
                      onChange={(e) => {
                        const updated = { ...form.nominee, mobile: e.target.value };
                        setField('nominee', updated);
                        if (guarantorSameAsNominee) {
                          setField('guarantor', { ...form.guarantor, mobile: e.target.value });
                        }
                      }}
                      placeholder='10-digit mobile'
                      className='mt-1 h-9 text-xs'
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nominee Address</Label>
                    <Input
                      value={form.nominee['address']}
                      onChange={(e) => {
                        const updated = { ...form.nominee, address: e.target.value };
                        setField('nominee', updated);
                        if (guarantorSameAsNominee) {
                          setField('guarantor', { ...form.guarantor, address: e.target.value });
                        }
                      }}
                      placeholder='Residence address (or same as borrower)'
                      className='mt-1 h-9 text-xs'
                    />
                  </div>
                </div>
              </div>

              {/* Guarantor Details */}
              <div className="pt-2 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="guarantorSameAsNominee" className="text-xs font-semibold cursor-pointer">
                      Guarantor is same as Nominee
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Nominee will automatically act as the legal guarantor for the borrower
                    </p>
                  </div>
                  <Switch
                    id="guarantorSameAsNominee"
                    checked={guarantorSameAsNominee}
                    onCheckedChange={(checked) => {
                      setGuarantorSameAsNominee(checked);
                      if (checked) {
                        setField('guarantor', { ...form.nominee });
                      }
                    }}
                  />
                </div>

                {!guarantorSameAsNominee && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-foreground">Separate Guarantor Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Guarantor Name</Label>
                        <Input
                          value={form.guarantor['name']}
                          onChange={(e) => setField('guarantor', { ...form.guarantor, name: e.target.value })}
                          placeholder='Guarantor full name'
                          className='mt-1 h-9 text-xs'
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Relationship</Label>
                        <Input
                          value={form.guarantor['relationship']}
                          onChange={(e) => setField('guarantor', { ...form.guarantor, relationship: e.target.value })}
                          placeholder='e.g. Neighbour, Friend, Relative'
                          className='mt-1 h-9 text-xs'
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Guarantor Mobile</Label>
                        <Input
                          value={form.guarantor['mobile']}
                          onChange={(e) => setField('guarantor', { ...form.guarantor, mobile: e.target.value })}
                          placeholder='10-digit mobile'
                          className='mt-1 h-9 text-xs'
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Guarantor Address</Label>
                        <Input
                          value={form.guarantor['address']}
                          onChange={(e) => setField('guarantor', { ...form.guarantor, address: e.target.value })}
                          placeholder='Guarantor residence address'
                          className='mt-1 h-9 text-xs'
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {formStep === 4 && (
            <div className="space-y-3 text-xs">
              <p className="text-xs font-semibold text-foreground">Please confirm the customer details:</p>
              <div className="rounded-lg border border-border p-3.5 space-y-2">
                {[
                  {label: 'Name', value: form['name']},
                  {label: 'Mobile', value: form['mobile']},
                  {label: 'Occupation', value: form['occupation']},
                  {label: 'Address', value: `${form.address['area']}, ${form.address['city']}, ${form.address['state']} — ${form.address['pin']}`},
                  {label: 'KYC', value: `${form['kycType']}: ${form['kycNumber']}`},
                  {label: 'Nominee', value: `${form.nominee['name'] || "—"} (${form.nominee['relationship'] || "Nominee"})`},
                  {label: 'Guarantor', value: guarantorSameAsNominee ? `${form.nominee['name'] || "—"} (Same as Nominee)` : `${form.guarantor['name'] || "—"} (${form.guarantor['relationship'] || "Guarantor"})`},
                  {label: 'Credit Limit', value: inr(form['creditLimit'])},
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className='text-muted-foreground'>{label}:</span>
                    <span className="font-medium text-foreground text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Step */}
          {formStep === 5 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{form.name} added successfully!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Customer ID: <span className="font-mono font-bold text-foreground">{newCustomerId}</span></p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  className="text-xs cursor-pointer"
                  onClick={() => {
                    handleCloseDialog();
                    if (newCustomerId) void navigate({ to: "/customers/$id", params: { id: newCustomerId } });
                  }}
                >
                  View Profile
                </Button>
                <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={handleCloseDialog}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {formStep < 5 && (
            <div className="flex gap-2 pt-2">
              {formStep > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs cursor-pointer"
                  onClick={() => setFormStep((s) => s - 1)}
                >
                  Back
                </Button>
              )}
              <Button
                size="sm"
                className="text-xs flex-1 cursor-pointer"
                disabled={isSubmitting}
                onClick={formStep === 4 ? handleSubmit : handleNext}
              >
                {formStep === 4 ? (isSubmitting ? "Saving to Database..." : "Confirm & Add Customer") : "Next"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
