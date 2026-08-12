"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { FormPageSkeleton } from "@/components/ui/skeleton-card";
import { getApiErrorMessageSync } from "@/lib/api-error";
import { apiJson } from "@/lib/api-client";
import { usePrimaryDossier, type EspaceDossierSummary } from "@/hooks/use-primary-dossier";
import { CheckCircle2, Download, Loader2, Lock, CreditCard, Smartphone, ShieldCheck, AlertCircle, Clock, FolderOpen, ArrowRight, Trash2 } from "lucide-react";


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
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <PaiementInner />
    </Suspense>
  );
}

function PaiementInner() {
  const searchParams = useSearchParams();
  const preferredId = searchParams.get("dossierId");
  const {
    dossier: primaryDossier,
    loading: dossierLoading,
    error: dossierError,
    refetch: refetchDossier,
  } = usePrimaryDossier(preferredId);
  const dossier = primaryDossier;
  const loading = dossierLoading;
  const error = dossierError;
  const [methods, setMethods] = React.useState<MoyenPaiement[]>([]);
  const [methodsLoading, setMethodsLoading] = React.useState(true);
  const [methodsError, setMethodsError] = React.useState<string | null>(null);
  const [method, setMethod] = React.useState("");
  const [tranches, setTranches] = React.useState(false);
  const [tranchesAutorisees, setTranchesAutorisees] = React.useState(true);
  const [status, setStatus] = React.useState<"idle" | "loading" | "pending" | "success">("idle");
  const [receiptRef, setReceiptRef] = React.useState<string>("");
  const [lastPaiementId, setLastPaiementId] = React.useState<string>("");
  const [lastMontant, setLastMontant] = React.useState(0);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const loadMoyens = React.useCallback(() => {
    setMethodsLoading(true);
    setMethodsError(null);
    fetch("/api/public/moyens-paiement")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(
            getApiErrorMessageSync(r.status, body, "Impossible de charger les moyens de paiement."),
          );
        }
        return r.json();
      })
      .then((data: MoyenPaiement[]) => {
        const list = Array.isArray(data) ? data : [];
        setMethods(list);
        const first = list[0];
        if (first) setMethod(first.nom);
        setMethodsLoading(false);
      })
      .catch((e) => {
        setMethods([]);
        setMethodsError(
          getApiErrorMessageSync(e, undefined, "Impossible de charger les moyens de paiement."),
        );
        setMethodsLoading(false);
      });
  }, []);

  const loadDossier = React.useCallback(() => {
    void refetchDossier();
  }, [refetchDossier]);

  const supprimerPaiement = async (paiementId: string, reference: string) => {
    setDeletingId(paiementId);
    const result = await apiJson(`/api/paiements/${paiementId}`, "DELETE");
    setDeletingId(null);
    if (!result.ok) {
      toast.error("Suppression échouée", { description: result.error });
      return;
    }
    toast.success("Transaction supprimée", { description: reference });
    loadDossier();
  };

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      loadMoyens();

      fetch("/api/public/parametres")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { paiementTranches?: boolean } | null) => {
          if (cancelled || !data) return;
          const allowed = data.paiementTranches !== false;
          setTranchesAutorisees(allowed);
          if (!allowed) setTranches(false);
        })
        .catch(() => {
          /* paramètres optionnels — garder défauts */
        });

      const returnStatus = searchParams.get("status");
      if (returnStatus === "success") {
        setStatus("pending");
        toast.success("Retour du paiement", {
          description: "Confirmation en cours — le statut se mettra à jour automatiquement.",
        });
      } else if (returnStatus === "cancel") {
        toast.message("Paiement annulé", {
          description: "Vous pouvez réessayer quand vous voulez.",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadMoyens, searchParams]);

  if (loading) {
    return <FormPageSkeleton />;
  }

  if (error) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Chargement impossible</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          {error}{" "}
          <button type="button" className="font-medium text-lapis underline" onClick={loadDossier}>
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dossier) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-5 w-5" strokeWidth={1.5} />}
        title="Aucun dossier"
        description="Vous n'avez pas encore de dossier. Composez-le pour accéder au paiement."
        action={
          <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
            <Link href="/espace/dossier">Composer mon dossier</Link>
          </Button>
        }
      />
    );
  }

  const d: EspaceDossierSummary & {
    fraisAgence: number;
    paiements: NonNullable<EspaceDossierSummary["paiements"]>;
    candidat: NonNullable<EspaceDossierSummary["candidat"]>;
    universite: NonNullable<EspaceDossierSummary["universite"]>;
    formation: NonNullable<EspaceDossierSummary["formation"]> & { niveau?: string };
    mrz: string;
    reference: string;
  } = {
    ...dossier,
    fraisAgence: dossier.fraisAgence ?? 0,
    paiements: dossier.paiements ?? [],
    candidat: dossier.candidat ?? { prenom: "", nom: "" },
    universite: dossier.universite ?? { nom: "" },
    formation: dossier.formation ?? { intitule: "", niveau: "" },
    mrz: dossier.mrz ?? "",
    reference: dossier.reference ?? "",
  };
  const total = d.fraisAgence;
  const dejaPaye = d.paiements
    .filter((p) => p.statut === "reussi")
    .reduce((s, p) => s + p.montant, 0);
  const enAttenteMontant = d.paiements
    .filter((p) => p.statut === "en_attente")
    .reduce((s, p) => s + p.montant, 0);
  const reste = Math.max(0, total - dejaPaye);
  const estComplet = reste === 0 || d.paiementStatut === "complet";
  const tranche1 = Math.round(total / 2);
  const tranche2 = total - tranche1;
  const needsTranche2 = dejaPaye > 0 && reste > 0;
  const etatUpper = d.etat.toUpperCase();
  const hasPending = enAttenteMontant > 0;
  const canPay =
    !hasPending &&
    (etatUpper === "PAIEMENT_ATTENTE" ||
      d.paiementStatut === "partiel" ||
      needsTranche2);
  const selectedMethod = methods.find((m) => m.nom === method) ?? methods[0];

  const montantAPayer = (() => {
    if (estComplet) return 0;
    if (needsTranche2) return reste;
    if (tranches && tranchesAutorisees) return Math.min(tranche1, reste);
    return reste || total;
  })();

  const libelleTranche = needsTranche2
    ? "Tranche 2"
    : tranches && tranchesAutorisees
      ? "Tranche 1"
      : "Solde";

  const confirm = async () => {
    if (!selectedMethod || montantAPayer <= 0) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/paiements/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dossierId: d.id,
          montant: montantAPayer,
          moyen: selectedMethod.nom,
          tranche: libelleTranche,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du paiement");
      }
      setReceiptRef(data.paiement?.reference ?? "");
      setLastPaiementId(data.paiement?.id ?? "");
      setLastMontant(montantAPayer);

      if (data.redirectUrl) {
        const redirectUrl = data.redirectUrl as string;
        toast.message("Redirection vers le paiement sécurisé…");
        window.open(redirectUrl, "_self");
        return;
      }

      if (data.pending === false) {
        setStatus("success");
        toast.success("Paiement confirmé", {
          description: "Votre reçu est disponible au téléchargement.",
        });
      } else {
        setStatus("pending");
        toast.success("Paiement enregistré", {
          description: "En cours de validation par l'agence.",
        });
      }
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
        <p className="text-ardoise">
          Déclarez un paiement déjà effectué (Mobile Money, Wave, virement ou espèces) : votre reçu
          est généré automatiquement dès l&apos;enregistrement, sans attente.
          {process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_ENABLED === "true"
            ? " Le paiement en ligne sécurisé est aussi disponible ci-dessous."
            : ""}
        </p>
      </div>

      {status === "pending" ? (
        <Card className="border-ambre/40 bg-ambre/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ambre/15">
            <Clock className="h-7 w-7 text-ambre" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-2xl font-bold text-encre">Paiement en cours de validation.</h2>
          <p className="mt-1 text-sm text-ardoise">
            Votre déclaration a été enregistrée. L&apos;agence confirmera l&apos;encaissement sous peu. Le reçu sera disponible une fois le paiement validé.
          </p>
          <div className="mx-auto mt-6 max-w-md rounded-md border border-ligne bg-card p-5 text-left">
            <div className="flex items-center justify-between border-b border-ligne pb-3">
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</span>
              <span className="font-mono text-xs font-semibold text-encre">{receiptRef}</span>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ardoise">Moyen</dt><dd className="text-encre">{selectedMethod?.nom ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Montant</dt><dd className="font-mono font-semibold text-lapis">{formatFCFA(lastMontant)}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Statut</dt><dd className="capitalize text-ambre">en attente</dd></div>
            </dl>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
              <Link href="/espace">Suivre mon dossier</Link>
            </Button>
            <Button variant="ghost" onClick={() => setStatus("idle")}>
              Voir l&apos;historique
            </Button>
          </div>
        </Card>
      ) : status === "success" ? (
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

          <div className="mx-auto mt-6 max-w-md rounded-md border border-ligne bg-card p-5 text-left">
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
              <div className="flex justify-between border-t border-ligne pt-2 mt-2"><dt className="font-semibold text-encre">Montant</dt><dd className="font-mono text-lg font-bold text-lapis">{formatFCFA(lastMontant)}</dd></div>
            </dl>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/recu/${lastPaiementId}?format=pdf`, "_blank")}
              disabled={!lastPaiementId}
            >
              <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Télécharger le reçu
            </Button>
            <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
              <Link href="/espace">
                Tableau de bord <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </Button>
            {(d.etat.toUpperCase() === "ATTESTATION" ||
              d.etat.toUpperCase() === "CLOTURE" ||
              d.etat.toUpperCase() === "PRE_ADMISSION") && (
              <Button asChild variant="outline">
                <Link href="/espace/attestation">Suivre l&apos;attestation</Link>
              </Button>
            )}
            <Button variant="ghost" onClick={() => setStatus("idle")}>
              Voir l&apos;historique
            </Button>
          </div>
        </Card>
      ) : estComplet ? (
        <Alert className="border-vert/30 bg-vert/5">
          <CheckCircle2 className="h-4 w-4 text-vert" />
          <AlertTitle className="font-display text-sm font-bold text-encre">Frais d&apos;agence soldés</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-sm text-ardoise">
            <span>
              {formatFCFA(dejaPaye)} encaissés sur {formatFCFA(total)}. Consultez vos reçus ci-dessous.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-lapis text-blanc hover:bg-lapis/90">
                <Link href="/espace">Retour au tableau de bord</Link>
              </Button>
              {(etatUpper === "ATTESTATION" ||
                etatUpper === "CLOTURE" ||
                etatUpper === "PRE_ADMISSION") && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/espace/attestation">Voir l&apos;attestation</Link>
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ) : hasPending ? (
        <Alert className="border-ambre/40 bg-ambre/5">
          <Clock className="h-4 w-4 text-ambre" strokeWidth={1.5} />
          <AlertTitle className="font-display text-sm font-bold text-encre">Paiement en cours de validation</AlertTitle>
          <AlertDescription className="text-sm text-ardoise">
            {formatFCFA(enAttenteMontant)} en attente de confirmation par l&apos;agence. Vous pourrez payer le solde après validation.
          </AlertDescription>
        </Alert>
      ) : !canPay ? (
        <EmptyState
          icon={<Lock className="h-5 w-5" strokeWidth={1.5} />}
          title="Paiement pas encore ouvert"
          description={
            etatUpper === "BROUILLON" || etatUpper === "CORRECTION"
              ? "Finalisez et soumettez votre dossier. Le paiement des frais d'agence s'ouvrira ensuite."
              : "Votre dossier n'est pas encore en phase paiement. Votre conseiller vous indiquera quand régler les frais."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {(etatUpper === "BROUILLON" || etatUpper === "CORRECTION") && (
                <Button asChild className="bg-lapis text-blanc hover:bg-lapis/90">
                  <Link href="/espace/dossier">Continuer mon dossier</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/espace">Tableau de bord</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: form */}
          <div className="space-y-4">
            <Card className="border-ligne bg-card p-6">
              <p className="eyebrow">Moyen de paiement</p>
              {methodsLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-ardoise">
                  <Loader2 className="h-4 w-4 animate-spin text-lapis" strokeWidth={1.5} />
                  Chargement des moyens de paiement…
                </div>
              ) : methodsError ? (
                <Alert className="mt-4 border-carmin/40 bg-carmin/5">
                  <AlertCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
                  <AlertTitle className="text-sm font-bold">Moyens de paiement indisponibles</AlertTitle>
                  <AlertDescription className="text-sm text-ardoise">
                    {methodsError}{" "}
                    <button
                      type="button"
                      className="font-medium text-lapis underline"
                      onClick={loadMoyens}
                    >
                      Réessayer
                    </button>
                  </AlertDescription>
                </Alert>
              ) : methods.length === 0 ? (
                <EmptyState
                  className="mt-4 py-8"
                  title="Aucun moyen configuré"
                  description="Contactez l'agence — aucun moyen de paiement n'est disponible pour le moment."
                />
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.nom)}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md border-2 p-3 text-left transition-all",
                        method === m.nom ? "border-lapis bg-lapis/5" : "border-ligne bg-card hover:border-lapis/30"
                      )}
                      aria-pressed={method === m.nom}
                    >
                      <span className={cn("flex h-9 w-9 flex-none items-center justify-center rounded-md text-blanc", m.couleur)}>
                        {iconForMoyen(m.icone)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-encre">{m.nom}</span>
                        <span className="block text-[10px] text-ardoise">Confirmation immédiate</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {tranchesAutorisees && !needsTranche2 && (
                <div className="mt-5 flex items-center justify-between rounded-md border border-ligne bg-porcelaine p-3">
                  <div>
                    <Label htmlFor="tranches" className="text-sm font-medium text-encre">Payer en plusieurs tranches</Label>
                    <p className="text-xs text-ardoise">Deux versements égaux (paramétrable par l&apos;agence).</p>
                  </div>
                  <Switch id="tranches" checked={tranches} onCheckedChange={setTranches} />
                </div>
              )}

              {needsTranche2 && (
                <Alert className="mt-4 border-ambre/40 bg-ambre/5">
                  <AlertCircle className="h-4 w-4 text-ambre" />
                  <AlertTitle className="text-sm font-bold">Tranche 2 due</AlertTitle>
                  <AlertDescription className="text-xs text-ardoise">
                    Reste à payer : {formatFCFA(reste)} (déjà versé {formatFCFA(dejaPaye)}).
                  </AlertDescription>
                </Alert>
              )}

              {tranches && tranchesAutorisees && !needsTranche2 && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-ligne p-3">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Tranche 1 — aujourd&apos;hui</p>
                    <p className="mt-1 font-mono text-lg font-bold text-lapis">{formatFCFA(tranche1)}</p>
                  </div>
                  <div className="rounded-md border border-ligne p-3">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Tranche 2 — ensuite</p>
                    <p className="mt-1 font-mono text-lg font-bold text-ardoise">{formatFCFA(tranche2)}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card className="border-ligne bg-card p-6">
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
          <Card className="border-ligne bg-card p-6 lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">Récapitulatif</p>
            <h2 className="mt-1 font-display text-lg font-bold text-encre">{d.universite.nom}</h2>
            <p className="text-sm text-ardoise">{d.formation.intitule} · {d.formation.niveau}</p>
            <div className="my-4 rule-or" aria-hidden />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ardoise">Référence</dt><dd className="font-mono text-encre">{d.reference}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Conseiller</dt><dd className="text-encre">{d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté"}</dd></div>
              <div className="flex justify-between"><dt className="text-ardoise">Statut paiement</dt><dd className="text-encre capitalize">{d.paiementStatut ?? "aucun"}</dd></div>
            </dl>
            <div className="mt-4 border-t border-ligne pt-4">
              <div className="flex items-end justify-between">
                <span className="text-sm text-ardoise">Montant à régler</span>
                <span className="font-mono text-2xl font-bold text-lapis">{formatFCFA(montantAPayer)}</span>
              </div>
              {(tranches || needsTranche2) && (
                <p className="mt-1 text-xs text-ardoise">{libelleTranche} · Total dossier {formatFCFA(total)}</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Historique */}
      <Card className="border-ligne bg-card p-0 overflow-hidden">
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
                    <Badge
                      className={cn(
                        "font-mono text-[10px] uppercase",
                        p.statut === "reussi" && "bg-vert/10 text-vert",
                        p.statut === "en_attente" && "bg-ambre/10 text-ambre",
                        p.statut === "echoue" && "bg-carmin/10 text-carmin",
                        p.statut === "rembourse" && "bg-ardoise/10 text-ardoise",
                        !["reussi", "en_attente", "echoue", "rembourse"].includes(p.statut) && "bg-ardoise/10 text-ardoise"
                      )}
                    >
                      {p.statut.replace(/_/g, " ")}
                    </Badge>
                    {p.statut === "reussi" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-7 px-2 text-xs"
                        onClick={() => window.open(`/api/recu/${p.id}?format=pdf`, "_blank")}
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-7 px-2 text-xs text-carmin hover:bg-carmin/10 hover:text-carmin"
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette transaction ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La transaction {p.reference} ({formatFCFA(p.montant)}) sera définitivement
                            supprimée. Le statut de paiement de votre dossier sera recalculé.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-carmin text-blanc hover:bg-carmin/90"
                            onClick={() => void supprimerPaiement(p.id, p.reference)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
