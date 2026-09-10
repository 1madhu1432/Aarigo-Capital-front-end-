import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  collapsed?: boolean;
}

export function BrandLogo({
  className,
  size = "md",
  showText = true,
  showTagline = true,
  collapsed = false,
}: BrandLogoProps) {
  const sizeMap = {
    sm: { img: "h-8 w-8",  title: "text-sm font-black",  tagline: "text-[8px]"  },
    md: { img: "h-10 w-10", title: "text-base font-black", tagline: "text-[9px]"  },
    lg: { img: "h-14 w-14", title: "text-xl font-black",  tagline: "text-[10px]" },
    xl: { img: "h-20 w-20", title: "text-2xl font-black", tagline: "text-xs"     },
  };

  const s = sizeMap[size];

  if (collapsed) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white shadow-xs border border-slate-200/60 dark:border-slate-800", s.img, className)}
        title="AARIGO CAPITAL — Growing Today, Securing Tomorrow"
      >
        <img
          src="/logo-icon.jpg"
          alt="Aarigo Capital"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      {/* Circular Icon Mark */}
      <div className={cn("relative flex shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white shadow-xs border border-slate-200/60 dark:border-slate-800", s.img)}>
        <img
          src="/logo-icon.jpg"
          alt="Aarigo Capital Logo"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Typography Lockup */}
      {showText && (
        <div className="flex flex-col min-w-0 leading-none">
          <span className={cn("tracking-wide uppercase text-[#5a9e1a] dark:text-[#7cc72e]", s.title)}>
            AARIGO
          </span>
          {showTagline && (
            <span className={cn("font-semibold tracking-widest uppercase text-muted-foreground mt-0.5 whitespace-nowrap", s.tagline)}>
              CAPITAL
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Full Banner version — shows the full logo and tagline */
export function BrandBanner({ className, alt = "Aarigo Capital" }: { className?: string; alt?: string }) {
  return (
    <div className={cn("rounded-2xl overflow-hidden bg-white shadow-xs border border-slate-200/60 dark:border-slate-800 p-4 flex flex-col items-center gap-2", className)}>
      <img
        src="/logo.png"
        alt={alt}
        className="w-auto object-contain"
        style={{ maxHeight: "150px" }}
      />
      <div className="text-center leading-none">
        <div className="text-sm font-bold tracking-[0.3em] uppercase text-slate-600 dark:text-slate-400">CAPITAL</div>
        <div className="text-[10px] tracking-wider font-medium text-muted-foreground mt-1">Growing Today, Securing Tomorrow</div>
      </div>
    </div>
  );
}
