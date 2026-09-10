import { useNavigate } from "@tanstack/react-router";
import { User, Settings as SettingsIcon, LogOut, Shield } from "lucide-react";
import { useStore } from "@/store/app-store";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminMenu() {
  const { admin, logout } = useStore();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative flex items-center gap-2.5 h-9 px-2 rounded-lg hover:bg-muted"
        >
          <Avatar className="h-7 w-7 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
              {initials(admin.name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-foreground">{admin.name}</span>
            <span className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1">
              <Shield className="h-2.5 w-2.5 text-primary" />
              {admin.role}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none">{admin.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{admin.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              void navigate({ to: "/profile" });
            }}
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void navigate({ to: "/settings" });
            }}
            className="cursor-pointer"
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
          }}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
