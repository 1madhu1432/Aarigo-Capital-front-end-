import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  User,
  CreditCard,
  Banknote,
  Calendar,
  Receipt,
  MapPin,
  Settings,
  FileText,
  BarChart3,
  UserPlus,
  PlusCircle,
  Clock,
  Layers,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr } from "@/lib/format";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const { customers, loans } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const select = (path: string) => {
    onOpenChange(false);
    void navigate({ to: path });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search customers, loans, account numbers, or jump to page..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => select("/collection")} className="cursor-pointer">
            <Banknote className="mr-2 h-4 w-4 text-emerald-600" />
            <span>Collect EMI Payment</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/customers")} className="cursor-pointer">
            <UserPlus className="mr-2 h-4 w-4 text-primary" />
            <span>Add New Customer</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/loans")} className="cursor-pointer">
            <PlusCircle className="mr-2 h-4 w-4 text-primary" />
            <span>Create New Loan</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/emi")} className="cursor-pointer">
            <Clock className="mr-2 h-4 w-4 text-amber-500" />
            <span>View Today's Due EMIs</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Customers">
          {customers.slice(0, 10).map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.id} ${c.name} ${c.mobile} ${c.address.city}`}
              onSelect={() => select("/customers")}
              className="cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground font-mono">({c.id})</span>
              </div>
              <span className="text-xs text-muted-foreground">{c.mobile}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Loans">
          {loans.slice(0, 8).map((l) => {
            const customer = customers.find((c) => c.id === l.customerId);
            return (
              <CommandItem
                key={l.id}
                value={`${l.id} ${customer?.name ?? ""} ${l.principal}`}
                onSelect={() => select("/loans")}
                className="cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-medium">{l.id}</span>
                  <span className="text-xs text-muted-foreground">— {customer?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{inr(l.principal)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    l.status === "Active" ? "bg-emerald-500/10 text-emerald-600" :
                    l.status === "Overdue" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {l.status}
                  </span>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => select("/")} className="cursor-pointer">
            <Layers className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/customers")} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Customers</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/accounts")} className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Accounts & Credit Limits</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/loans")} className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Loans</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/emi")} className="cursor-pointer">
            <Calendar className="mr-2 h-4 w-4" />
            <span>EMI Schedules</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/collection")} className="cursor-pointer">
            <Banknote className="mr-2 h-4 w-4" />
            <span>Field Collection</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/receipts")} className="cursor-pointer">
            <Receipt className="mr-2 h-4 w-4" />
            <span>Receipts</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/visits")} className="cursor-pointer">
            <MapPin className="mr-2 h-4 w-4" />
            <span>Field Visits</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/reports")} className="cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Reports & Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/documents")} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            <span>Documents Repository</span>
          </CommandItem>
          <CommandItem onSelect={() => select("/settings")} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
