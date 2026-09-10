import { Bell, Check, CheckCheck, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtDateTime } from "@/lib/format";

export function NotificationDropdown() {
  const { notifications, markNotificationsRead } = useStore();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const toneIcon = (tone: string) => {
    switch (tone) {
      case "danger":
        return <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />;
      default:
        return <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markNotificationsRead}
              className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[380px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 p-3.5 text-xs transition-colors hover:bg-muted/50 ${
                    !n.read ? "bg-accent/25" : ""
                  }`}
                >
                  {toneIcon(n.tone)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-medium ${!n.read ? "text-foreground font-semibold" : "text-foreground/90"}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-[11px] line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 pt-0.5">
                      {fmtDateTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
