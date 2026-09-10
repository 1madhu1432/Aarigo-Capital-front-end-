import { Monitor, Moon, Sparkles, Sun } from "lucide-react";
import { useTheme, type Appearance } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { appearance, resolved, setAppearance } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          title={`Theme: ${appearance} (active: ${resolved})`}
          aria-label="Toggle theme"
        >
          {resolved === "light" && <Sun className="h-4 w-4" />}
          {resolved === "dark" && <Moon className="h-4 w-4" />}
          {resolved === "night" && <Sparkles className="h-4 w-4 text-primary" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setAppearance("light")}
          className={appearance === "light" ? "bg-accent font-medium text-accent-foreground" : ""}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppearance("dark")}
          className={appearance === "dark" ? "bg-accent font-medium text-accent-foreground" : ""}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppearance("night")}
          className={appearance === "night" ? "bg-accent font-medium text-accent-foreground" : ""}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span>Night</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppearance("system")}
          className={appearance === "system" ? "bg-accent font-medium text-accent-foreground" : ""}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
