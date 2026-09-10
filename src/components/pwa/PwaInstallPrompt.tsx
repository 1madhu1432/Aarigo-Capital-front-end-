import { useState, useEffect } from "react";
import { Download, Smartphone, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // If already standalone or user dismissed, don't show prompt
  if (isStandalone || dismissed) return null;

  if (installed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2">
        <CheckCircle2 className="h-4 w-4" />
        <span>Aarigo Capital installed!</span>
      </div>
    );
  }

  // Header/Banner button when install prompt is available
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xl backdrop-blur-md max-w-sm animate-in fade-in slide-in-from-bottom-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-xs font-bold text-foreground">Install Aarigo Capital App</span>
          <span className="text-[11px] text-muted-foreground truncate">
            Install on desktop or mobile for offline access
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="h-8 text-xs font-semibold px-3 cursor-pointer bg-primary text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Install
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
