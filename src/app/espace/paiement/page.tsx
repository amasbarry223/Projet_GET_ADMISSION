"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DOSSIER_DEMO_CANDIDAT } from "@/lib/mock/dossiers";
import { UNIVERSITES } from "@/lib/mock/universites";
import { formationParId } from "@/lib/mock/formations";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Download, Loader2, Lock, CreditCard, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";

const METHODS = [
  { id: "orange", name: "Orange Money", color: "bg-orange-500", emoji: "🟠" },
  { id: "moov", name: "Moov Money", color: "bg-blue-600", emoji: "🔵" },
  { id: "wave", name: "Wave", color: "bg-cyan-500", emoji: "🌊" },
  { id: "carte", name: "Carte bancaire", color: "bg-lapis", emoji: "💳" },
];

export default function PaiementPage() {
  const d = DOSSIER_DEMO_CANDIDAT;
  const univ = UNIVERSITES.find((u) => u.id === d.universiteId);
  const form = formationParId(d.formationId);
  const [method, setMethod] = React.useState("orange");
  const [tranches, setTranches] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "loading" | "success">("idle");

  const total = d.fraisAgence;
  const tranche1 = Math.round(total / 2);
  const tranche2 = total - tranche1;

  const confirm = () => {
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
      toast.success("Paiement confirmé", { description: `${formatFCFA(total)} · ${METHODS.find((m) => m.id === method)?.name}` });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Paiement & reçus</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Réglez les frais d'agence.</h1>
        <p className="text-ardoise">Sécurisé · Mobile Money & carte bancaire.</p>
      </div>

      {status === "success" ? (
        <Card className="border-vert/30 bg-vert/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-vert/15">
            <CheckCircle2 className="h-7 w-7 text-vert" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-2xl font-bold text-encre">Paiement confirmé.</h2>
          <p className="mt-1 text-sm text-ardoise">Votre paiement a bien été reçu. Le reçu est disponible ci-dessous.</p>

          <div className="mx-auto mt-6 max-w-md rounded-md border border-ligne bg-blanc p-5 text-left">
            <div className="flex items-center justify-between border-b border-ligne pb-3">
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Reçu</span>
              <span className="font-mono text-xs font-semibold text-encre">REC-2026-0580</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ardoise">Date</dt><dd className="font-mono text-encre">{formatDateTime(new Date().toISOString())}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Candidat</dt><dd className="text-encre">Fatou Diallo</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Référence dossier</dt><dd className="font-mono text-encre">{d.reference}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Université</dt><dd className="text-encre">{univ?.nom}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Moyen</dt><dd className="text-encre">{METHODS.find((m) => m.id === method)?.name}</dd></div>
              <div className="flex justify-between border-t border-ligne pt-2 mt-2"><dt className="font-semibold text-encre">Montant</dt><dd className="font-mono text-lg font-bold text-lapis">{formatFCFA(total)}</dd></div>
            </dl>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => toast.success("Reçu téléchargé", { description: "recu-2026-0580.pdf" })}>
              <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Télécharger le reçu
            </Button>
            <Button variant="ghost" onClick={() => setStatus("idle")}>Nouveau paiement</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: form */}
          <div className="space-y-4">
            <Card className="border-ligne bg-blanc p-6">
              <p className="eyebrow">Moyen de paiement</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border-2 p-3 text-left transition-all",
                      method === m.id ? "border-lapis bg-lapis/5" : "border-ligne bg-blanc hover:border-lapis/30"
                    )}
                    aria-pressed={method === m.id}
                  >
                    <span className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-md text-blanc", m.color)}>
                      {m.id === "carte" ? <CreditCard className="h-4 w-4" strokeWidth={1.5} /> : <Smartphone className="h-4 w-4" strokeWidth={1.5} />}
                    </span>
                    <span className="text-sm font-medium text-encre">{m.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-md border border-ligne bg-porcelaine p-3">
                <div>
                  <Label htmlFor="tranches" className="text-sm font-medium text-encre">Payer en plusieurs tranches</Label>
                  <p className="text-xs text-ardoise">Deux versements égaux, 30 jours d'intervalle.</p>
                </div>
                <Switch id="tranches" checked={tranches} onCheckedChange={setTranches} />
              </div>

              {tranches && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-ligne p-3">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Tranche 1 — aujourd'hui</p>
                    <p className="mt-1 font-mono text-lg font-bold text-lapis">{formatFCFA(tranche1)}</p>
                  </div>
                  <div className="rounded-md border border-ligne p-3">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Tranche 2 — dans 30 jours</p>
                    <p className="mt-1 font-mono text-lg font-bold text-ardoise">{formatFCFA(tranche2)}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="border-ligne bg-blanc p-6">
              <div className="flex items-center gap-2 text-sm text-ardoise">
                <ShieldCheck className="h-4 w-4 text-vert" strokeWidth={1.5} />
                Paiement sécurisé · Vos données sont chiffrées.
              </div>
              <Button className="mt-4 w-full bg-lapis text-blanc hover:bg-lapis/90" size="lg" onClick={confirm} disabled={status === "loading"}>
                {status === "loading" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement…</> : <><Lock className="mr-2 h-4 w-4" strokeWidth={1.5} /> Confirmer le paiement</>}
              </Button>
            </Card>
          </div>

          {/* Right: summary */}
          <Card className="border-ligne bg-blanc p-6 lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">Récapitulatif</p>
            <h2 className="mt-1 font-display text-lg font-bold text-encre">{univ?.nom}</h2>
            <p className="text-sm text-ardoise">{form?.intitule} · {form?.niveau}</p>
            <div className="my-4 rule-or" aria-hidden />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ardoise">Référence</dt><dd className="font-mono text-encre">{d.reference}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Conseiller</dt><dd className="text-encre">{d.conseillerNom}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Statut actuel</dt><dd className="text-encre">Pré-admission accordée</dd></div>
            </dl>
            <div className="mt-4 border-t border-ligne pt-4">
              <div className="flex items-end justify-between">
                <span className="text-sm text-ardoise">Montant à régler</span>
                <span className="font-mono text-2xl font-bold text-lapis">{formatFCFA(total)}</span>
              </div>
              {tranches && <p className="mt-1 text-xs text-ardoise">Soit {formatFCFA(tranche1)} aujourd'hui.</p>}
            </div>
          </Card>
        </div>
      )}

      {/* Historique */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="border-b border-ligne px-6 py-4">
          <p className="eyebrow">Historique des paiements</p>
          <h2 className="font-display text-lg font-bold text-encre">Vos transactions</h2>
        </div>
        {d.paiements.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-ardoise">Aucun paiement pour l'instant. Votre historique apparaîtra ici.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Date</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Moyen</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Montant</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.paiements.map((p) => (
                <TableRow key={p.id} className="border-ligne">
                  <TableCell className="font-mono text-xs text-encre">{p.reference}</TableCell>
                  <TableCell className="text-sm text-encre">{formatDate(p.date)}</TableCell>
                  <TableCell className="text-sm text-encre">{p.moyen}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-encre">{formatFCFA(p.montant)}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">{p.statut}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
