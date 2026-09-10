import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Wallet,
  CreditCard,
  CalendarClock,
  Banknote,
  Receipt,
  MapPin,
  BarChart3,
  FolderLock,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  CircleDollarSign,
  FileCode2,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

interface NavSubItem {
  title: string;
  href: string;
  badge?: string | number | undefined;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | undefined;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | undefined;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | undefined;
  subItems?: NavSubItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AppSidebar({ collapsed, onToggleCollapse, className }: AppSidebarProps) {
  const { customers, loans, emis, today } = useStore();
  const { location } = useRouterState();
  const pathname = location.pathname;
  const searchStr = location.searchStr ?? "";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute live badges
  const overdueLoansCount = loans.filter((l) => l.status === "Overdue").length;
  const dueTodayEmiCount = emis.filter((e) => e.dueDate === today && e.status !== "Paid").length;
  const overdueEmiCount = emis.filter((e) => e.status === "Overdue").length;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    LOANS: true,
    EMI: true,
    "FIELD OPERATIONS": true,
    FINANCE: false,
    REPORTING: false,
    DOCUMENTS: false,
    SYSTEM: false,
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const navGroups: NavGroup[] = [
    {
      label: "WORKSPACE",
      items: [
        {
          title: "Dashboard",
          href: "/",
          icon: LayoutDashboard,
        },
        {
          title: "Customers",
          href: "/customers",
          icon: Users,
          badge: customers.length,
          subItems: [
            { title: "All Customers", href: "/customers" },
            { title: "New Customer", href: "/customers?action=new" },
          ],
        },
      ],
    },
    {
      label: "LOANS",
      items: [
        {
          title: "Loan Hub",
          href: "/loans",
          icon: CreditCard,
          badge: overdueLoansCount > 0 ? overdueLoansCount : undefined,
          badgeVariant: "destructive",
          subItems: [
            { title: "Active Loans", href: "/loans?tab=active" },
            { title: "Overdue Loans", href: "/loans?tab=overdue", badge: overdueLoansCount || undefined, badgeVariant: "destructive" },
            { title: "Closed Loans", href: "/loans?tab=closed" },
            { title: "+ New Loan", href: "/loans/new" },
          ],
        },
      ],
    },
    {
      label: "EMI",
      items: [
        {
          title: "EMI Schedules",
          href: "/emi",
          icon: CalendarClock,
          badge: dueTodayEmiCount > 0 ? dueTodayEmiCount : undefined,
          badgeVariant: "secondary",
          subItems: [
            { title: "Today's Due", href: "/emi?tab=today", badge: dueTodayEmiCount || undefined, badgeVariant: "secondary" },
            { title: "Upcoming", href: "/emi?tab=upcoming" },
            { title: "Pending", href: "/emi?tab=pending" },
            { title: "Overdue", href: "/emi?tab=overdue", badge: overdueEmiCount || undefined, badgeVariant: "destructive" },
          ],
        },
      ],
    },
    {
      label: "FIELD OPERATIONS",
      items: [
        {
          title: "Collection",
          href: "/collection",
          icon: Banknote,
          subItems: [
            { title: "Collect EMI", href: "/collection?tab=collect" },
            { title: "Today's Collection", href: "/collection?tab=today" },
            { title: "Routes", href: "/collection?tab=routes" },
            { title: "Visits", href: "/visits" },
            { title: "Daily Closing", href: "/collection?tab=closing" },
            { title: "Collection History", href: "/receipts" },
          ],
        },
        {
          title: "Visits",
          href: "/visits",
          icon: MapPin,
        },
      ],
    },
    {
      label: "FINANCE",
      items: [
        {
          title: "Receipts",
          href: "/receipts",
          icon: Receipt,
        },
        {
          title: "Accounts & Ledger",
          href: "/accounts",
          icon: Wallet,
          subItems: [
            { title: "Accounts List", href: "/accounts" },
            { title: "Credit Limits", href: "/accounts?tab=limits" },
            { title: "Account Ledger", href: "/accounts?tab=ledger" },
          ],
        },
      ],
    },
    {
      label: "REPORTING",
      items: [
        {
          title: "Reports & Analytics",
          href: "/reports",
          icon: BarChart3,
          subItems: [
            { title: "Collections Report", href: "/reports?tab=collections" },
            { title: "Disbursements", href: "/reports?tab=disbursements" },
            { title: "NPA & Delinquency", href: "/reports?tab=delinquency" },
            { title: "Early Closures", href: "/reports?tab=early_closures" },
          ],
        },
      ],
    },
    {
      label: "DOCUMENTS",
      items: [
        {
          title: "Documents",
          href: "/documents",
          icon: FolderLock,
        },
        {
          title: "HTML Templates",
          href: "/templates",
          icon: FileCode2,
        },
      ],
    },
    {
      label: "SYSTEM",
      items: [
        {
          title: "Settings",
          href: "/settings",
          icon: Settings,
          subItems: [
            { title: "General Settings", href: "/settings" },
            { title: "Users & Roles", href: "/settings?tab=users" },
            { title: "Audit Log", href: "/settings?tab=audit" },
          ],
        },
        {
          title: "Profile",
          href: "/profile",
          icon: User,
        },
      ],
    },
  ];

  const isRouteActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" && !searchStr;
    }
    const [pathPart, queryPart] = href.split("?");
    if (queryPart) {
      return pathname === pathPart && searchStr.includes(queryPart);
    }
    return pathname === pathPart || (pathname.startsWith(pathPart + "/") && pathPart !== "/");
  };

  const isGroupActive = (item: NavItem) => {
    if (isRouteActive(item.href)) return true;
    if (item.subItems?.some((sub) => isRouteActive(sub.href))) return true;
    return false;
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out shrink-0 select-none",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header / Logo */}
      <div className="flex h-16 items-center justify-between px-3.5 border-b border-sidebar-border">
        {!collapsed ? (
          <Link to="/" className="flex items-center gap-2 overflow-hidden group">
            <BrandLogo size="sm" showText={true} showTagline={true} />
          </Link>
        ) : (
          <Link
            to="/"
            className="mx-auto flex items-center justify-center group"
            title="AARIGO CAPITAL — Growing Today, Securing Tomorrow"
          >
            <BrandLogo size="sm" collapsed={true} />
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn(
            "h-8 w-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "hidden"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Nav List */}
      <ScrollArea className="flex-1 py-3 px-2">
        <TooltipProvider delayDuration={150}>
          <div className="space-y-4">
            {navGroups.map((group, groupIdx) => (
              <div key={group.label || groupIdx} className="space-y-1">
                {!collapsed && (
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {group.label}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isGroupActive(item);
                  const hasSub = !collapsed && item.subItems && item.subItems.length > 0;
                  const isExpanded = !!expandedGroups[item.title];

                  if (collapsed) {
                    return (
                      <Tooltip key={item.title}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              "flex h-10 w-10 mx-auto items-center justify-center rounded-lg text-sm font-medium transition-colors",
                              active
                                ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-xs"
                                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="sr-only">{item.title}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          <span>{item.title}</span>
                          {item.badge !== undefined && (
                            <Badge variant={item.badgeVariant ?? "secondary"} className="text-[10px] px-1 h-4">
                              {item.badge}
                            </Badge>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <div key={item.title} className="space-y-0.5">
                      <div className="flex items-center">
                        <Link
                          to={item.href}
                          className={cn(
                            "group flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                            active
                              ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-xs"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                          )}
                        >
                          <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground")} />
                          <span className="truncate flex-1">{item.title}</span>
                          {mounted && item.badge !== undefined && (
                            <Badge
                              variant={item.badgeVariant ?? "secondary"}
                              className="text-[10px] px-1.5 py-0 h-4 font-mono font-medium"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                        {hasSub && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleGroup(item.title);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/70 rounded-md transition-colors mr-0.5"
                            aria-label={`Toggle ${item.title} sub-items`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Sub-items */}
                      {hasSub && isExpanded && (
                        <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-sidebar-border ml-4">
                          {item.subItems!.map((sub) => {
                            const subActive = isRouteActive(sub.href);
                            return (
                              <Link
                                key={sub.title}
                                to={sub.href}
                                className={cn(
                                  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] transition-colors",
                                  subActive
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                                )}
                              >
                                <span className="truncate">{sub.title}</span>
                                {mounted && sub.badge !== undefined && (
                                  <Badge
                                    variant={sub.badgeVariant ?? "outline"}
                                    className="text-[9px] px-1 py-0 h-3.5 font-mono"
                                  >
                                    {sub.badge}
                                  </Badge>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </ScrollArea>

      {/* Footer / Expand button when collapsed */}
      {collapsed && (
        <div className="p-2 border-t border-sidebar-border flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            title="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </aside>
  );
}
