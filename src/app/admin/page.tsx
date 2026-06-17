"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { Eyebrow } from "@/components/site/reveal";
import { KPI_ADMIN } from "@/lib/mock/utilisateurs";
import { REPARTITION_STATUTS, TOP_UNIVERSITES, DOSSIERS_PAR_PERIODE, TRANSACTIONS_PAR_MOIS } from "@/lib/mock/paiements";
import { DOSSIERS } from "@/lib/mock/dossiers";
import { formationParId, nomUniversite } from "@/lib/mock/formations";
import { formatFCFA, formatFCFACompact, formatDate } from "@/lib/format";
import { etatParCode, COULEUR_BADGE } from "@/lib/mock/etats";
import { FolderOpen, TrendingUp, TrendingDown, CheckCircle2, Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { cn } from "@/lib/utils";

export default function AdminDashboard() {
  const filePrioritaire = DOSSIERS.filter((d) => ["correction", "paiement_attente", "soumis", "verification"].includes(d.etat)).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Pilotage</Eyebrow>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Tableau de bord.</h1>
          <p className="text-ardoise text-sm">Vue d'ensemble de l'agence — février 2026.</p>
        </div>
        <Badge variant="outline" className="font-mono text-[11px] text-ardoise">Mis à jour il y a 4 min</Badge>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={FolderOpen} label="Nouveaux dossiers" value={String(KPI_ADMIN.nouveauxDossiers)} delta={KPI_ADMIN.deltaNouveaux} suffix="ce mois" tone="lapis" />
        <KpiCard icon={AlertCircle} label="En cours" value={String(KPI_ADMIN.enCours)} delta={KPI_ADMIN.deltaEnCours} suffix="actifs" tone="ambre" />
        <KpiCard icon={CheckCircle2} label="Taux d'acceptation" value={`${KPI_ADMIN.tauxAcceptation}%`} delta={KPI_ADMIN.deltaAcceptation} suffix="sur 30 jours" tone="vert" />
        <KpiCard icon={Wallet} label="Encaissements" value={formatFCFACompact(KPI_ADMIN.encaissementsMois)} delta={KPI_ADMIN.deltaEncaissements} suffix="ce mois" tone="lapis" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Dossiers par période */}
        <Card className="border-ligne bg-blanc p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Évolution</p>
              <h2 className="font-display text-base font-bold text-encre">Dossiers & pré-admissions</h2>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] text-ardoise">6 dernières semaines</Badge>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DOSSIERS_PAR_PERIODE} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDossiers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2D6BF0" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#2D6BF0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAcceptes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F8A5B" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#1F8A5B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" vertical={false} />
                <XAxis dataKey="periode" stroke="#5A6781" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#5A6781" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#0E1B33" }} />
                <Area type="monotone" dataKey="dossiers" stroke="#2D6BF0" strokeWidth={2} fill="url(#gDossiers)" name="Dossiers" />
                <Area type="monotone" dataKey="acceptes" stroke="#1F8A5B" strokeWidth={2} fill="url(#gAcceptes)" name="Pré-admissions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Répartition statuts */}
        <Card className="border-ligne bg-blanc p-5">
          <p className="eyebrow">Répartition</p>
          <h2 className="font-display text-base font-bold text-encre">Dossiers par statut</h2>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={REPARTITION_STATUTS} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {REPARTITION_STATUTS.map((s) => <Cell key={s.name} fill={s.couleur} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5">
            {REPARTITION_STATUTS.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: s.couleur }} />
                <span className="text-encre">{s.name}</span>
                <span className="ml-auto font-mono text-ardoise">{s.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Top universités + Encaissements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-ligne bg-blanc p-5">
          <p className="eyebrow">Top universités</p>
          <h2 className="font-display text-base font-bold text-encre">Dossiers par partenaire</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_UNIVERSITES} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" horizontal={false} />
                <XAxis type="number" stroke="#5A6781" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="universite" stroke="#5A6781" fontSize={11} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="dossiers" fill="#173A7A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-ligne bg-blanc p-5">
          <p className="eyebrow">Finance</p>
          <h2 className="font-display text-base font-bold text-encre">Encaissements (FCFA)</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TRANSACTIONS_PAR_MOIS} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B8902E" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#B8902E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E7F0" vertical={false} />
                <XAxis dataKey="mois" stroke="#5A6781" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#5A6781" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatFCFA(v)} />
                <Area type="monotone" dataKey="montant" stroke="#B8902E" strokeWidth={2} fill="url(#gFin)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* File prioritaire */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ligne px-6 py-4">
          <div>
            <p className="eyebrow">File prioritaire</p>
            <h2 className="font-display text-base font-bold text-encre">Dossiers nécessitant une action</h2>
          </div>
          <Link href="/admin/dossiers" className="text-sm font-medium text-lapis-clair hover:underline">Tout voir</Link>
        </div>
        <div className="divide-y divide-ligne">
          {filePrioritaire.map((d) => {
            const e = etatParCode(d.etat);
            const c = COULEUR_BADGE[e.couleur];
            const form = formationParId(d.formationId);
            return (
              <Link key={d.id} href={`/admin/dossiers/${d.id}`} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-porcelaine">
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-lapis/10 font-mono text-[10px] font-semibold text-lapis">
                  {d.candidatNom.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-encre">{d.candidatPrenom} {d.candidatNom} · {d.reference}</p>
                  <p className="truncate text-xs text-ardoise">{nomUniversite(d.universiteId)} — {form?.intitule}</p>
                </div>
                <Badge className={cn("flex-none font-mono text-[10px] uppercase", c.text, c.border, c.bg)}>{e.libelle}</Badge>
                <ArrowRight className="h-4 w-4 flex-none text-ardoise" strokeWidth={1.5} />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, suffix, tone }: { icon: React.ElementType; label: string; value: string; delta: number; suffix: string; tone: "lapis" | "ambre" | "vert" }) {
  const up = delta >= 0;
  const toneClass = { lapis: "bg-lapis/10 text-lapis", ambre: "bg-ambre/10 text-ambre", vert: "bg-vert/10 text-vert" }[tone];
  return (
    <Card className="border-ligne bg-blanc p-5">
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", toneClass)}>
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <span className={cn("flex items-center gap-1 font-mono text-[11px]", up ? "text-vert" : "text-carmin")}>
          {up ? <TrendingUp className="h-3 w-3" strokeWidth={1.5} /> : <TrendingDown className="h-3 w-3" strokeWidth={1.5} />}
          {up ? "+" : ""}{delta}%
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-encre">{value}</p>
      <p className="text-xs text-ardoise">{label} · {suffix}</p>
    </Card>
  );
}
