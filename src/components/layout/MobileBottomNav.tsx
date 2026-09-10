import { useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Banknote,
  CalendarClock,
  MoreHorizontal,
  Wallet,
  CreditCard,
  Receipt,
  MapPin,
  BarChart3,
  FolderLock,
  Settings,
  User,
  LogOut,
  Shield,
  CircleDollarSign,
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { useTheme } from "@/lib/theme";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileBottomNav() {
  const { emis, today, admin, logout } = useStore();
  const { appearance, setAppearance } = useTheme();
  const { location } = useRouterState();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const dueTodayEmiCount = emis.filter((e) => e.dueDate === today && e.status !== "Paid").length;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const moreNav = [
    { title: "Accounts & Credit Limits", href: "/accounts", icon: Wallet, desc: "Limits and ledgers" },
    { title: "Loans", href: "/loans", icon: CreditCard, desc: "Active & overdue loans" },
    { title: "Receipts", href: "/receipts", icon: Receipt, desc: "Issued payment receipts" },
    { title: "Field Visits", href: "/visits", icon: MapPin, desc: "Daily field collection visits" },
    { title: "Reports & Analytics", href: "/reports", icon: BarChart3, desc: "Collection summaries & NPA" },
    { title: "Documents Repository", href: "/documents", icon: FolderLock, desc: "KYC & loan files" },
    { title: "Settings", href: "/settings", icon: Settings, desc: "Interest, business & receipts" },
    { title: "Profile", href: "/profile", icon: User, desc: "Admin user account" },
  ];

  const handleNavigate = (to: string) => {
    setSheetOpen(false);
    void navigate({ to });
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border shadow-lg px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {/* 1. Home */}
          <Link
            to="/"
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 text-[11px] transition-colors",
              isActive("/") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutDashboard className="h-5 w-5 mb-0.5" />
            <span>Home</span>
          </Link>

          {/* 2. Customers */}
          <Link
            to="/customers"
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 text-[11px] transition-colors",
              isActive("/customers") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-5 w-5 mb-0.5" />
            <span>Customers</span>
          </Link>

          {/* 3. Collect — Primary Action Button */}
          <Link
            to="/collection"
            className="flex flex-col items-center justify-center flex-1 py-1 group"
          >
            <div className={cn(
              "flex items-center justify-center h-12 w-12 rounded-full shadow-md -translate-y-3 transition-transform active:scale-95",
              isActive("/collection")
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}>
              <Banknote className="h-6 w-6" />
            </div>
            <span className={cn(
              "text-[11px] -mt-2 font-semibold",
              isActive("/collection") ? "text-primary" : "text-muted-foreground"
            )}>
              Collect
            </span>
          </Link>

          {/* 4. EMI */}
          <Link
            to="/emi"
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 py-1 text-[11px] transition-colors",
              isActive("/emi") ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <CalendarClock className="h-5 w-5 mb-0.5" />
              {dueTodayEmiCount > 0 && (
                <span className="absolute -top-1 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {dueTodayEmiCount}
                </span>
              )}
            </div>
            <span>EMI</span>
          </Link>

          {/* 5. More */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center justify-center flex-1 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <MoreHorizontal className="h-5 w-5 mb-0.5" />
                <span>More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-0 flex flex-col">
              <SheetHeader className="px-5 pt-4 pb-2 border-b border-border text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {initials(admin.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-sm font-semibold">{admin.name}</SheetTitle>
                      <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3 text-primary" /> {admin.role} • {admin.email}
                      </SheetDescription>
                    </div>
                  </div>

                  {/* Quick theme cycle */}
                  <div className="flex items-center bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => setAppearance("light")}
                      className={cn("p-1.5 rounded-md text-xs", appearance === "light" && "bg-background text-foreground shadow-xs")}
                      title="Light"
                    >
                      <Sun className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setAppearance("dark")}
                      className={cn("p-1.5 rounded-md text-xs", appearance === "dark" && "bg-background text-foreground shadow-xs")}
                      title="Dark"
                    >
                      <Moon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setAppearance("night")}
                      className={cn("p-1.5 rounded-md text-xs", appearance === "night" && "bg-background text-foreground shadow-xs")}
                      title="Night"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </SheetHeader>

              {/* Module links */}
              <div className="overflow-y-auto px-3 py-2 space-y-1 flex-1">
                {moreNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      onClick={() => handleNavigate(item.href)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground leading-tight">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>

              {/* Sign out */}
              <div className="p-3 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSheetOpen(false);
                    logout();
                  }}
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-center text-xs h-9"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
