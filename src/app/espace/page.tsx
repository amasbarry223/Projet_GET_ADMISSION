"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/site/motion-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KpiCard, ChartSectionHeader } from "@/components/admin/kpi-card";
import { TimelinePassage } from "@/components/espace/timeline-passage";
import { ETATS, etatParCode } from "@/lib/etats";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import {
  CreditCard,
  MessageSquare,
  Stamp,
  ArrowRight,
  CheckCircle2,
  MapPin,
  GraduationCap,
  FileText,
  Wallet,
  AlertCircle,
  Radio,
  ChevronDown,
} from "lucide-react";
import { EspaceDashboardSkeleton } from "@/components/ui/skeleton-card";
import { cn } from "@/lib/utils";
import { useDossierLive, type LiveStatus } from "@/hooks/use-dossier-live";

function liveLabel(status: LiveStatus): { text: string; tone: string } {
  if (status === "live") return { text: "Temps réel", tone: "bg-primary/15 text-primary border-primary/25" };
  if (status === "polling") return { text: "Actualisation auto", tone: "bg-ambre/15 text-ambre border-ambre/25" };
  if (status === "offline") return { text: "Hors ligne", tone: "bg-destructive/10 text-destructive border-destructive/20" };
  return { text: "Connexion…", tone: "bg-muted text-muted-foreground border-border" };
}

type CandidateNextAction = {
  titre: string;
  desc: string;
  href: string;
  cta: string;
};

function getNextCandidateAction(params: {
  etatUpper: string;
  etatInfo: { libelle: string; description: string };
  payePartiel: boolean;
  fraisAgence: number;
  universiteNom: string;
  attestationPret: boolean;
  motifCorrection?: string | null;
}): CandidateNextAction {
  const { etatUpper, etatInfo, payePartiel, fraisAgence, universiteNom, attestationPret, motifCorrection } =
    params;

  if (etatUpper === "BROUILLON") {
    return {
      titre: "Finalisez votre dossier",
      desc: "Complétez les étapes du formulaire et soumettez pour entrer en file de traitement.",
      href: "/espace/dossier",
      cta: "Continuer mon dossier",
    };
  }
  if (etatUpper === "CORRECTION") {
    return {
      titre: "Corrections demandées",
      desc: motifCorrection
        ? `Votre conseiller a renvoyé le dossier : « ${motifCorrection} »`
        : "Votre conseiller a renvoyé le dossier. Corrigez les pièces concernées puis renvoyez.",
      href: "/espace/dossier",
      cta: "Corriger mon dossier",
    };
  }
  if (etatUpper === "PAIEMENT_ATTENTE" || payePartiel) {
    return {
      titre: payePartiel ? "Solde de paiement restant" : "Paiement des frais d'agence",
      desc: `Réglez ${formatFCFA(fraisAgence)} pour poursuivre le traitement.`,
      href: "/espace/paiement",
      cta: payePartiel ? "Payer la suite" : "Payer maintenant",
    };
  }
  if (etatUpper === "PRE_ADMISSION") {
    return {
      titre: "Pré-admission accordée",
      desc: `${universiteNom} a accepté votre candidature. L'attestation sera émise prochainement.`,
      href: "/espace/attestation",
      cta: "Suivre l'attestation",
    };
  }
  if (attestationPret) {
    return {
      titre: "Attestation disponible",
      desc: "Votre attestation de pré-inscription est prête à télécharger ou à retirer.",
      href: "/espace/attestation",
      cta: "Voir l'attestation",
    };
  }
  if (etatUpper === "REFUSE") {
    return {
      titre: "Candidature non retenue",
      desc: "Votre candidature n'a pas abouti pour cette formation. Vous pouvez déposer une nouvelle candidature (Privée ou Publique) sans ressaisir vos pièces.",
      href: "/espace/dossier?nouvelle=true",
      cta: "Déposer une nouvelle candidature",
    };
  }
  return {
    titre: etatInfo.libelle,
    desc: etatInfo.description,
    href: "/espace/dossier",
    cta: "Voir mon dossier",
  };
}

export default function EspaceDashboard() {
  return (
    <Suspense fallback={<EspaceDashboardSkeleton />}>
      <EspaceDashboardInner />
    </Suspense>
  );
}

