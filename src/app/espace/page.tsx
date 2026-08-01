"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotionButton } from "@/components/site/motion-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { KpiCard, ChartSectionHeader } from "@/components/admin/kpi-card";
import { TimelinePassage } from "@/components/espace/timeline-passage";
import { ETATS, etatParCode } from "@/lib/etats";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { CreditCard, MessageSquare, Stamp, ArrowRight, CheckCircle2, MapPin, GraduationCap, FileText, Wallet, Sparkles, AlertCircle } from "lucide-react";
import { EspaceDashboardSkeleton } from "@/components/ui/skeleton-card";
import { cn } from "@/lib/utils";

type Dossier = {
  id: string;
  reference: string;
  etat: string;
  etapeActuelle: number;
  fraisAgence: number;
  mrz: string;
  paiementStatut?: string | null;
  candidat: { prenom: string; nom: string; nationalite: string };
  universite: { nom: string; pays: string; drapeau: string; ville: string; slug: string; coverUrl?: string | null };
  formation: { intitule: string; niveau: string; domaine: string };
  conseiller: { prenom: string; nom: string; photoUrl?: string | null } | null;
  pieces: { id: string; libelle: string; statut: string }[];
  paiements: { id: string; reference: string; date: string; montant: number; moyen: string; statut: string }[];
  historiques: { id: string; date: string; etat: string; auteur: string; note: string }[];
  conversation: { nonLusCandidat: number } | null;
};

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
}): CandidateNextAction {
  const { etatUpper, etatInfo, payePartiel, fraisAgence, universiteNom, attestationPret } =
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
      desc: "Votre conseiller a renvoyé le dossier. Corrigez les pièces concernées puis renvoyez.",
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
      titre: "Candidature refusée",
      desc: "L'université a décliné ce dossier. Contactez votre conseiller pour les options.",
      href: "/espace/messages",
      cta: "Écrire au conseiller",
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
  const [dossier, setDossier] = React.useState<Dossier | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/dossiers")
      .then((r) => {
        if (!r.ok) throw new Error("Erreur");
        return r.json();
      })
      .then((data: Dossier[]) => {
        setDossier(data[0] ?? null);
        setLoading(false);
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setError("Impossible de charger votre dossier.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <EspaceDashboardSkeleton />;
  }

  if (error) {
    return (
      <Alert className="border-destructive/40 bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-foreground">Connexion impossible</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {error}{" "}
          <button type="button" className="font-medium text-primary underline" onClick={() => window.location.reload()}>
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
  const workflowStep = etatInfo.ordre; // toujours dérivé de l'état (1–12), pas du wizard
  const piecesManquantes = d.pieces.filter((p) => p.statut === "manquante" || p.statut === "a_corriger");
  const etatUpper = d.etat.toUpperCase();
  const payeComplet = d.paiementStatut === "complet";
  const payePartiel = d.paiementStatut === "partiel";
  const attestationPret = etatUpper === "ATTESTATION" || etatUpper === "CLOTURE";
  const coverSrc = univ.coverUrl || "/images/campus-sorbonne.jpg";

  const prochaine = getNextCandidateAction({
    etatUpper,
    etatInfo,
    payePartiel,
    fraisAgence: d.fraisAgence,
    universiteNom: univ.nom,
    attestationPret,
  });

  const primaryCta =
    etatUpper === "BROUILLON" || etatUpper === "CORRECTION"
      ? { href: "/espace/dossier", label: etatUpper === "CORRECTION" ? "Corriger mon dossier" : "Continuer mon dossier" }
      : etatUpper === "PAIEMENT_ATTENTE" || payePartiel
        ? { href: "/espace/paiement", label: "Régler le paiement" }
        : attestationPret
          ? { href: "/espace/attestation", label: "Voir l'attestation" }
          : { href: "/espace/messages", label: "Contacter mon conseiller" };

  const alertes: { titre: string; desc: string; href: string; cta: string }[] = [];
  if (etatUpper === "BROUILLON") {
    alertes.push({
      titre: "Dossier en brouillon",
      desc: "Finalisez et soumettez votre dossier pour entrer en file de traitement.",
      href: "/espace/dossier",
      cta: "Continuer mon dossier",
    });
  }
  if (etatUpper === "CORRECTION" || piecesManquantes.length > 0) {
    alertes.push({
      titre: "Action requise — pièces",
      desc:
        piecesManquantes.length > 0
          ? `${piecesManquantes.length} pièce(s) à corriger ou manquante(s).`
          : "Votre dossier a été renvoyé pour correction.",
      href: "/espace/dossier",
      cta: "Compléter mon dossier",
    });
  }
  if (etatUpper === "PAIEMENT_ATTENTE") {
    alertes.push({
      titre: "Paiement en attente",
      desc: `Les frais d'agence (${formatFCFA(d.fraisAgence)}) doivent être réglés.`,
      href: "/espace/paiement",
      cta: "Payer maintenant",
    });
  } else if (d.paiementStatut === "partiel") {
    alertes.push({
      titre: "Tranche de paiement restante",
      desc: "Votre paiement est partiel. Réglez le solde pour poursuivre.",
      href: "/espace/paiement",
      cta: "Payer la suite",
    });
  }
  if (nonLus > 0) {
    alertes.push({
      titre: "Nouveau message",
      desc: `${nonLus} message(s) non lu(s) de votre conseiller.`,
      href: "/espace/messages",
      cta: "Ouvrir la messagerie",
    });
  }

  return (
    <div className="space-y-6">
      {alertes.length > 0 && (
        <div className="space-y-3">
          {alertes.map((a) => (
            <Alert key={a.titre} className="border-primary/40 bg-primary/10 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <AlertTitle className="font-display text-sm font-bold text-foreground">{a.titre}</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span className="text-foreground/90">{a.desc}</span>
                <Button asChild size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/20">
                  <Link href={a.href}>{a.cta}</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
      {/* ====================== Welcome hero avec illustration ====================== */}
      <Card className="relative overflow-hidden border-border bg-card/60 backdrop-blur-md p-0 shadow-sm">
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="p-6 sm:p-8 lg:p-10 z-10">
            <span className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-eyebrow text-primary">
              <span className="h-px w-6 bg-primary opacity-60" /> Réf. {d.reference}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Bonjour, {d.candidat.prenom}.
            </h1>
            <p className="mt-2 max-w-md text-muted-foreground">
              Voici l&apos;avancement en temps réel de votre dossier vers <span className="font-medium text-primary">{univ?.nom}</span>.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Badge className="bg-primary/10 font-mono text-[11px] uppercase text-primary border-primary/20">
                <CheckCircle2 className="mr-1 h-3 w-3" strokeWidth={1.5} /> {etatInfo.libelle}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">Étape {workflowStep} / 12</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <MotionButton asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(60,169,54,0.3)]">
                <Link href={primaryCta.href}>
                  {primaryCta.label} <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              </MotionButton>
              {attestationPret && (
                <MotionButton asChild variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
                  <Link href="/espace/attestation">Voir l&apos;attestation</Link>
                </MotionButton>
              )}
            </div>
          </div>
          <div className="relative min-h-[200px] lg:min-h-full opacity-50 mix-blend-screen">
            <Image
              src="/images/hero-dashboard.png"
              alt="Illustration du parcours d'admission à l'étranger"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-transparent lg:from-card/90" aria-hidden />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" aria-hidden />
      </Card>

      {/* ====================== KPI cards (4 cartes) ====================== */}
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

      {/* ====================== Charts + Listes ====================== */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Avancement du dossier (chart large) */}
        <div className="space-y-4">
          {/* Timeline verticale */}
          <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md p-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <ChartSectionHeader eyebrow="Suivi temps réel" title="Les 12 étapes de votre dossier" />
              <Badge className="bg-primary/20 font-mono text-[11px] uppercase text-primary">
                Étape {workflowStep} / 12
              </Badge>
            </div>
            <div className="max-h-[560px] overflow-y-auto scroll-fine px-6 py-5">
              <TimelinePassage
                etats={ETATS}
                etapeActuelle={workflowStep}
                dateParEtat={dateParEtat}
              />
            </div>
          </Card>

          {/* Historique des paiements (mini table) */}
          <Card className="border-border bg-card/60 backdrop-blur-md p-0 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <ChartSectionHeader eyebrow="Finance" title="Vos paiements" />
              <Link href="/espace/paiement" className="text-sm font-medium text-primary hover:underline">Voir tout</Link>
            </div>
            {d.paiements.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">Aucun paiement pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto scroll-fine">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Référence</th>
                      <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Date</th>
                      <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Moyen</th>
                      <th className="px-6 py-3 text-right font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Montant</th>
                      <th className="px-6 py-3 text-right font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.paiements.map((p) => (
                      <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <td className="px-6 py-3 font-mono text-xs text-foreground">{p.reference}</td>
                        <td className="px-6 py-3 text-sm text-foreground">{formatDate(p.date)}</td>
                        <td className="px-6 py-3 text-sm text-foreground">{p.moyen}</td>
                        <td className="px-6 py-3 text-right font-mono text-sm font-semibold text-foreground">{formatFCFA(p.montant)}</td>
                        <td className="px-6 py-3 text-right"><Badge className="bg-primary/10 font-mono text-[10px] uppercase text-primary border-primary/20">{p.statut}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column — destination + prochaine action + conseillère */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-md p-0 shadow-sm">
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
              <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 text-primary hover:bg-primary/10 hover:text-primary">
                <Link href={`/universites/${univ.slug}`}>Voir l&apos;université <ArrowRight className="ml-1 h-3 w-3" strokeWidth={1.5} /></Link>
              </Button>
            </div>
          </Card>

          {/* Prochaine action */}
          <Card className="border-primary/30 bg-primary/5 backdrop-blur-md p-5 shadow-[0_0_20px_rgba(60,169,54,0.05)]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-primary">Prochaine action</p>
            </div>
            <p className="mt-2 font-display text-base font-bold text-foreground">
              {prochaine.titre}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {prochaine.desc}
            </p>
            <Button asChild className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
              <Link href={prochaine.href}>{prochaine.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} /></Link>
            </Button>
          </Card>

          {/* Conseillère avec photo */}
          <Card className="border-border bg-card/60 backdrop-blur-md p-4 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground mb-3">Votre conseillère</p>
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

          {/* Shortcuts */}
          <Card className="border-border bg-card/60 backdrop-blur-md p-4 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground mb-3">Raccourcis</p>
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
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <span className={cn("font-mono text-xs", toneClass)}>{value}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" strokeWidth={1.5} />
    </Link>
  );
}
