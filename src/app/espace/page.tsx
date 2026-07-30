"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { KpiCard, ChartSectionHeader } from "@/components/admin/kpi-card";
import { ETATS, etatParCode } from "@/lib/mock/etats";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { CreditCard, MessageSquare, Stamp, ArrowRight, CheckCircle2, Clock, MapPin, GraduationCap, FileText, Wallet, Sparkles, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

type Dossier = {
  id: string;
  reference: string;
  etat: string;
  etapeActuelle: number;
  fraisAgence: number;
  mrz: string;
  candidat: { prenom: string; nom: string; nationalite: string };
  universite: { nom: string; pays: string; drapeau: string; ville: string; slug: string };
  formation: { intitule: string; niveau: string; domaine: string };
  conseiller: { prenom: string; nom: string } | null;
  pieces: { id: string; libelle: string; statut: string }[];
  paiements: { id: string; reference: string; date: string; montant: number; moyen: string; statut: string }[];
  historiques: { id: string; date: string; etat: string; auteur: string; note: string }[];
  conversation: { nonLusCandidat: number } | null;
};

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
      .catch(() => {
        setError("Impossible de charger votre dossier.");
        setLoading(false);
      });
  }, []);

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
          Vous n'avez pas encore de dossier. <Link href="/espace/dossier" className="font-medium text-lapis-clair hover:underline">Créer mon dossier</Link>
        </AlertDescription>
      </Alert>
    );
  }

  const d = dossier;
  const univ = d.universite;
  const form = d.formation;
  const nonLus = d.conversation?.nonLusCandidat ?? 0;
  const dateParEtat = new Map(d.historiques.map((h) => [h.etat.toLowerCase(), h.date]));

  return (
    <div className="space-y-6">
      {/* ====================== Welcome hero avec illustration ====================== */}
      <Card className="relative overflow-hidden border-ligne bg-blanc p-0 shadow-sm">
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <span className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-eyebrow text-lapis">
              <span className="h-px w-6 bg-lapis opacity-60" /> Réf. {d.reference}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-encre sm:text-4xl">
              Bonjour, Fatou.
            </h1>
            <p className="mt-2 max-w-md text-ardoise">
              Voici l'avancement en temps réel de votre dossier vers <span className="font-medium text-encre">{univ?.nom}</span>.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Badge className="bg-vert-pale font-mono text-[11px] uppercase text-vert-vif">
                <CheckCircle2 className="mr-1 h-3 w-3" strokeWidth={1.5} /> Pré-admission accordée
              </Badge>
              <span className="font-mono text-xs text-ardoise">Étape {d.etapeActuelle} / 12</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-lapis text-blanc hover:bg-lapis/90">
                <Link href="/espace/dossier">Continuer mon dossier <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} /></Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/espace/attestation">Voir l'attestation</Link>
              </Button>
            </div>
          </div>
          <div className="relative min-h-[200px] lg:min-h-full">
            <Image
              src="/images/hero-dashboard.png"
              alt="Illustration du parcours d'admission à l'étranger"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blanc via-blanc/10 to-transparent lg:from-blanc/80" aria-hidden />
          </div>
        </div>
        <div className="rule-or" aria-hidden />
      </Card>

      {/* ====================== KPI cards (4 cartes) ====================== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FileText} label="Étape du dossier" value={`${d.etapeActuelle}/12`} suffix="pré-admission" tone="bleu" />
        <KpiCard icon={Wallet} label="Frais d'agence" value={formatFCFACompact(d.fraisAgence)} suffix="réglés" tone="vert" />
        <KpiCard icon={MessageSquare} label="Messages non lus" value={nonLus} suffix="conseillère" tone="jaune" />
        <KpiCard icon={Stamp} label="Attestation" value="Sous 48h" suffix="émission" tone="violet" />
      </div>

      {/* ====================== Charts + Listes ====================== */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Avancement du dossier (chart large) */}
        <div className="space-y-4">
          {/* Timeline verticale */}
          <Card className="overflow-hidden border-ligne bg-blanc p-0 shadow-sm">
            <div className="flex items-center justify-between border-b border-ligne px-6 py-4">
              <ChartSectionHeader eyebrow="Suivi temps réel" title="Les 12 étapes de votre dossier" />
              <Badge className="bg-bleu-pale font-mono text-[11px] uppercase text-bleu-vif">
                Étape {d.etapeActuelle} / 12
              </Badge>
            </div>
            <div className="max-h-[480px] overflow-y-auto scroll-fine px-6 py-5">
              <ol className="relative space-y-1">
                <span className="absolute left-[15px] top-2 bottom-2 w-px bg-ligne" aria-hidden />
                {ETATS.map((etat) => {
                  const isPast = etat.ordre < d.etapeActuelle;
                  const isCurrent = etat.ordre === d.etapeActuelle;
                  const isFuture = etat.ordre > d.etapeActuelle;
                  const date = dateParEtat.get(etat.code);
                  return (
                    <li key={etat.code} className="relative flex gap-4 py-2">
                      <span
                        className={cn(
                          "relative z-10 mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full border-2 bg-blanc",
                          isPast && "border-vert-vif bg-vert-vif text-blanc",
                          isCurrent && "border-bleu-vif bg-bleu-vif text-blanc animate-pulse-soft",
                          isFuture && "border-ligne text-ardoise"
                        )}
                      >
                        {isPast ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> : isCurrent ? <Clock className="h-3.5 w-3.5" strokeWidth={2} /> : <span className="h-3 w-3 rounded-full bg-ardoise/30" />}
                      </span>
                      <div className={cn("flex-1 pt-0.5", isFuture && "opacity-55")}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-[10px] text-ardoise">{String(etat.ordre).padStart(2, "0")}</span>
                          <p className={cn("text-sm font-semibold", isCurrent ? "text-bleu-vif" : "text-encre")}>{etat.libelle}</p>
                          {date && (
                            <span className="font-mono text-[10px] text-ardoise">{formatDate(date)}</span>
                          )}
                          {isCurrent && (
                            <Badge className="bg-bleu-pale font-mono text-[9px] uppercase tracking-eyebrow text-bleu-vif">En cours</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-ardoise">{etat.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Card>

          {/* Historique des paiements (mini table) */}
          <Card className="border-ligne bg-blanc p-0 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-ligne px-6 py-4">
              <ChartSectionHeader eyebrow="Finance" title="Vos paiements" />
              <Link href="/espace/paiement" className="text-sm font-medium text-bleu-vif hover:underline">Voir tout</Link>
            </div>
            {d.paiements.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-ardoise">Aucun paiement pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto scroll-fine">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ligne">
                      <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</th>
                      <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Date</th>
                      <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Moyen</th>
                      <th className="px-6 py-3 text-right font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Montant</th>
                      <th className="px-6 py-3 text-right font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.paiements.map((p) => (
                      <tr key={p.id} className="border-b border-ligne last:border-0 hover:bg-porcelaine/60">
                        <td className="px-6 py-3 font-mono text-xs text-encre">{p.reference}</td>
                        <td className="px-6 py-3 text-sm text-encre">{formatDate(p.date)}</td>
                        <td className="px-6 py-3 text-sm text-encre">{p.moyen}</td>
                        <td className="px-6 py-3 text-right font-mono text-sm font-semibold text-encre">{formatFCFA(p.montant)}</td>
                        <td className="px-6 py-3 text-right"><Badge className="bg-vert-pale font-mono text-[10px] uppercase text-vert-vif">{p.statut}</Badge></td>
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
          {/* Destination card avec photo campus */}
          <Card className="overflow-hidden border-ligne bg-blanc p-0 shadow-sm">
            <div className="relative h-32">
              <Image
                src="/images/campus-sorbonne.jpg"
                alt={`Campus de ${univ?.nom}`}
                fill
                className="object-cover"
                sizes="360px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-encre/85 via-encre/40 to-encre/10" aria-hidden />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-eyebrow text-blanc/80">Votre destination</p>
                  <p className="truncate font-display text-base font-bold text-blanc">{univ?.nom}</p>
                </div>
                <span className="text-2xl">{univ?.drapeau}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-xs text-ardoise">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{univ?.ville}, {univ?.pays}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ardoise">
                <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="truncate">{form?.intitule}</span>
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-2 -ml-2 text-bleu-vif hover:bg-bleu-pale">
                <Link href={`/universites/${univ.slug}`}>Voir l'université <ArrowRight className="ml-1 h-3 w-3" strokeWidth={1.5} /></Link>
              </Button>
            </div>
          </Card>

          {/* Prochaine action */}
          <Card className="border-bleu-vif/30 bg-bleu-pale/40 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-bleu-vif" strokeWidth={1.5} />
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-bleu-vif">Prochaine action</p>
            </div>
            <p className="mt-2 font-display text-base font-bold text-encre">
              Pré-admission accordée — attestation en cours d'émission.
            </p>
            <p className="mt-1 text-sm text-ardoise">
              La Sorbonne Université a accepté votre candidature. Votre attestation sera disponible sous 48h.
            </p>
            <Button asChild className="mt-4 w-full bg-bleu-vif text-blanc hover:bg-bleu-vif/90" size="sm">
              <Link href="/espace/attestation">Voir l'attestation <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.5} /></Link>
            </Button>
          </Card>

          {/* Conseillère avec photo */}
          <Card className="border-ligne bg-blanc p-4 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise mb-3">Votre conseillère</p>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-none overflow-hidden rounded-full border-2 border-or-pale">
                <Image
                  src="/images/advisor-portrait.png"
                  alt={d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Conseiller"}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-encre">{d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté"}</p>
                <p className="text-xs text-ardoise">Conseillère GET Admission</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/espace/messages">Écrire</Link>
              </Button>
            </div>
          </Card>

          {/* Shortcuts */}
          <Card className="border-ligne bg-blanc p-4 shadow-sm">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise mb-3">Raccourcis</p>
            <div className="space-y-2">
              <ShortcutRow icon={CreditCard} label="Paiement" value="Complet" tone="vert" href="/espace/paiement" />
              <ShortcutRow icon={MessageSquare} label="Messages" value={`${nonLus} non lu${nonLus > 1 ? "s" : ""}`} tone="ambre" href="/espace/messages" />
              <ShortcutRow icon={Stamp} label="Attestation" value="Bientôt disponible" tone="ardoise" href="/espace/attestation" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ icon: Icon, label, value, tone, href }: { icon: React.ElementType; label: string; value: string; tone: "vert" | "ambre" | "ardoise"; href: string }) {
  const toneClass = { vert: "text-vert-vif", ambre: "text-jaune", ardoise: "text-ardoise" }[tone];
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-md border border-ligne px-3 py-2.5 transition-all hover:border-bleu-vif/30 hover:bg-porcelaine">
      <Icon className="h-4 w-4 text-ardoise" strokeWidth={1.5} />
      <span className="flex-1 text-sm font-medium text-encre">{label}</span>
      <span className={cn("font-mono text-xs", toneClass)}>{value}</span>
      <ArrowRight className="h-3.5 w-3.5 text-ardoise transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
    </Link>
  );
}
