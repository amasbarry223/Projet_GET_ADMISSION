"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatHeure } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Mail, Phone, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

type ConversationMessage = {
  id: string;
  auteurId: string;
  texte: string;
  pieceJointeNom: string | null;
  pieceJointeTaille: string | null;
  createdAt: string;
  auteur: { prenom: string; nom: string; role: string };
};

type Conversation = {
  candidat: { prenom: string; nom: string };
  conseiller: { prenom: string; nom: string } | null;
  nonLusCandidat: number;
  messages: ConversationMessage[];
} | null;

export default function MessagesPage() {
  const [dossierId, setDossierId] = React.useState<string | null>(null);
  const [conversation, setConversation] = React.useState<Conversation>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [contactInfo, setContactInfo] = React.useState<{ email: string; telephone: string } | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Fetch contact info depuis la DB
  React.useEffect(() => {
    fetch("/api/public/contact-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setContactInfo({ email: d.email, telephone: d.telephone }); })
      .catch((e) => console.error("fetch error:", e));
  }, []);

  // 1. Fetch le dossier du candidat
  React.useEffect(() => {
    fetch("/api/dossiers")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: { id: string }[]) => {
        if (data[0]?.id) {
          setDossierId(data[0].id);
        } else {
          setError("Vous n'avez pas encore de dossier.");
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setError("Impossible de charger votre dossier.");
        setLoading(false);
      });
  }, []);

  // 2. Fetch la conversation quand on a le dossierId
  React.useEffect(() => {
    if (!dossierId) return;
    fetch(`/api/messages?dossierId=${encodeURIComponent(dossierId)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Conversation) => {
        setConversation(data);
        setLoading(false);
        // Marquer les messages comme lus côté serveur si besoin (rôle candidat)
        if (data && data.nonLusCandidat > 0) {
          fetch("/api/messages/read", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dossierId }),
          })
            .then(() => {
              setConversation((prev) => (prev ? { ...prev, nonLusCandidat: 0 } : prev));
            })
            .catch((e) => console.error("fetch error:", e));
        }
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setError("Impossible de charger la conversation.");
        setLoading(false);
      });
  }, [dossierId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !dossierId) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dossierId, texte: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      // Append localement
      if (conversation) {
        setConversation({
          ...conversation,
          messages: [...conversation.messages, data as ConversationMessage],
        });
      }
      setInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      // toast.error("Échec de l'envoi", { description: msg });
      console.error(msg);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <Alert className="border-ambre/40 bg-ambre/5">
        <AlertCircle className="h-4 w-4 text-ambre" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Messagerie indisponible</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          {error || "Aucune conversation trouvée."}{" "}
          <Link href="/espace/dossier" className="font-medium text-lapis-clair hover:underline">
            Créer mon dossier
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const messages = conversation.messages;
  const lastMessage = messages[messages.length - 1];
  const conseillerNom = conversation.conseiller
    ? `${conversation.conseiller.prenom} ${conversation.conseiller.nom}`
    : "Conseiller non affecté";

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Messagerie conseiller</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Vos messages.</h1>
      </div>

      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="grid h-[600px] md:grid-cols-[280px_1fr]">
          {/* Conversation list */}
          <aside className="hidden md:flex flex-col border-r border-ligne">
            <div className="border-b border-ligne px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Conseiller</p>
            </div>
            <div className="flex-1 overflow-y-auto scroll-fine p-2">
              <button className="flex w-full items-start gap-3 rounded-md bg-lapis/5 p-3 text-left">
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
                {conversation.nonLusCandidat > 0 && (
                  <Badge className="h-5 min-w-5 justify-center bg-ambre px-1.5 text-[10px] font-mono text-blanc">
                    {conversation.nonLusCandidat}
                  </Badge>
                )}
              </button>
            </div>
            <div className="border-t border-ligne p-3">
              <div className="flex items-center gap-2 text-xs text-ardoise">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{contactInfo?.email ?? "Chargement…"}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ardoise">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{contactInfo?.telephone ?? "Chargement…"}</span>
              </div>
            </div>
          </aside>

          {/* Chat thread */}
          <section className="flex flex-col">
            {/* Mobile header */}
            <div className="flex items-center gap-3 border-b border-ligne px-4 py-3 md:hidden">
              <Button variant="ghost" size="icon" aria-label="Retour"><ArrowLeft className="h-4 w-4" /></Button>
              <div className="relative h-8 w-8 flex-none overflow-hidden rounded-full border border-ligne">
                <Image src={conversation?.conseiller?.photoUrl ?? "/images/advisor-portrait.png"} alt={conseillerNom} fill className="object-cover" sizes="32px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-encre">{conseillerNom}</p>
                <p className="text-xs text-vert">En ligne</p>
              </div>
            </div>
            {/* Desktop header */}
            <div className="hidden md:flex items-center gap-3 border-b border-ligne px-4 py-3">
              <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full border border-ligne">
                <Image src={conversation?.conseiller?.photoUrl ?? "/images/advisor-portrait.png"} alt={conseillerNom} fill className="object-cover" sizes="36px" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre">{conseillerNom}</p>
                <p className="text-xs text-ardoise">Conseillère · Répond généralement sous 24h</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-fine bg-porcelaine/50 p-4">
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
                        <div className={cn("max-w-[80%] rounded-lg px-3.5 py-2.5", isCand ? "bg-lapis text-blanc" : "border border-ligne bg-blanc text-encre")}>
                          {m.pieceJointeNom && (
                            <div className={cn("mb-1.5 flex items-center gap-2 rounded-md border px-2 py-1 text-xs", isCand ? "border-blanc/20" : "border-ligne")}>
                              <Paperclip className="h-3 w-3" strokeWidth={1.5} />
                              <span className="font-mono">{m.pieceJointeNom}</span>
                              {m.pieceJointeTaille && <span className="opacity-70">{m.pieceJointeTaille}</span>}
                            </div>
                          )}
                          <p className="text-sm leading-relaxed">{m.texte}</p>
                          <p className={cn("mt-1 font-mono text-[10px]", isCand ? "text-blanc/60" : "text-ardoise")}>{formatHeure(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={send} className="flex items-center gap-2 border-t border-ligne p-3">
              <Button type="button" variant="ghost" size="icon" aria-label="Joindre un fichier" className="flex-none">
                <Paperclip className="h-4 w-4 text-ardoise" strokeWidth={1.5} />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Écrivez votre message…"
                className="flex-1"
                aria-label="Votre message"
              />
              <Button type="submit" size="icon" className="flex-none bg-lapis text-blanc hover:bg-lapis/90" aria-label="Envoyer" disabled={!input.trim() || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={1.5} />}
              </Button>
            </form>
          </section>
        </div>
      </Card>
    </div>
  );
}
