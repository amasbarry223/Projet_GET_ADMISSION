"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartSectionHeader } from "@/components/admin/kpi-card";
import { StatStrip } from "@/components/admin/stat-strip";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { etatParCode, COULEUR_BADGE } from "@/lib/etats";
import { AlertTriangle, ArrowRight, Users } from "lucide-react";
import { AdminDashboardSkeleton } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { cn } from "@/lib/utils";

type Stats = {
  kpis: {
    nouveauxDossiers: number;
    enCours: number;
    tauxAcceptation: number;
    encaissementsMois: number;
    attestationsEmises: number;
    deltaNouveaux: number;
    deltaEnCours: number;
    deltaAcceptation: number;
    deltaEncaissements: number;
    deltaAttestations: number;
  };
  repartitionStatuts: { name: string; value: number; couleur: string }[];
  repartitionTypeEtablissement?: { name: string; value: number; couleur: string }[];
  repartitionProfilCandidat?: { name: string; value: number; couleur: string }[];
  topUniversites: { universite: string; dossiers: number }[];
  dossiersParPeriode: { periode: string; dossiers: number; acceptes: number }[];
  transactionsParMois: { mois: string; montant: number }[];
  topConseillers: { id: string; nom: string; initiales: string; dossiers: number; acceptes: number; avatar: string }[];
  filePrioritaire: { id: string; reference: string; etat: string; candidatPrenom: string; candidatNom: string; universiteNom: string; formationIntitule: string }[];
  dossiersRecents: { id: string; reference: string; etat: string; etapeActuelle: number; fraisAgence: number; dateMaj: string; candidatPrenom: string; candidatNom: string; universiteNom: string; conseillerNom: string }[];
};

