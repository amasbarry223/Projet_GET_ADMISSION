"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatHeure, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, apiJson } from "@/lib/api-client";
import { Loader2, MessagesSquare, Landmark } from "lucide-react";
import { MessageComposer } from "@/components/messages/message-composer";
import { MessageAttachment } from "@/components/messages/message-attachment";
import { useRealtimeBroadcast } from "@/hooks/use-realtime-broadcast";
import { MESSAGES_INTERNES_LIVE_CHANNEL } from "@/lib/messages/live-broadcast";

type MessageApi = {
  id: string;
  texte: string;
  createdAt: string;
  auteur: { prenom: string; nom: string; role: string };
  pieceJointeNom?: string | null;
  pieceJointeTaille?: string | null;
  pieceJointeChemin?: string | null;
};

type ConversationApi = {
  financier: { id: string; prenom: string; nom: string; role?: string };
  nonLusFinancier: number;
  nonLusAdmin: number;
  messages: MessageApi[];
} | null;

type InboxRow = {
  financier: { id: string; prenom: string; nom: string; role?: string };
  nonLusAdmin: number;
  updatedAt: string;
  dernierMessage: string | null;
};

const CORRESPONDANT_ROLE_LABEL: Record<string, string> = {
  FINANCIER: "Financier(ère)",
  CONSEILLER: "Conseiller(ère)",
};