function EspaceDashboardInner() {
  const searchParams = useSearchParams();
  const dossierIdParam = searchParams.get("dossierId");
  const { dossier, allDossiers, loading, error, liveStatus, lastSyncedAt, refresh } = useDossierLive({
    dossierId: dossierIdParam,
  });
  const liveMeta = liveLabel(liveStatus);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [correctionHistOpen, setCorrectionHistOpen] = React.useState(false);

  if (loading) {
    return <EspaceDashboardSkeleton />;
  }

  if (error && !dossier) {
    return (
      <Alert className="border-destructive/40 bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-foreground">Connexion impossible</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {error}{" "}
          <button type="button" className="font-medium text-primary underline" onClick={() => void refresh()}>
            Réessayer
          </button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!dossier) {
    return (
      <Card className="border-border bg-card/60 backdrop-blur p-8 shadow-sm">
        <p className="eyebrow text-primary">Premier pas</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">Composez votre dossier.</h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Vous n&apos;avez pas encore de dossier. En trois étapes, vous démarrez votre candidature avec un conseiller dédié.
        </p>
        <ol className="mt-6 space-y-3">
          {[
            "Choisissez une université partenaire et une formation",
            "Renseignez vos informations et téléversez vos pièces",
            "Soumettez — votre conseiller prend le relais",
          ].map((label, i) => (
            <li key={label} className="flex items-start gap-3 text-sm text-foreground">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-2">
          <MotionButton asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/espace/dossier">
              Composer mon dossier <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
            </Link>
          </MotionButton>
          <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
            <Link href="/universites">Parcourir les universités</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const d = dossier;
  const univ = d.universite;
  const form = d.formation;
  const nonLus = d.conversation?.nonLusCandidat ?? 0;
  const dateParEtat = new Map(d.historiques.map((h) => [h.etat.toLowerCase(), h.date]));
  const etatInfo = etatParCode(d.etat);
  const workflowStep = etatInfo.ordre;
  const noteCourante = [...d.historiques]
    .reverse()
    .find((h) => h.etat.toLowerCase() === d.etat.toLowerCase())?.note;
  const etatUpper = d.etat.toUpperCase();
  const payeComplet = d.paiementStatut === "complet";
  const payePartiel = d.paiementStatut === "partiel";
  const attestationPret = etatUpper === "ATTESTATION" || etatUpper === "CLOTURE";
  const coverSrc = univ.coverUrl || "/images/campus-sorbonne.jpg";

  const demandesCorrection = d.demandesCorrection ?? [];
  const motifCorrectionActuel = demandesCorrection[0]?.motif ?? null;
  const historiqueMotifs = demandesCorrection.slice(1);

  const prochaine = getNextCandidateAction({
    etatUpper,
    etatInfo,
    payePartiel,
    fraisAgence: d.fraisAgence,
    universiteNom: univ.nom,
    attestationPret,
    motifCorrection: motifCorrectionActuel,
  });

  const secondaryNotes: string[] = [];
  if (nonLus > 0) {
    secondaryNotes.push(`${nonLus} message(s) non lu(s)`);
  }
  if (liveStatus === "offline") {
    secondaryNotes.push("Connexion temps réel interrompue");
  }

  return (
    <div className="space-y-6">
      {/* Sélecteur de dossiers multiples si l'étudiant a plusieurs candidatures (ex: refusée + nouvelle en cours) */}
      {allDossiers.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/70 p-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" strokeWidth={1.5} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vos candidatures ({allDossiers.length}) :</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {allDossiers.map((item) => {
              const isActive = item.id === d.id;
              const itemEtat = etatParCode(item.etat);
              const isRefuse = item.etat.toUpperCase() === "REFUSE";
              return (
                <Link
                  key={item.id}
                  href={`/espace?dossierId=${item.id}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/70 text-foreground hover:bg-muted"
                  )}
                >
                  <span>{item.reference}</span>
                  <span className={cn(
                    "rounded px-1 py-0.2 font-mono text-[9px] uppercase",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : isRefuse ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                  )}>
                    {itemEtat.libelle}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bannière d'orientation dédiée en cas de refus */}
      {etatUpper === "REFUSE" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                <h2 className="font-display text-base font-bold text-foreground">
                  Possibilité de réorientation de votre dossier
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Cette université n&apos;a pas pu donner une suite favorable. Vous pouvez immédiatement soumettre une <strong>nouvelle candidature</strong> dans un autre établissement privé ou opter pour la <strong>procédure publique</strong>. Vos pièces déjà vérifiées sont automatiquement conservées.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap flex-none">
              <MotionButton asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href={`/espace/dossier?nouvelle=true&sourceId=${d.id}`}>
                  Nouvelle candidature <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              </MotionButton>
              <Button asChild size="sm" variant="outline" className="border-border">
                <Link href="/espace/messages">Conseiller</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hero = une seule next-action dominante */}
      <Card className="relative overflow-hidden border-primary/25 bg-card/60 p-0 shadow-sm backdrop-blur-md">
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="z-10 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-eyebrow text-primary">
                <span className="h-px w-6 bg-primary opacity-60" /> Réf. {d.reference}
              </span>
              <Badge className="border-primary/20 bg-primary/10 font-mono text-[11px] uppercase text-primary">
                <CheckCircle2 className="mr-1 h-3 w-3" strokeWidth={1.5} /> {etatInfo.libelle}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">Étape {workflowStep} / 12</span>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-eyebrow text-primary">Prochaine action</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {prochaine.titre}
            </h1>
            <p className="mt-2 max-w-md text-muted-foreground">{prochaine.desc}</p>
            <div className="mt-6">
              <MotionButton asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href={prochaine.href}>
                  {prochaine.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              </MotionButton>
            </div>
          </div>
          <div className="relative min-h-[180px] opacity-50 mix-blend-multiply lg:min-h-full">
            <Image
              src="/images/hero-dashboard.png"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-transparent lg:from-card/90" aria-hidden />
          </div>
        </div>
      </Card>

      {/* Alertes secondaires compactes / repliables */}
      {secondaryNotes.length > 0 && (
        <div className="rounded-md border border-border bg-muted/40">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
          >
            <span className="text-sm text-foreground">
              {secondaryNotes.join(" · ")}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 flex-none text-muted-foreground transition-transform", detailsOpen && "rotate-180")}
              strokeWidth={1.5}
            />
          </button>
          {detailsOpen && (
            <div className="space-y-2 border-t border-border px-4 py-3">
              {nonLus > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{nonLus} message(s) de votre conseiller</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/espace/messages">Ouvrir la messagerie</Link>
                  </Button>
                </div>
              )}
              {liveStatus === "offline" && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Le suivi live est hors ligne.</span>
                  <Button size="sm" variant="outline" onClick={() => void refresh()}>
                    Réessayer
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FileText} label="Étape du dossier" value={`${workflowStep}/12`} suffix={etatInfo.libelle} tone="bleu" />
        <KpiCard
          icon={Wallet}
          label="Frais d'agence"
          value={formatFCFACompact(d.fraisAgence)}
          suffix={payeComplet ? "Réglés" : payePartiel ? "Partiel" : "À régler"}
          tone={payeComplet ? "vert" : "jaune"}
        />
        <KpiCard icon={MessageSquare} label="Messages non lus" value={nonLus} suffix="conseillère" tone="jaune" />
        <KpiCard
          icon={Stamp}
          label="Attestation"
          value={attestationPret ? "Prête" : "—"}
          suffix={attestationPret ? "disponible" : "Non disponible"}
          tone={attestationPret ? "vert" : "violet"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden border-border bg-card/60 p-0 shadow-sm backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
            <ChartSectionHeader eyebrow="Suivi" title="Les 12 étapes de votre dossier" />
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("border font-mono text-[10px] uppercase tracking-wider", liveMeta.tone)}>
                <Radio className={cn("mr-1 h-3 w-3", liveStatus === "live" && "animate-pulse")} strokeWidth={2} />
                {liveMeta.text}
              </Badge>
              <Badge className="bg-primary/20 font-mono text-[11px] uppercase text-primary">
                Étape {workflowStep} / 12
              </Badge>
            </div>
          </div>
          {lastSyncedAt && (
            <p className="border-b border-border/60 px-6 py-2 font-mono text-[10px] text-muted-foreground">
              Dernière synchro {formatDate(lastSyncedAt.toISOString())} ·{" "}
              {lastSyncedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
          <div className="max-h-[640px] overflow-y-auto scroll-fine px-6 py-5">
            <TimelinePassage
              etats={ETATS}
              etapeActuelle={workflowStep}
              dateParEtat={dateParEtat}
              noteCourante={noteCourante ?? null}
              live={liveStatus === "live" || liveStatus === "polling"}
            />
          </div>
          <div className="border-t border-border px-6 py-3">
            <Link href="/espace/paiement" className="text-sm font-medium text-primary hover:underline">
              Voir l&apos;historique des paiements
            </Link>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden border-border bg-card/60 p-0 shadow-sm backdrop-blur-md">
            <div className="relative h-32">
              <Image
                src={coverSrc}
                alt={`Campus de ${univ?.nom}`}
                fill
                className="object-cover opacity-80"
                sizes="360px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/20" aria-hidden />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-eyebrow text-primary">Votre destination</p>
                  <p className="truncate font-display text-base font-bold text-foreground">{univ?.nom}</p>
                </div>
                <span className="text-2xl">{univ?.drapeau}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                <span>{univ?.ville}, {univ?.pays}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                <span className="truncate">{form?.intitule}</span>
              </div>
              {!univ?.estPlaceholder && (
                <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 text-primary hover:bg-primary/10 hover:text-primary">
                  <Link href={`/universites/${univ?.slug}`}>Voir l&apos;université <ArrowRight className="ml-1 h-3 w-3" strokeWidth={1.5} /></Link>
                </Button>
              )}
            </div>
          </Card>

          {etatUpper === "CORRECTION" && motifCorrectionActuel && (
            <Card className="border-primary/30 bg-primary/5 p-4 shadow-sm backdrop-blur-md">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-primary">Motif de la correction demandée</p>
              <p className="text-sm text-foreground">{motifCorrectionActuel}</p>
              {historiqueMotifs.length > 0 && (
                <>
                  <button
                    type="button"
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    onClick={() => setCorrectionHistOpen((open) => !open)}
                    aria-expanded={correctionHistOpen}
                  >
                    {historiqueMotifs.length} motif(s) précédent(s)
                    <ChevronDown className={cn("h-3 w-3 transition-transform", correctionHistOpen && "rotate-180")} strokeWidth={1.5} />
                  </button>
                  {correctionHistOpen && (
                    <ul className="mt-2 space-y-2 border-t border-border/60 pt-2">
                      {historiqueMotifs.map((m) => (
                        <li key={m.id} className="text-xs text-muted-foreground">
                          <span className="font-mono">{formatDate(m.createdAt)}</span> — {m.motif}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Card>
          )}

          <Card className="border-border bg-card/60 p-4 shadow-sm backdrop-blur-md">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Votre conseillère</p>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-none overflow-hidden rounded-full border-2 border-primary/20">
                <Image
                  src={d.conseiller?.photoUrl ?? "/images/advisor-portrait.png"}
                  alt={d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Conseiller"}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté"}</p>
                <p className="text-xs text-muted-foreground">Conseillère GET Admission</p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-border text-foreground hover:bg-muted hover:text-foreground">
                <Link href="/espace/messages">Écrire</Link>
              </Button>
            </div>
          </Card>

          <Card className="border-border bg-card/60 p-4 shadow-sm backdrop-blur-md">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Raccourcis</p>
            <div className="space-y-2">
              <ShortcutRow
                icon={CreditCard}
                label="Paiement"
                value={payeComplet ? "Complet" : payePartiel ? "Partiel" : "À régler"}
                tone={payeComplet ? "vert" : "ambre"}
                href="/espace/paiement"
              />
              <ShortcutRow icon={MessageSquare} label="Messages" value={`${nonLus} non lu${nonLus > 1 ? "s" : ""}`} tone="ambre" href="/espace/messages" />
              <ShortcutRow
                icon={Stamp}
                label="Attestation"
                value={attestationPret ? "Prête" : "Non disponible"}
                tone={attestationPret ? "vert" : "ardoise"}
                href="/espace/attestation"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ icon: Icon, label, value, tone, href }: { icon: React.ElementType; label: string; value: string; tone: "vert" | "ambre" | "ardoise"; href: string }) {
  const toneClass = { vert: "text-vert-vif", ambre: "text-primary", ardoise: "text-muted-foreground" }[tone];
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-md border border-border bg-background/50 px-3 py-2.5 transition-all hover:border-primary/50 hover:bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" strokeWidth={1.5} />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span className={cn("font-mono text-xs", toneClass)}>{value}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.5} />
    </Link>
  );
}
