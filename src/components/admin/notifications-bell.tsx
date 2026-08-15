"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Loader2, FileText, CreditCard, MessageSquare, AlertCircle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRealtimeBroadcast } from "@/hooks/use-realtime-broadcast";
import { MESSAGES_LIVE_CHANNEL, MESSAGES_INTERNES_LIVE_CHANNEL } from "@/lib/messages/live-broadcast";
import { DOSSIER_LIVE_CHANNEL } from "@/lib/dossier/live-broadcast";

type Notification = {
  id: string;
  type: string;
  message: string;
  reference: string;
  href: string;
  createdAt: string;
  notifId?: string;
};

const ICON_MAP: Record<string, React.ElementType> = {
  dossier: FileText,
  paiement: CreditCard,
  message: MessageSquare,
  correction: AlertCircle,
};

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);

  const loadNotifications = React.useCallback(() => {
    fetch("/api/admin/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.notifications) {
          setNotifications(data.notifications);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    loadNotifications();
    // Polling de secours toutes les 10s
    const interval = setInterval(loadNotifications, 10_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Réveil instantané via Realtime : nouveau message ou changement de dossier
  useRealtimeBroadcast(MESSAGES_LIVE_CHANNEL, "message_created", loadNotifications);
  useRealtimeBroadcast(MESSAGES_INTERNES_LIVE_CHANNEL, "message_interne_created", loadNotifications);
  useRealtimeBroadcast(DOSSIER_LIVE_CHANNEL, "dossier_updated", loadNotifications);

  // Marquer une notification individuelle comme lue
  const markOneAsRead = React.useCallback((n: Notification) => {
    if (!n.notifId) return;
    fetch("/api/admin/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [n.notifId] }),
    }).catch(() => {});
    setNotifications((prev) => prev.filter((item) => item.id !== n.id));
  }, []);

  // Marquer toutes les notifications comme lues
  const markAllAsRead = React.useCallback(async () => {
    if (notifications.length === 0) return;
    setMarkingAll(true);
    try {
      await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications([]);
    } finally {
      setMarkingAll(false);
    }
  }, [notifications.length]);

  const handleClick = (n: Notification) => {
    setOpen(false);
    markOneAsRead(n);
    router.push(n.href);
  };

  // À l'ouverture du popover : rafraîchir la liste
  const handleOpenChange = React.useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) loadNotifications();
  }, [loadNotifications]);

  const count = notifications.length;
  const hasUnread = count > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-ardoise hover:text-lapis"
          aria-label={hasUnread ? `Notifications (${count} non lues)` : "Notifications"}
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {hasUnread && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ambre px-1 font-mono text-[9px] font-bold text-blanc animate-in zoom-in-75 duration-200">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-card p-0">
        <div className="border-b border-ligne px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-bold text-encre">Notifications</p>
            <div className="flex items-center gap-2">
              {hasUnread && (
                <Badge className="bg-ambre/15 font-mono text-[10px] text-ambre">
                  {count} non lue{count > 1 ? "s" : ""}
                </Badge>
              )}
              {hasUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[11px] text-ardoise hover:text-lapis"
                  onClick={markAllAsRead}
                  disabled={markingAll}
                >
                  {markingAll
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <CheckCheck className="h-3 w-3" />
                  }
                  Tout lire
                </Button>
              )}
            </div>
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
                      onClick={() => handleClick(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-porcelaine group"
                    >
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-lapis/10 group-hover:bg-lapis/20 transition-colors">
                        <Icon className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-encre line-clamp-2">{n.message}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-ardoise">{n.reference}</p>
                      </div>
                      {/* Indicateur non lu */}
                      <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-ambre" />
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
