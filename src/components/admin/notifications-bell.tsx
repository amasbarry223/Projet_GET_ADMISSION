"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Loader2, FileText, CreditCard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Notification = {
  id: string;
  type: string;
  message: string;
  reference: string;
  href: string;
  createdAt: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  dossier: FileText,
  paiement: CreditCard,
  message: MessageSquare,
};

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const loadNotifications = React.useCallback(() => {
    fetch("/api/admin/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.notifications) {
          setNotifications(data.notifications);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    loadNotifications();
    // Poll toutes les 60 secondes
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const count = notifications.length;
  const hasUnread = count > 0;

  const handleClick = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-ardoise hover:text-lapis" aria-label="Notifications">
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {hasUnread && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ambre px-1 font-mono text-[9px] font-bold text-blanc">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-blanc p-0">
        <div className="border-b border-ligne px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-bold text-encre">Notifications</p>
            {hasUnread && <Badge className="bg-ambre/15 font-mono text-[10px] text-ambre">{count} non lue{count > 1 ? "s" : ""}</Badge>}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto scroll-fine">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-ardoise" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <BellOff className="h-6 w-6 text-ardoise/40" strokeWidth={1.5} />
              <p className="text-sm text-ardoise">Aucune notification. Tout est à jour.</p>
            </div>
          ) : (
            <ul className="divide-y divide-ligne">
              {notifications.map((n) => {
                const Icon = ICON_MAP[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n.href)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-porcelaine"
                    >
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-lapis/10">
                        <Icon className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-encre line-clamp-2">{n.message}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-ardoise">{n.reference}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {hasUnread && (
          <div className="border-t border-ligne px-4 py-2">
            <Link href="/admin/dossiers" className="text-xs font-medium text-lapis-clair hover:underline">
              Voir tous les dossiers
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