function initiales(prenom: string, nom: string) {
  return `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
}

function isAdminSide(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function ChatThread({
  messages,
  emptyLabel,
  bubbleIsMine,
}: {
  messages: MessageApi[];
  emptyLabel: string;
  bubbleIsMine: (m: MessageApi) => boolean;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto chat-scroll bg-porcelaine/40 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-ardoise">{emptyLabel}</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = bubbleIsMine(m);
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3.5 py-2.5 shadow-xs",
                    mine ? "bg-lapis text-blanc" : "border border-ligne bg-card text-encre",
                  )}
                >
                  {!mine && (
                    <p className="mb-0.5 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                      {m.auteur.prenom} {m.auteur.nom}
                    </p>
                  )}
                  {m.pieceJointeNom && (
                    <MessageAttachment
                      nom={m.pieceJointeNom}
                      taille={m.pieceJointeTaille}
                      downloadUrl={`/api/messages-internes/${m.id}/download`}
                      mine={mine}
                    />
                  )}
                  {m.texte && <p className="text-sm leading-relaxed">{m.texte}</p>}
                  <p className={cn("mt-1 font-mono text-[10px]", mine ? "text-blanc/60" : "text-ardoise")}>
                    {formatHeure(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StaffThreadView() {
  const [conversation, setConversation] = React.useState<ConversationApi>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const result = await apiFetch<ConversationApi>("/api/messages-internes");
    if (!result.ok) {
      toast.error("Impossible de charger la conversation", { description: result.error });
      setLoading(false);
      return;
    }
    setConversation(result.data);
    setLoading(false);
    if (result.data && result.data.nonLusFinancier > 0) {
      void apiJson("/api/messages-internes/read", "PUT", {});
    }
  }, []);

  // Rafraîchissement silencieux — ne réactive jamais le spinner
  const silentLoad = React.useCallback(async () => {
    const result = await apiFetch<ConversationApi>("/api/messages-internes");
    if (!result.ok) return;
    setConversation((prev) => {
      if (!prev || prev.messages.length !== result.data?.messages.length) return result.data;
      return prev;
    });
    if (result.data && result.data.nonLusFinancier > 0) {
      void apiJson("/api/messages-internes/read", "PUT", {});
    }
  }, []);

  React.useEffect(() => {
    // Chargement initial (affiche le spinner une seule fois)
    queueMicrotask(() => void load());
    // Polling silencieux rapide (2s) — instantané
    const interval = setInterval(() => {
      void silentLoad();
    }, 2000);
    return () => clearInterval(interval);
  }, [load, silentLoad]);

  useRealtimeBroadcast(MESSAGES_INTERNES_LIVE_CHANNEL, "message_interne_created", silentLoad);

  const send = async (texte: string, fichier: File | null) => {
    const form = new FormData();
    form.set("texte", texte);
    if (fichier) form.set("fichier", fichier);
    const result = await apiFetch<MessageApi>("/api/messages-internes", { method: "POST", body: form });
    if (!result.ok) {
      toast.error("Échec de l'envoi", { description: result.error });
      return;
    }
    setConversation((prev) =>
      prev
        ? { ...prev, messages: [...prev.messages, result.data] }
        : {
            financier: { id: "", prenom: "", nom: "" },
            nonLusFinancier: 0,
            nonLusAdmin: 0,
            messages: [result.data],
          },
    );
  };

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ardoise" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-ligne bg-card p-0">
      <div className="flex h-[600px] flex-col">
        <div className="flex items-center gap-3 border-b border-ligne px-4 py-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-lapis/10 font-mono text-[11px] font-semibold text-lapis">
              <Landmark className="h-4 w-4" strokeWidth={1.5} />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-encre">Administration</p>
            <p className="text-xs text-ardoise">Admin · Super Admin</p>
          </div>
        </div>
        <ChatThread
          messages={conversation?.messages ?? []}
          emptyLabel="Aucun message pour l'instant. Écrivez à l'administration ci-dessous."
          bubbleIsMine={(m) => !isAdminSide(m.auteur.role)}
        />
        <MessageComposer onSend={send} />
      </div>
    </Card>
  );
}

function AdminView() {
  const [inbox, setInbox] = React.useState<InboxRow[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [conversation, setConversation] = React.useState<ConversationApi>(null);
  const [threadLoading, setThreadLoading] = React.useState(false);

  const loadInbox = React.useCallback(async () => {
    const result = await apiFetch<InboxRow[]>("/api/messages-internes");
    if (!result.ok) {
      toast.error("Impossible de charger la messagerie", { description: result.error });
      return;
    }
    setInbox(result.data);
    setSelectedId((prev) => prev ?? result.data[0]?.financier.id ?? null);
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => void loadInbox());
  }, [loadInbox]);

  // Chargement initial du thread avec spinner
  const loadThread = React.useCallback(async (financierId: string) => {
    setThreadLoading(true);
    const result = await apiFetch<ConversationApi>(
      `/api/messages-internes?financierId=${encodeURIComponent(financierId)}`,
    );
    setThreadLoading(false);
    if (!result.ok) {
      toast.error("Impossible de charger la conversation", { description: result.error });
      return;
    }
    setConversation(result.data);
    if (result.data && result.data.nonLusAdmin > 0) {
      void apiJson("/api/messages-internes/read", "PUT", { financierId }).then(() => {
        setInbox((prev) =>
          prev?.map((r) => (r.financier.id === financierId ? { ...r, nonLusAdmin: 0 } : r)) ?? prev,
        );
      });
    }
  }, []);

  // Rafraîchissement silencieux du thread (pas de spinner)
  const silentRefreshThread = React.useCallback(async (financierId: string) => {
    const result = await apiFetch<ConversationApi>(
      `/api/messages-internes?financierId=${encodeURIComponent(financierId)}`,
    );
    if (!result.ok) return;
    setConversation((prev) => {
      if (!prev || prev.messages.length !== result.data?.messages.length) return result.data;
      return prev;
    });
    if (result.data && result.data.nonLusAdmin > 0) {
      void apiJson("/api/messages-internes/read", "PUT", { financierId }).then(() => {
        setInbox((prev) =>
          prev?.map((r) => (r.financier.id === financierId ? { ...r, nonLusAdmin: 0 } : r)) ?? prev,
        );
      });
    }
  }, []);

  React.useEffect(() => {
    if (!selectedId) return;
    queueMicrotask(() => void loadThread(selectedId));
    // Polling silencieux rapide (2s) — ne clignote jamais
    const interval = setInterval(() => {
      void silentRefreshThread(selectedId);
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedId, loadThread, silentRefreshThread]);

  const onLiveMessage = React.useCallback(() => {
    void loadInbox();
    if (selectedId) void silentRefreshThread(selectedId);
  }, [loadInbox, silentRefreshThread, selectedId]);
  useRealtimeBroadcast(MESSAGES_INTERNES_LIVE_CHANNEL, "message_interne_created", onLiveMessage);

  const send = async (texte: string, fichier: File | null) => {
    if (!selectedId) return;
    const form = new FormData();
    form.set("texte", texte);
    form.set("financierId", selectedId);
    if (fichier) form.set("fichier", fichier);
    const result = await apiFetch<MessageApi>("/api/messages-internes", { method: "POST", body: form });
    if (!result.ok) {
      toast.error("Échec de l'envoi", { description: result.error });
      return;
    }
    setConversation((prev) => (prev ? { ...prev, messages: [...prev.messages, result.data] } : prev));
    void loadInbox();
  };

  if (inbox === null) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-ardoise" strokeWidth={1.5} />
      </div>
    );
  }

  if (inbox.length === 0) {
    return (
      <Card className="border-ligne bg-card p-0">
        <EmptyState
          icon={<MessagesSquare className="h-5 w-5" strokeWidth={1.5} />}
          title="Aucun message"
          description="Aucun financier ou conseiller n'a encore écrit à l'administration."
        />
      </Card>
    );
  }

  const selectedRow = inbox.find((r) => r.financier.id === selectedId);
  const selectedNom = selectedRow ? `${selectedRow.financier.prenom} ${selectedRow.financier.nom}` : "";

  return (
    <Card className="overflow-hidden border-ligne bg-card p-0">
      <div className="grid h-[600px] md:grid-cols-[280px_1fr]">
        <aside className="hidden md:flex flex-col min-h-0 border-r border-ligne bg-card">
          <div className="border-b border-ligne px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Correspondants</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto chat-scroll p-2">
            {inbox.map((row) => {
              const active = row.financier.id === selectedId;
              const nom = `${row.financier.prenom} ${row.financier.nom}`;
              return (
                <button
                  key={row.financier.id}
                  onClick={() => setSelectedId(row.financier.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md p-3 text-left transition-colors",
                    active ? "bg-lapis/5" : "hover:bg-porcelaine",
                  )}
                >
                  <Avatar className="h-10 w-10 flex-none">
                    <AvatarFallback className="bg-lapis/10 font-mono text-[10px] font-semibold text-lapis">
                      {initiales(row.financier.prenom, row.financier.nom)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-encre">{nom}</p>
                      <span className="font-mono text-[10px] text-ardoise">{formatDate(row.updatedAt)}</span>
                    </div>
                    <p className="truncate text-xs text-ardoise">{row.dernierMessage ?? "Aucun message"}</p>
                  </div>
                  {row.nonLusAdmin > 0 && (
                    <Badge className="h-5 min-w-5 justify-center bg-ambre px-1.5 text-[10px] font-mono text-blanc">
                      {row.nonLusAdmin}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex flex-col">
          <div className="flex items-center gap-3 border-b border-ligne px-4 py-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-lapis/10 font-mono text-[11px] font-semibold text-lapis">
                {selectedRow ? initiales(selectedRow.financier.prenom, selectedRow.financier.nom) : "—"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-encre">{selectedNom || "—"}</p>
              <p className="text-xs text-ardoise">
                {(selectedRow?.financier.role && CORRESPONDANT_ROLE_LABEL[selectedRow.financier.role]) ?? "—"}
              </p>
            </div>
          </div>

          {threadLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-ardoise" strokeWidth={1.5} />
            </div>
          ) : (
            <ChatThread
              messages={conversation?.messages ?? []}
              emptyLabel="Aucun message dans ce fil."
              bubbleIsMine={(m) => isAdminSide(m.auteur.role)}
            />
          )}
          <MessageComposer onSend={send} />
        </section>
      </div>
    </Card>
  );
}

export function MessagesInternesClient() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isStaffThread = role === "FINANCIER" || role === "CONSEILLER";

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Messagerie interne</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          {isStaffThread ? "Écrire à l'administration." : "Messages internes."}
        </h1>
      </div>

      {!role ? (
        <div className="flex h-[600px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-ardoise" strokeWidth={1.5} />
        </div>
      ) : isStaffThread ? (
        <StaffThreadView />
      ) : (
        <AdminView />
      )}
    </div>
  );
}
