"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { KpiCard, ChartSectionHeader } from "@/components/admin/kpi-card";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { etatParCode, COULEUR_BADGE } from "@/lib/etats";
import { FolderOpen, CheckCircle2, Wallet, Stamp, AlertCircle, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
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
  topUniversites: { universite: string; dossiers: number }[];
  dossiersParPeriode: { periode: string; dossiers: number; acceptes: number }[];
  transactionsParMois: { mois: string; montant: number }[];
  topConseillers: { id: string; nom: string; initiales: string; dossiers: number; acceptes: number; avatar: string }[];
  filePrioritaire: { id: string; reference: string; etat: string; candidatPrenom: string; candidatNom: string; universiteNom: string; formationIntitule: string }[];
  dossiersRecents: { id: string; reference: string; etat: string; etapeActuelle: number; fraisAgence: number; dateMaj: string; candidatPrenom: string; candidatNom: string; universiteNom: string; conseillerNom: string }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/stats")
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
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

      {/* KPIs — 5 cartes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard icon={FolderOpen} label="Nouveaux dossiers" value={k.nouveauxDossiers} suffix="total" delta={k.deltaNouveaux} deltaLabel="vs mois dernier" tone="bleu" />
        <KpiCard icon={AlertCircle} label="En cours" value={k.enCours} suffix="actifs" delta={k.deltaEnCours} deltaLabel="vs mois dernier" tone="jaune" />
        <KpiCard icon={CheckCircle2} label="Taux d'acceptation" value={`${k.tauxAcceptation}%`} suffix="30 jours" delta={k.deltaAcceptation} deltaLabel="vs mois dernier" tone="vert" />
        <KpiCard icon={Wallet} label="Encaissements" value={formatFCFACompact(k.encaissementsMois)} suffix="ce mois" delta={k.deltaEncaissements} deltaLabel="vs mois dernier" tone="cyan" />
        <KpiCard icon={Stamp} label="Attestations émises" value={k.attestationsEmises} suffix="ce mois" delta={k.deltaAttestations} deltaLabel="vs mois dernier" tone="violet" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Évolution dossiers */}
        <Card className="border-ligne bg-blanc p-5 lg:col-span-2 shadow-sm">
          <ChartSectionHeader eyebrow="Évolution" title="Dossiers & pré-admissions">
            <Select defaultValue="6s">
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
                    <stop offset="0%" stopColor="#52C41A" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#52C41A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" vertical={false} />
                <XAxis dataKey="periode" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} labelStyle={{ color: "#1F2937" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                <Area type="monotone" dataKey="dossiers" stroke="#1890FF" strokeWidth={2.5} fill="url(#gDossiers)" name="Dossiers" />
                <Area type="monotone" dataKey="acceptes" stroke="#52C41A" strokeWidth={2.5} fill="url(#gAcceptes)" name="Pré-admissions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Répartition statuts */}
        <Card className="border-ligne bg-blanc p-5 shadow-sm">
          <ChartSectionHeader eyebrow="Répartition" title="Dossiers par statut" />
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.repartitionStatuts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                  {stats.repartitionStatuts.map((s) => <Cell key={s.name} fill={s.couleur} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12 }} />
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

      {/* Top universités + Encaissements + Top conseillers */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top universités */}
        <Card className="border-ligne bg-blanc p-5 shadow-sm">
          <ChartSectionHeader eyebrow="Top universités" title="Dossiers par partenaire" />
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topUniversites} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" horizontal={false} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="universite" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "#F4F6FB" }} />
                <Bar dataKey="dossiers" fill="#173A7A" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Encaissements */}
        <Card className="border-ligne bg-blanc p-5 shadow-sm">
          <ChartSectionHeader eyebrow="Finance" title="Encaissements (FCFA)">
            <Select defaultValue="6m">
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
                    <stop offset="0%" stopColor="#B8902E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#B8902E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" vertical={false} />
                <XAxis dataKey="mois" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatFCFA(v)} />
                <Area type="monotone" dataKey="montant" stroke="#B8902E" strokeWidth={2.5} fill="url(#gFin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top conseillers */}
        <Card className="border-ligne bg-blanc p-5 shadow-sm">
          <ChartSectionHeader eyebrow="Performance" title="Top conseillers" />
          {stats.topConseillers.length === 0 ? (
            <p className="mt-4 text-sm text-ardoise">Aucun conseiller actif.</p>
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
      <Card className="border-ligne bg-blanc p-0 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-ligne px-6 py-4">
          <div>
            <p className="eyebrow">Activité récente</p>
            <h2 className="font-display text-base font-bold text-encre">Dossiers récents</h2>
          </div>
          <Link href="/admin/dossiers" className="text-sm font-medium text-bleu-vif hover:underline">Tout voir</Link>
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
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-bleu-pale font-mono text-[10px] font-semibold text-bleu-vif">
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
                      <Link href={`/admin/dossiers/${d.id}`} className="text-ardoise hover:text-bleu-vif" aria-label={`Voir ${d.reference}`}>
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