export default function AdminDashboardClient() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [periodeDossiers, setPeriodeDossiers] = React.useState("6s");
  const [periodeFinance, setPeriodeFinance] = React.useState("6m");

  const loadStats = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/stats?periodeDossiers=${periodeDossiers}&periodeFinance=${periodeFinance}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) {
          setError("Impossible de charger les statistiques.");
          setLoading(false);
          return;
        }
        setStats(d as Stats);
        setLoading(false);
      })
      .catch(() => {
        setError("Erreur réseau lors du chargement des statistiques.");
        setLoading(false);
      });
  }, [periodeDossiers, periodeFinance]);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) loadStats();
    });
    return () => {
      cancelled = true;
    };
  }, [loadStats]);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertTriangle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Erreur de chargement</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">{error ?? "Données indisponibles."}</AlertDescription>
      </Alert>
    );
  }

  const k = stats.kpis;
  const filePrioritaire = stats.filePrioritaire;
  const dossiersRecents = stats.dossiersRecents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Tableau de bord.</h1>
          <p className="text-ardoise text-sm">Vue d'ensemble de l'agence — données en temps réel.</p>
        </div>
        <Badge variant="outline" className="font-mono text-[11px] text-ardoise">Mis à jour à l'instant</Badge>
      </div>

      {/* KPIs */}
      <StatStrip
        items={[
          { label: "Nouveaux dossiers", value: k.nouveauxDossiers, delta: k.deltaNouveaux, deltaLabel: "vs mois dernier" },
          { label: "En cours", value: k.enCours, delta: k.deltaEnCours, deltaLabel: "vs mois dernier" },
          { label: "Taux d'acceptation", value: `${k.tauxAcceptation}%`, delta: k.deltaAcceptation, deltaLabel: "30 jours" },
          { label: "Encaissements ce mois", value: formatFCFACompact(k.encaissementsMois), delta: k.deltaEncaissements, deltaLabel: "vs mois dernier" },
          { label: "Attestations émises", value: k.attestationsEmises, delta: k.deltaAttestations, deltaLabel: "ce mois" },
        ]}
      />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Évolution dossiers */}
        <Card className="border-ligne bg-card p-5 lg:col-span-2 shadow-sm">
          <ChartSectionHeader title="Dossiers & pré-admissions">
            <Select value={periodeDossiers} onValueChange={setPeriodeDossiers}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6s">6 dernières semaines</SelectItem>
                <SelectItem value="3m">3 derniers mois</SelectItem>
                <SelectItem value="6m">6 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </ChartSectionHeader>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dossiersParPeriode} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDossiers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1890FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1890FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAcceptes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3CA936" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3CA936" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="periode" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} labelStyle={{ color: "var(--popover-foreground)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area type="monotone" dataKey="dossiers" stroke="#1890FF" strokeWidth={2.5} fill="url(#gDossiers)" name="Dossiers" />
                <Area type="monotone" dataKey="acceptes" stroke="#3CA936" strokeWidth={2.5} fill="url(#gAcceptes)" name="Pré-admissions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Répartition statuts */}
        <Card className="border-ligne bg-card p-5 shadow-sm">
          <ChartSectionHeader title="Dossiers par statut" />
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.repartitionStatuts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {stats.repartitionStatuts.map((s) => <Cell key={s.name} fill={s.couleur} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5">
            {stats.repartitionStatuts.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.couleur }} />
                <span className="text-encre">{s.name}</span>
                <span className="ml-auto font-mono font-semibold text-encre">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Ventilation CDC : public/privé + profil */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-ligne bg-card p-5 shadow-sm">
          <ChartSectionHeader title="Répartition public / privé" />
          <ul className="mt-4 space-y-2">
            {(stats.repartitionTypeEtablissement ?? []).map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.couleur }} />
                <span className="text-encre">{s.name}</span>
                <span className="ml-auto font-mono font-semibold text-encre">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-ligne bg-card p-5 shadow-sm">
          <ChartSectionHeader title="Répartition par profil académique" />
          <ul className="mt-4 space-y-2">
            {(stats.repartitionProfilCandidat ?? []).map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.couleur }} />
                <span className="text-encre">{s.name}</span>
                <span className="ml-auto font-mono font-semibold text-encre">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Top universités + Encaissements + Top conseillers */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top universités */}
        <Card className="border-ligne bg-card p-5 shadow-sm">
          <ChartSectionHeader title="Top universités par dossiers" />
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topUniversites} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="universite" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="dossiers" fill="#3CA936" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Encaissements */}
        <Card className="border-ligne bg-card p-5 shadow-sm">
          <ChartSectionHeader title="Encaissements (FCFA)">
            <Select value={periodeFinance} onValueChange={setPeriodeFinance}>
              <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">6 mois</SelectItem>
                <SelectItem value="12m">12 mois</SelectItem>
              </SelectContent>
            </Select>
          </ChartSectionHeader>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.transactionsParMois} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2E8329" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#2E8329" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mois" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }} formatter={(v: number) => formatFCFA(v)} />
                <Area type="monotone" dataKey="montant" stroke="#2E8329" strokeWidth={2.5} fill="url(#gFin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top conseillers */}
        <Card className="border-ligne bg-card p-5 shadow-sm">
          <ChartSectionHeader title="Top conseillers" />
          {stats.topConseillers.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 bg-transparent py-8"
              icon={<Users className="h-5 w-5" strokeWidth={1.5} />}
              title="Aucun conseiller actif"
              description="Les performances apparaîtront dès qu'un conseiller aura des dossiers affectés."
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.topConseillers.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-semibold text-ardoise">#{i + 1}</span>
                  <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full border border-ligne">
                    <Image src={c.avatar} alt={c.nom} fill className="object-cover" sizes="36px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-encre">{c.nom}</p>
                    <p className="text-xs text-ardoise">{c.dossiers} dossiers · {c.acceptes} acceptés</p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-display text-sm font-bold text-vert-vif">{c.dossiers > 0 ? Math.round((c.acceptes / c.dossiers) * 100) : 0}%</p>
                    <p className="font-mono text-[10px] text-ardoise">acceptation</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* File prioritaire */}
      {filePrioritaire.length > 0 && (
        <Alert className="border-jaune/40 bg-jaune-pale/50">
          <AlertTriangle className="h-4 w-4 text-jaune" strokeWidth={1.5} />
          <AlertTitle className="font-display text-sm font-bold text-encre">File prioritaire — {filePrioritaire.length} dossier(s) en attente d'action</AlertTitle>
          <AlertDescription className="text-sm text-ardoise">
            Ces dossiers nécessitent une intervention conseiller ou finance. Cliquez sur une ligne pour ouvrir le détail et déclencher l'action de workflow appropriée.
          </AlertDescription>
        </Alert>
      )}

      {/* Dossiers récents */}
      <Card className="border-ligne bg-card p-0 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-ligne px-6 py-4">
          <h2 className="font-display text-base font-bold text-encre">Dossiers récents</h2>
          <Link href="/admin/dossiers" className="text-sm font-medium text-or hover:underline">Tout voir</Link>
        </div>
        <div className="overflow-x-auto scroll-fine">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ligne">
                <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Candidat</th>
                <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</th>
                <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Université</th>
                <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Statut</th>
                <th className="px-6 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Date</th>
                <th className="px-6 py-3 text-right font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Frais</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {dossiersRecents.map((d) => {
                const e = etatParCode(d.etat);
                const c = COULEUR_BADGE[e.couleur];
                return (
                  <tr key={d.id} className="border-b border-ligne last:border-0 hover:bg-porcelaine/60 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/admin/dossiers/${d.id}`} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-lapis/10 font-mono text-[10px] font-semibold text-or">
                          {d.candidatNom.slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-encre">{d.candidatPrenom} {d.candidatNom}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-encre">{d.reference}</td>
                    <td className="px-6 py-3 text-sm text-ardoise">{d.universiteNom}</td>
                    <td className="px-6 py-3">
                      <Badge className={cn("font-mono text-[10px] uppercase", c.text, c.border, c.bg)}>{e.libelle}</Badge>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-ardoise">{formatDate(d.dateMaj)}</td>
                    <td className="px-6 py-3 text-right font-mono text-xs font-semibold text-encre">{formatFCFA(d.fraisAgence)}</td>
                    <td className="px-6 py-3 text-right">
                      <Link href={`/admin/dossiers/${d.id}`} className="text-ardoise hover:text-or" aria-label={`Voir ${d.reference}`}>
                        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
