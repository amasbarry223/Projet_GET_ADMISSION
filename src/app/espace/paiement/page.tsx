"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFCFA, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { FormPageSkeleton } from "@/components/ui/skeleton-card";
import { apiJson } from "@/lib/api-client";
import { usePrimaryDossier, type EspaceDossierSummary } from "@/hooks/use-primary-dossier";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  ShieldCheck,
  AlertCircle,
  Clock,
  FolderOpen,
  ArrowRight,
  Trash2,
  RotateCcw,
  MessageSquare,
  Banknote,
} from "lucide-react";

export default function PaiementPage() {
  return (
    <Suspense fallback={<FormPageSkeleton />}>
      <PaiementInner />
    </Suspense>
  );
}

function PaiementInner() {
  const router = useRouter();
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

  const [tranches, setTranches] = React.useState(false);
  const [tranchesAutorisees, setTranchesAutorisees] = React.useState(true);
  const [redirectingToChat, setRedirectingToChat] = React.useState(false);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [refundingPaiement, setRefundingPaiement] = React.useState<{
    id: string;
    reference: string;
    montant: number;
  } | null>(null);
  const [refundMotif, setRefundMotif] = React.useState("");
  const [submittingRefund, setSubmittingRefund] = React.useState(false);


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

  const soumettreDemandeRemboursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingPaiement) return;

    setSubmittingRefund(true);
    const result = await apiJson(
      `/api/paiements/${refundingPaiement.id}/demande-remboursement`,
      "POST",
      { motif: refundMotif.trim() || undefined },
    );
    setSubmittingRefund(false);

    if (!result.ok) {
      toast.error("Demande échouée", { description: result.error });
      return;
    }

    toast.success("Demande de remboursement transmise", {
      description: "Notre équipe financière examinera votre demande et reviendra vers vous.",
    });
    setRefundingPaiement(null);
    setRefundMotif("");
    loadDossier();
  };

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      fetch("/api/public/parametres")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { paiementTranches?: boolean } | null) => {
          if (cancelled || !data) return;
          const allowed = data.paiementTranches !== false;
          setTranchesAutorisees(allowed);
          if (!allowed) setTranches(false);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Action de paiement : envoi d'un message pré-écrit dans la messagerie et redirection
  const handlePayerHorsPlateforme = async () => {
    if (montantAPayer <= 0) return;
    setRedirectingToChat(true);

    const messageTexte = `Bonjour, je souhaite procéder au règlement des frais d'agence pour mon dossier ${d.reference} (${d.formation.intitule} - ${d.universite.nom}) d'un montant de ${formatFCFA(montantAPayer)} (${libelleTranche}). Pourriez-vous m'indiquer les modalités et coordonnées de paiement hors plateforme (espèces à l'agence, virement bancaire ou Mobile Money direct) ?`;

    try {
      const form = new FormData();
      form.set("dossierId", d.id);
      form.set("texte", messageTexte);

      const res = await fetch("/api/messages", { method: "POST", body: form });
      if (!res.ok) {
        // En cas d'erreur de requête automatique, redirection avec message pré-rempli dans l'URL
        router.push(`/espace/messages?dossierId=${encodeURIComponent(d.id)}&prefill=${encodeURIComponent(messageTexte)}`);
        return;
      }

      toast.success("Demande de règlement transmise", {
        description: "Votre conseiller a été notifié dans votre messagerie. Convenez ensemble des modalités de paiement.",
      });

      router.push(`/espace/messages?dossierId=${encodeURIComponent(d.id)}`);
    } catch {
      router.push(`/espace/messages?dossierId=${encodeURIComponent(d.id)}&prefill=${encodeURIComponent(messageTexte)}`);
    } finally {
      setRedirectingToChat(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Paiement & reçus</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Règlement des frais d&apos;agence.
        </h1>
        <p className="text-ardoise">
          Les paiements s&apos;effectuent hors plateforme directement auprès de GET Admission (espèces en agence, virement bancaire ou Mobile Money direct).
        </p>
      </div>

      {estComplet ? (
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
            {formatFCFA(enAttenteMontant)} en attente de confirmation par l&apos;agence. Dès constatation de l&apos;encaissement par le staff, votre dossier sera validé.
          </AlertDescription>
        </Alert>
      ) : !canPay ? (
        <EmptyState
          icon={<Lock className="h-5 w-5" strokeWidth={1.5} />}
          title="Paiement pas encore ouvert"
          description={
            etatUpper === "BROUILLON" || etatUpper === "CORRECTION"
              ? "Finalisez et soumettez votre dossier. Le paiement des frais d'agence s'ouvrira après vérification staff."
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
          {/* Left: Instructions & button */}
          <div className="space-y-4">
            <Card className="border-ligne bg-card p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-lapis/10 text-lapis">
                  <Banknote className="h-6 w-6" strokeWidth={1.5} />
                </div>
                <div className="space-y-1">
                  <p className="eyebrow text-lapis">Modalités de règlement</p>
                  <h3 className="font-display text-lg font-bold text-encre">Paiement direct hors plateforme</h3>
                  <p className="text-sm text-ardoise leading-relaxed">
                    Le règlement de vos frais s&apos;effectue directement auprès de GET Admission. Cliquez sur <strong>« Payer / Contacter mon conseiller »</strong> pour ouvrir votre fil de discussion avec les détails de votre dossier pré-remplis.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-ligne bg-porcelaine/60 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ardoise">
                  Options de règlement disponibles :
                </p>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div className="rounded-md border border-ligne bg-card p-3">
                    <p className="text-xs font-semibold text-encre">🏢 Espèces à l&apos;agence</p>
                    <p className="mt-1 text-[11px] text-ardoise">Règlement au guichet GET Admission avec remise de reçu immédiate.</p>
                  </div>
                  <div className="rounded-md border border-ligne bg-card p-3">
                    <p className="text-xs font-semibold text-encre">🏦 Virement bancaire</p>
                    <p className="mt-1 text-[11px] text-ardoise">Virement sur le compte officiel de l&apos;agence (RIB transmis par conseiller).</p>
                  </div>
                  <div className="rounded-md border border-ligne bg-card p-3">
                    <p className="text-xs font-semibold text-encre">📱 Mobile Money direct</p>
                    <p className="mt-1 text-[11px] text-ardoise">Wave ou Orange Money direct sur le numéro marchand officiel de l&apos;agence.</p>
                  </div>
                </div>
              </div>

              {tranchesAutorisees && !needsTranche2 && (
                <div className="flex items-center justify-between rounded-md border border-ligne bg-porcelaine p-3">
                  <div>
                    <Label htmlFor="tranches" className="text-sm font-medium text-encre">Payer en 2 tranches</Label>
                    <p className="text-xs text-ardoise">Réglez la moitié ({formatFCFA(tranche1)}) maintenant et le solde ultérieurement.</p>
                  </div>
                  <Switch id="tranches" checked={tranches} onCheckedChange={setTranches} />
                </div>
              )}

              {needsTranche2 && (
                <Alert className="border-ambre/40 bg-ambre/5">
                  <AlertCircle className="h-4 w-4 text-ambre" />
                  <AlertTitle className="text-sm font-bold">Tranche 2 due</AlertTitle>
                  <AlertDescription className="text-xs text-ardoise">
                    Reste à payer : {formatFCFA(reste)} (déjà versé {formatFCFA(dejaPaye)}).
                  </AlertDescription>
                </Alert>
              )}

              {tranches && tranchesAutorisees && !needsTranche2 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-ligne p-3">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Tranche 1 — à régler</p>
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
                Accompagnement humain · Votre conseiller enregistre et valide votre paiement dès réception.
              </div>
              <Button
                className="mt-4 w-full bg-lapis text-blanc hover:bg-lapis/90 h-12 text-base font-semibold shadow-sm"
                size="lg"
                onClick={handlePayerHorsPlateforme}
                disabled={redirectingToChat}
              >
                {redirectingToChat ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Transmission à votre conseiller…
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-5 w-5" strokeWidth={1.5} />
                    Payer les frais ({formatFCFA(montantAPayer)}) — Contacter mon conseiller
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
                  </>
                )}
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
              <div className="flex justify-between"><dt className="text-ardoise">Référence dossier</dt><dd className="font-mono text-encre">{d.reference}</dd></div>
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
          <h2 className="font-display text-lg font-bold text-encre">Vos transactions enregistrées</h2>
        </div>
        {d.paiements.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-ardoise">Aucun paiement enregistré pour l&apos;instant. Vos règlements constatés par l&apos;agence apparaîtront ici.</p>
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
                        p.statut === "rembourse" && "bg-purple-500/10 text-purple-600 border border-purple-200",
                        !["reussi", "en_attente", "echoue", "rembourse"].includes(p.statut) && "bg-ardoise/10 text-ardoise"
                      )}
                    >
                      {p.statut === "rembourse" ? "Remboursé" : p.statut.replace(/_/g, " ")}
                    </Badge>
                    {p.statut === "reussi" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-7 px-2 text-xs"
                          title="Télécharger le reçu (PDF)"
                          onClick={() => window.open(`/api/recu/${p.id}?format=pdf`, "_blank")}
                        >
                          <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-7 px-2 text-xs text-ardoise hover:text-encre hover:bg-porcelaine"
                          title="Demander un remboursement"
                          onClick={() => {
                            setRefundingPaiement({
                              id: p.id,
                              reference: p.reference,
                              montant: p.montant,
                            });
                            setRefundMotif("");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                    {p.statut !== "reussi" && p.statut !== "rembourse" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-7 px-2 text-xs text-carmin hover:bg-carmin/10 hover:text-carmin"
                            title="Supprimer cette saisie"
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Demande de Remboursement */}
      <Dialog
        open={Boolean(refundingPaiement)}
        onOpenChange={(open) => {
          if (!open && !submittingRefund) setRefundingPaiement(null);
        }}
      >
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-encre">
              Demander un remboursement
            </DialogTitle>
            <DialogDescription className="text-sm text-ardoise">
              Vous sollicitez le remboursement de la transaction{" "}
              <strong className="font-mono text-encre">{refundingPaiement?.reference}</strong>{" "}
              d&apos;un montant de{" "}
              <strong className="font-mono text-encre">
                {refundingPaiement ? formatFCFA(refundingPaiement.montant) : ""}
              </strong>
              . Cette demande sera instruite par notre équipe financière.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={soumettreDemandeRemboursement} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-encre">
                Motif de la demande <span className="text-xs text-ardoise">(optionnel)</span>
              </Label>
              <Textarea
                value={refundMotif}
                onChange={(e) => setRefundMotif(e.target.value)}
                placeholder="Ex. : Annulation de candidature, double règlement..."
                className="resize-none text-sm"
                rows={3}
                maxLength={300}
                disabled={submittingRefund}
              />
              <p className="text-right text-[11px] text-ardoise">{refundMotif.length}/300</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundingPaiement(null)}
                disabled={submittingRefund}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-lapis text-blanc hover:bg-lapis/90"
                disabled={submittingRefund}
              >
                {submittingRefund ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Envoi…
                  </>
                ) : (
                  "Transmettre la demande"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
