import { useState, type ReactNode } from "react";
import { useStore } from "@/store/app-store";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { GlobalSearchDialog } from "./GlobalSearchDialog";
import { Lock, Mail, Eye, EyeOff, Building2, AlertCircle, ShieldCheck } from "lucide-react";
import { BrandBanner } from "@/components/ui/brand-logo";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { loggedIn, login } = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!email.trim()) { setLoginError("Email is required"); return; }
    if (!password) { setLoginError("Password is required"); return; }

    setLoading(true);
    try {
      const success = await login(email.trim(), password);
      setLoading(false);

      if (!success) {
        setLoginError("Invalid credentials. Please check your email and password.");
      }
    } catch (err: any) {
      setLoading(false);
      setLoginError(err?.message || "Login failed");
    }
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-stretch overflow-hidden bg-[#0a0f1c]">
        {/* ── Left Panel — Branding ─────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center p-12 overflow-hidden">
          {/* Animated gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, #0d1f0a 0%, #0f2d0a 25%, #122e16 50%, #0a1f1c 75%, #071520 100%)",
            }}
          />
          {/* Decorative orbs */}
          <div
            className="absolute top-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #4ade80 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-[-60px] right-[-60px] w-[350px] h-[350px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full opacity-10 -translate-x-1/2 -translate-y-1/2"
            style={{ background: "radial-gradient(circle, #86efac 0%, transparent 60%)" }}
          />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative z-10 max-w-md text-center">
            {/* Logo */}
            <div className="mb-8">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                <Building2 className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              Aarigo Capital
            </h1>
            <p className="text-green-400 font-medium text-lg mb-2">Operations Portal</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-10">
              Growing Today, Securing Tomorrow — Professional loan management, EMI tracking, and field collection system.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {["Loan Management", "EMI Tracking", "Field Collection", "Documents", "Reports"].map((f) => (
                <span
                  key={f}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border"
                  style={{
                    background: "rgba(34,197,94,0.08)",
                    borderColor: "rgba(34,197,94,0.25)",
                    color: "#86efac",
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom legal line */}
          <p className="absolute bottom-6 text-xs text-slate-600">
            © 2026 Aarigo Capital. Secure local session. No data leaves your device.
          </p>
        </div>

        {/* ── Right Panel — Login Form ──────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          {/* Subtle background */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(160deg, #0d1117 0%, #111827 100%)" }}
          />

          {/* Mobile logo */}
          <div className="absolute top-6 left-6 lg:hidden">
            <BrandBanner className="h-8" />
          </div>

          <div className="relative z-10 w-full max-w-sm">
            {/* Shield badge */}
            <div className="flex items-center gap-2.5 mb-8">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ background: "linear-gradient(135deg, #22c55e22, #16a34a33)" }}
              >
                <ShieldCheck className="w-4.5 h-4.5 text-green-400" style={{ width: "18px", height: "18px" }} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Admin Login</p>
                <p className="text-slate-500 text-[11px]">Aarigo Capital Operations</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-8">Sign in to access the operations portal</p>

            <form onSubmit={(e) => void handleLoginSubmit(e)} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-xs font-medium text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none"
                  />
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading}
                    autoComplete="email"
                    className="w-full pl-10 pr-4 h-11 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)"; e.currentTarget.style.background = "rgba(34,197,94,0.04)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-xs font-medium text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none"
                  />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 h-11 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 font-mono disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)"; e.currentTarget.style.background = "rgba(34,197,94,0.04)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl text-xs"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    color: "#fca5a5",
                  }}
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all duration-200 cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? "rgba(34,197,94,0.5)"
                    : "linear-gradient(135deg, #22c55e, #16a34a)",
                  boxShadow: loading ? "none" : "0 0 20px rgba(34,197,94,0.3)",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = "0 0 28px rgba(34,197,94,0.45)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = loading ? "none" : "0 0 20px rgba(34,197,94,0.3)"; }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Verifying…
                  </span>
                ) : (
                  "Sign In to Portal"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Collapsible Left Sidebar */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden md:flex"
      />

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <AppHeader
          onOpenSearch={() => setSearchOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 focus:outline-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (hidden on desktop) */}
      <MobileBottomNav />

      {/* Global Command Palette Search */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
