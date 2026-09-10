import { useRouterState, Link } from "@tanstack/react-router";
import {
  Search,
  PanelLeft,
  Calendar,
  ChevronRight,
  CircleDollarSign,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationDropdown } from "./NotificationDropdown";
import { AdminMenu } from "./AdminMenu";

interface AppHeaderProps {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

const ROUTE_INFO: Record<string, { title: string; category: string }> = {
  "/": { title: "Executive Dashboard", category: "Workspace" },
  "/customers": { title: "Customers Directory", category: "Workspace" },
  "/loans": { title: "Loan Portfolio & Hub", category: "Loans" },
  "/loans/new": { title: "Create New Loan", category: "Loans" },
  "/emi": { title: "EMI Schedules & Dues", category: "EMI" },
  "/collection": { title: "Field Collection Operations", category: "Field Operations" },
  "/visits": { title: "Field Visits & Verification", category: "Field Operations" },
  "/receipts": { title: "Receipts & Transactions", category: "Finance" },
  "/accounts": { title: "Customer Accounts & Ledger", category: "Finance" },
  "/reports": { title: "Reports & Financial Analytics", category: "Reporting" },
  "/documents": { title: "Documents Repository", category: "Documents" },
  "/templates": { title: "Print & PDF HTML Templates", category: "Documents" },
  "/settings": { title: "System Rules & Configuration", category: "System" },
  "/profile": { title: "Administrator Profile", category: "System" },
};

export function AppHeader({ onOpenSearch, onToggleSidebar, sidebarCollapsed }: AppHeaderProps) {
  const { today } = useStore();
  const { location } = useRouterState();
  const pathname = location.pathname;

  const currentInfo = ROUTE_INFO[pathname] ?? {
    title: pathname.replace("/", "").charAt(0).toUpperCase() + pathname.slice(2),
    category: "Module",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 backdrop-blur-md px-3 md:px-6">
      {/* Left: Sidebar toggle + Mobile brand / Breadcrumbs */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Desktop sidebar toggle when collapsed */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden md:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Toggle sidebar"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* Mobile Brand */}
        <Link to="/" className="md:hidden flex items-center mr-1">
          <BrandLogo size="sm" showText={true} showTagline={false} />
        </Link>

        {/* Breadcrumbs (Desktop) */}
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors font-medium">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-muted-foreground/80">{currentInfo.category}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
          <span className="font-semibold text-foreground">{currentInfo.title}</span>
        </nav>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xs md:max-w-md mx-2 md:mx-4">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg border border-input bg-muted/40 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate hidden sm:inline">Search customers, loans, account numbers...</span>
            <span className="truncate sm:hidden">Search...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground shadow-2xs">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right: Date, Notifications, Theme, Profile */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Date chip */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs text-muted-foreground font-medium">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>{fmtDate(today)}</span>
        </div>

        {/* Notification Bell */}
        <NotificationDropdown />

        {/* Theme Switcher */}
        <ThemeToggle />

        <div className="h-5 w-[1px] bg-border mx-0.5 hidden sm:block" />

        {/* Admin Profile Dropdown */}
        <AdminMenu />
      </div>
    </header>
  );
}
