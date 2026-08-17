"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatHeure } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { MessagesSkeleton } from "@/components/ui/skeleton-card";
import { getApiErrorMessageSync, messageFromBody } from "@/lib/api-error";
import { usePrimaryDossier } from "@/hooks/use-primary-dossier";
import { runAsyncEffect } from "@/lib/run-async-effect";
import { Mail, Phone, ArrowLeft, AlertCircle, MessageSquare } from "lucide-react";
import { MessageComposer } from "@/components/messages/message-composer";
import { MessageAttachment } from "@/components/messages/message-attachment";
import { useRealtimeBroadcast } from "@/hooks/use-realtime-broadcast";
import { MESSAGES_LIVE_CHANNEL } from "@/lib/messages/live-broadcast";

type ConversationMessage = {
  id: string;
  auteurId: string;
  texte: string;
  pieceJointeNom: string | null;
  pieceJointeTaille: string | null;
  pieceJointeChemin: string | null;
  createdAt: string;
  auteur: { prenom: string; nom: string; role: string };
};

type Conversation = {
  candidat: { prenom: string; nom: string };
  conseiller: { prenom: string; nom: string; photoUrl?: string | null } | null;
  nonLusCandidat: number;
  messages: ConversationMessage[];
} | null;

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesInner />
    </Suspense>
  );
}

function MessagesInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preferredId = searchParams.get("dossierId");
  const {
    dossier: primaryDossier,
    loading: dossierLoading,
    error: dossierError,
    refetch: refetchDossier,
  } = usePrimaryDossier(preferredId);
  const dossierId = primaryDossier?.id ?? null;
  const [conversation, setConversation] = React.useState<Conversation>(null);
  const [conversationLoading, setConversationLoading] = React.useState(true);
  const [conversationError, setConversationError] = React.useState<string | null>(null);
  const [contactInfo, setContactInfo] = React.useState<{ email: string; telephone: string } | null>(null);
  const [contactError, setContactError] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Chargement initial (affiche le spinner)
  const loadConversation = React.useCallback((id: string) => {
    setConversationLoading(true);
    setConversationError(null);
    fetch(`/api/messages?dossierId=${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(messageFromBody(body) ?? getApiErrorMessageSync(r.status));
        }
        return r.json();
      })
      .then((data: Conversation) => {
        setConversation(data ?? { candidat: { prenom: "", nom: "" }, conseiller: null, nonLusCandidat: 0, messages: [] });
        setConversationLoading(false);
        if (data && data.nonLusCandidat > 0) {
          fetch("/api/messages/read", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dossierId: id }),
          })
            .then(() => {
              setConversation((prev) => (prev ? { ...prev, nonLusCandidat: 0 } : prev));
              void refetchDossier();
            })
            .catch(() => {
              toast.error("Lecture", {
                description: "Impossible de marquer les messages comme lus.",
              });
            });
        }
      })
      .catch((e) => {
        setConversationError(getApiErrorMessageSync(e, undefined, "Impossible de charger la conversation."));
        setConversationLoading(false);
      });
  }, [refetchDossier]);

  // Rafraîchissement silencieux : ne déclenche JAMAIS le spinner,
  // ne met à jour l'état que si de nouveaux messages sont arrivés.
  const silentRefresh = React.useCallback((id: string) => {
    fetch(`/api/messages?dossierId=${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) return;
        return r.json();
      })
      .then((data: Conversation) => {
        if (!data) return;
        setConversation((prev) => {
          // Ne re-render que si de nouveaux messages existent
          if (!prev || prev.messages.length !== data.messages.length) return data;
          return prev;
        });
        if (data.nonLusCandidat > 0) {
          fetch("/api/messages/read", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dossierId: id }),
          })
            .then(() => {
              setConversation((prev) => (prev ? { ...prev, nonLusCandidat: 0 } : prev));
              void refetchDossier();
            })
            .catch(() => {/* silencieux */});
        }
      })
      .catch(() => {/* silencieux */});
  }, [refetchDossier]);

  // Fetch contact info depuis la DB
  React.useEffect(() => {
    return runAsyncEffect(() => {
      fetch("/api/public/contact-info")
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((d) => {
          if (d) setContactInfo({ email: d.email, telephone: d.telephone });
        })
        .catch(() => setContactError(true));
    });
  }, []);

  React.useEffect(() => {
    if (dossierLoading || dossierError || !dossierId) return;
    // Chargement initial avec spinner
    queueMicrotask(() => loadConversation(dossierId));
    // Polling silencieux rapide (2s) — fluide et instantané
    const interval = setInterval(() => {
      silentRefresh(dossierId);
    }, 2000);
    return () => clearInterval(interval);
  }, [dossierLoading, dossierError, dossierId, loadConversation, silentRefresh]);

  useRealtimeBroadcast(MESSAGES_LIVE_CHANNEL, "message_created", () => {
    if (dossierId) silentRefresh(dossierId);
  });

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages.length]);

  const send = async (texte: string, fichier: File | null) => {
    if (!dossierId) return;
    try {
      const form = new FormData();
      form.set("dossierId", dossierId);
      form.set("texte", texte);
      if (fichier) form.set("fichier", fichier);
      const res = await fetch("/api/messages", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(messageFromBody(data) ?? getApiErrorMessageSync(res.status));
      // Append ou bootstrap conversation locale
      setConversation((prev) => {
        if (prev) {
          return { ...prev, messages: [...prev.messages, data as ConversationMessage] };
        }
        return {
          candidat: { prenom: "", nom: "" },
          conseiller: null,
          nonLusCandidat: 0,
          messages: [data as ConversationMessage],
        };
      });
      toast.success("Message envoyé");
    } catch (err: unknown) {
      toast.error("Échec de l'envoi", { description: getApiErrorMessageSync(err) });
    }
  };

  const loading = dossierLoading || (!!dossierId && conversationLoading);
  const error = dossierError ?? conversationError;

  if (loading) {
    return <MessagesSkeleton />;
  }

  if (error) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Chargement impossible</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          {error}{" "}
          <button
            type="button"
            className="font-medium text-lapis underline"
            onClick={() => (dossierId ? loadConversation(dossierId) : void refetchDossier())}
          >
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dossierId) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-5 w-5" strokeWidth={1.5} />}
        title="Aucun dossier"
        description="Créez d'abord un dossier pour écrire à votre conseiller."
        action={
          <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
            <Link href="/espace/dossier">Composer mon dossier</Link>
          </Button>
        }
      />
    );
  }

  const messages = conversation?.messages ?? [];  const lastMessage = messages[messages.length - 1];
  const conseillerNom = conversation?.conseiller
    ? `${conversation.conseiller.prenom} ${conversation.conseiller.nom}`
    : "Conseiller non affecté";
  const nonLus = conversation?.nonLusCandidat ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Messagerie conseiller</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Vos messages.</h1>
      </div>

      <Card className="border-ligne bg-card p-0 overflow-hidden shadow-sm">
        <div className="grid h-[640px] max-h-[calc(100vh-210px)] min-h-[500px] md:grid-cols-[280px_1fr]">
          {/* Conversation list */}
          <aside className="hidden md:flex flex-col min-h-0 border-r border-ligne bg-card">
            <div className="border-b border-ligne px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Conseiller</p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto chat-scroll p-2">
              <button className="flex w-full items-start gap-3 rounded-md bg-lapis/5 p-3 text-left transition-colors hover:bg-lapis/10">
                <div className="relative h-10 w-10 flex-none overflow-hidden rounded-full border border-ligne">
                  <Image src={conversation?.conseiller?.photoUrl ?? "/images/advisor-portrait.png"} alt={conseillerNom} fill className="object-cover" sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-encre">{conseillerNom}</p>
                    {lastMessage && (
                      <span className="font-mono text-[10px] text-ardoise">{formatHeure(lastMessage.createdAt)}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-ardoise">{lastMessage?.texte ?? "Démarrez la conversation"}</p>
                </div>
                {nonLus > 0 && (
                  <Badge className="h-5 min-w-5 justify-center bg-ambre px-1.5 text-[10px] font-mono text-blanc">
                    {nonLus}
                  </Badge>
                )}
              </button>
            </div>
            <div className="border-t border-ligne p-3 bg-porcelaine/30">
              <div className="flex items-center gap-2 text-xs text-ardoise">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>
                  {contactInfo?.email ?? (contactError ? "Contact indisponible" : "Chargement…")}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ardoise">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>
                  {contactInfo?.telephone ?? (contactError ? "—" : "Chargement…")}
                </span>
              </div>
            </div>
          </aside>

          {/* Chat thread */}
          <section className="flex flex-col min-h-0 overflow-hidden bg-card">
            {/* Mobile header */}
            <div className="flex items-center gap-3 border-b border-ligne px-4 py-3 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Retour au tableau de bord"
                onClick={() => router.push("/espace")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="relative h-8 w-8 flex-none overflow-hidden rounded-full border border-ligne">
                <Image src={conversation?.conseiller?.photoUrl ?? "/images/advisor-portrait.png"} alt={conseillerNom} fill className="object-cover" sizes="32px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-encre">{conseillerNom}</p>
                <p className="text-xs text-ardoise">Conseillère GET Admission</p>
              </div>
            </div>
            {/* Desktop header */}
            <div className="hidden md:flex items-center gap-3 border-b border-ligne px-4 py-3 bg-card">
              <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full border border-ligne">
                <Image src={conversation?.conseiller?.photoUrl ?? "/images/advisor-portrait.png"} alt={conseillerNom} fill className="object-cover" sizes="36px" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre">{conseillerNom}</p>
                <p className="text-xs text-ardoise">Conseillère · Répond généralement sous 24h</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto chat-scroll bg-porcelaine/40 p-4 sm:p-6">
              <div className="mx-auto max-w-2xl space-y-3">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-ardoise">Aucun message pour l'instant. Votre conseiller vous écrira dès la prise en charge de votre dossier.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isCand = m.auteur.role === "CANDIDAT";
                    return (
                      <div key={m.id} className={cn("flex", isCand ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-lg px-3.5 py-2.5 shadow-xs", isCand ? "bg-lapis text-blanc" : "border border-ligne bg-card text-encre")}>
                          {m.pieceJointeNom && (
                            <MessageAttachment
                              nom={m.pieceJointeNom}
                              taille={m.pieceJointeTaille}
                              downloadUrl={`/api/messages/${m.id}/download`}
                              mine={isCand}
                            />
                          )}
                          {m.texte && <p className="text-sm leading-relaxed">{m.texte}</p>}
                          <p className={cn("mt-1 font-mono text-[10px]", isCand ? "text-blanc/60" : "text-ardoise")}>{formatHeure(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input */}
            <div className="flex-none bg-card">
              <MessageComposer
                onSend={send}
                initialValue={searchParams.get("prefill") || searchParams.get("message") || ""}
              />
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}
