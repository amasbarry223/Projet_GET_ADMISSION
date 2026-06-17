"use client";

import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CONVERSATIONS, type Message } from "@/lib/mock/messages";
import { formatHeure, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Paperclip, Send, Mail, Phone, ArrowLeft } from "lucide-react";

export default function MessagesPage() {
  const conv = CONVERSATIONS[0];
  const [messages, setMessages] = React.useState<Message[]>(conv.messages);
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: `m-${Date.now()}`, auteur: "candidat", texte: text, date: new Date().toISOString() }]);
    setInput("");
  };

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
                  <Image src="/images/advisor-portrait.png" alt={conv.conseillerNom} fill className="object-cover" sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-encre">{conv.conseillerNom}</p>
                    <span className="font-mono text-[10px] text-ardoise">{formatHeure(conv.messages[conv.messages.length - 1].date)}</span>
                  </div>
                  <p className="truncate text-xs text-ardoise">{conv.messages[conv.messages.length - 1].texte}</p>
                </div>
                {conv.nonLusCandidat > 0 && (
                  <Badge className="h-5 min-w-5 justify-center bg-ambre px-1.5 text-[10px] font-mono text-blanc">{conv.nonLusCandidat}</Badge>
                )}
              </button>
            </div>
            <div className="border-t border-ligne p-3">
              <div className="flex items-center gap-2 text-xs text-ardoise">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>contact@getadm.com</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ardoise">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>+221 33 800 00 00</span>
              </div>
            </div>
          </aside>

          {/* Chat thread */}
          <section className="flex flex-col">
            {/* Mobile header */}
            <div className="flex items-center gap-3 border-b border-ligne px-4 py-3 md:hidden">
              <Button variant="ghost" size="icon" aria-label="Retour"><ArrowLeft className="h-4 w-4" /></Button>
              <div className="relative h-8 w-8 flex-none overflow-hidden rounded-full border border-ligne">
                <Image src="/images/advisor-portrait.png" alt={conv.conseillerNom} fill className="object-cover" sizes="32px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-encre">{conv.conseillerNom}</p>
                <p className="text-xs text-vert">En ligne</p>
              </div>
            </div>
            {/* Desktop header */}
            <div className="hidden md:flex items-center gap-3 border-b border-ligne px-4 py-3">
              <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full border border-ligne">
                <Image src="/images/advisor-portrait.png" alt={conv.conseillerNom} fill className="object-cover" sizes="36px" />
              </div>
              <div>
                <p className="text-sm font-semibold text-encre">{conv.conseillerNom}</p>
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
                    const isCand = m.auteur === "candidat";
                    return (
                      <div key={m.id} className={cn("flex", isCand ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-lg px-3.5 py-2.5", isCand ? "bg-lapis text-blanc" : "border border-ligne bg-blanc text-encre")}>
                          {m.pieceJointe && (
                            <div className={cn("mb-1.5 flex items-center gap-2 rounded-md border px-2 py-1 text-xs", isCand ? "border-blanc/20" : "border-ligne")}>
                              <Paperclip className="h-3 w-3" strokeWidth={1.5} />
                              <span className="font-mono">{m.pieceJointe.nom}</span>
                              <span className="opacity-70">{m.pieceJointe.taille}</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed">{m.texte}</p>
                          <p className={cn("mt-1 font-mono text-[10px]", isCand ? "text-blanc/60" : "text-ardoise")}>{formatHeure(m.date)}</p>
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
              <Button type="submit" size="icon" className="flex-none bg-lapis text-blanc hover:bg-lapis/90" aria-label="Envoyer" disabled={!input.trim()}>
                <Send className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </form>
          </section>
        </div>
      </Card>
    </div>
  );
}
