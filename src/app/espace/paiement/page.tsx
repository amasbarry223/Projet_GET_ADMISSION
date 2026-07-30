"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle2, Download, Loader2, Lock, CreditCard, Smartphone, ShieldCheck, AlertCircle } from "lucide-react";

type Dossier = {
  id: string;
  reference: string;
  etat: string;
  fraisAgence: number;
  mrz: string;
  candidat: { prenom: string; nom: string };
  universite: { nom: string };
  formation: { intitule: string; niveau: string };
  conseiller: { prenom: string; nom: string } | null;
  paiements: { id: string; reference: string; date: string; montant: number; moyen: string; statut: string; tranche?: string | null }[];
};

type MoyenPaiement = {
  id: number;
  nom: string;
  couleur: string;
  icone: string;
  actif: boolean;
  ordre: number;
};

function iconForMoyen(name: string) {
  if (name === "CreditCard") return <CreditCard className="h-4 w-4" strokeWidth={1.5} />;
  return <Smartphone className="h-4 w-4" strokeWidth={1.5} />;
}

export default function PaiementPage() {
  const [dossier, setDossier] = React.useState<Dossier | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [methods, setMethods] = React.useState<MoyenPaiement[]>([]);
  const [methodsLoading, setMethodsLoading] = React.useState(true);
  const [method, setMethod] = React.useState("");
  const [tranches, setTranches] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "loading" | "success">("idle");
  const [receiptRef, setReceiptRef] = React.useState<string>("");

  const loadDossier = React.useCallback(() => {
    setLoading(true);
    fetch("/api/dossiers")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Dossier[]) => {
        setDossier(data[0] ?? null);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        setError("Impossible de charger votre dossier.");
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    loadDossier();
    fetch("/api/public/moyens-paiement")
      .then((r) => r.json())
      .then((data: MoyenPaiement[]) => {
        const list = Array.isArray(data) ? data : [];
        setMethods(list);
        if (list.length > 0) setMethod(list[0].nom);
        setMethodsLoading(false);
      })
      .catch(() => setMethodsLoading(false));
  }, [loadDossier]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <Alert className="border-ambre/40 bg-ambre/5">
        <AlertCircle className="h-4 w-4 text-ambre" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Aucun dossier</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Vous n'avez pas encore de dossier.{" "}
          <Link href="/espace/dossier" className="font-medium text-lapis-clair hover:underline">
            Créer mon dossier
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const d = dossier;
  const total = d.fraisAgence;
  const tranche1 = Math.round(total / 2);
  const tranche2 = total - tranche1;
  const selectedMethod = methods.find((m) => m.nom === method) ?? methods[0];

  const confirm = async () => {
    if (!selectedMethod) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossierId: d.id,
          montant: tranches ? tranche1 : total,
          moyen: selectedMethod.nom,
          tranche: tranches ? "Tranche 1" : "Solde",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du paiement");
      }
      setReceiptRef(data.paiement?.reference ?? `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 9999).toString().padStart(4, "0")}`);
      setStatus("success");
      toast.success("Paiement confirmé", {
        description: `${formatFCFA(tranches ? tranche1 : total)} · ${selectedMethod.nom}`,
      });
      // Re-fetch le dossier pour mettre à jour l'historique
      loadDossier();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors du paiement";
      toast.error("Paiement échoué", { description: msg });
      setStatus("idle");
    }
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
          <div className="relative mx-auto mb-4 h-28 w-28">
            <Image
              src="/images/payment-success.png"
              alt="Paiement confirmé"
              fill
              className="object-contain"
              sizes="112px"
              priority
            />
          </div>
          <h2 className="font-display text-2xl font-bold text-encre">Paiement confirmé.</h2>
          <p className="mt-1 text-sm text-ardoise">Votre paiement a bien été reçu. Le reçu est disponible ci-dessous.</p>

          <div className="mx-auto mt-6 max-w-md rounded-md border border-ligne bg-blanc p-5 text-left">
            <div className="flex items-center justify-between border-b border-ligne pb-3">
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Reçu</span>
              <span className="font-mono text-xs font-semibold text-encre">{receiptRef}</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ardoise">Date</dt><dd className="font-mono text-encre">{formatDateTime(new Date().toISOString())}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Candidat</dt><dd className="text-encre">{d.candidat.prenom} {d.candidat.nom}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Référence dossier</dt><dd className="font-mono text-encre">{d.reference}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Université</dt><dd className="text-encre">{d.universite.nom}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Moyen</dt><dd className="text-encre">{selectedMethod?.nom ?? "—"}</dd></div>
              <div className="flex justify-between border-t border-ligne pt-2 mt-2"><dt className="font-semibold text-encre">Montant</dt><dd className="font-mono text-lg font-bold text-lapis">{formatFCFA(tranches ? tranche1 : total)}</dd></div>
            </dl>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={() => toast.success("Reçu téléchargé", { description: `${receiptRef.toLowerCase()}.pdf` })}>
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
              {methodsLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-ardoise">
                  <Loader2 className="h-4 w-4 animate-spin text-lapis" strokeWidth={1.5} />
                  Chargement des moyens de paiement…
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.nom)}
                      className={cn(
                        "flex items-center gap-3 rounded-md border-2 p-3 text-left transition-all",
                        method === m.nom ? "border-lapis bg-lapis/5" : "border-ligne bg-blanc hover:border-lapis/30"
                      )}
                      aria-pressed={method === m.nom}
                    >
                      <span className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-md text-blanc", m.couleur)}>
                        {iconForMoyen(m.icone)}
                      </span>
                      <span className="text-sm font-medium text-encre">{m.nom}</span>
                    </button>
                  ))}
                </div>
              )}

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
              <Button className="mt-4 w-full bg-lapis text-blanc hover:bg-lapis/90" size="lg" onClick={confirm} disabled={status === "loading" || methodsLoading || !selectedMethod}>
                {status === "loading" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement…</> : <><Lock className="mr-2 h-4 w-4" strokeWidth={1.5} /> Confirmer le paiement</>}
              </Button>
            </Card>
          </div>

          {/* Right: summary */}
          <Card className="border-ligne bg-blanc p-6 lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">Récapitulatif</p>
            <h2 className="mt-1 font-display text-lg font-bold text-encre">{d.universite.nom}</h2>
            <p className="text-sm text-ardoise">{d.formation.intitule} · {d.formation.niveau}</p>
            <div className="my-4 rule-or" aria-hidden />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ardoise">Référence</dt><dd className="font-mono text-encre">{d.reference}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Conseiller</dt><dd className="text-encre">{d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté"}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Statut actuel</dt><dd className="text-encre">Pré-admission accordée</dd></div>
            </dl>
            <div className="mt-4 border-t border-ligne pt-4">
              <div className="flex items-end justify-between">
                <span className="text-sm text-ardoise">Montant à régler</span>
                <span className="font-mono text-2xl font-bold text-lapis">{formatFCFA(tranches ? tranche1 : total)}</span>
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
