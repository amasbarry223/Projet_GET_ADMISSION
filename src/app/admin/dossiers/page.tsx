"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DOSSIERS } from "@/lib/mock/dossiers";
import { ETATS, etatParCode, COULEUR_BADGE, type EtatCode } from "@/lib/mock/etats";
import { formationParId, nomUniversite } from "@/lib/mock/formations";
import { UNIVERSITES } from "@/lib/mock/universites";
import { formatFCFA, formatDate } from "@/lib/format";
import { Search, SlidersHorizontal, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CONSEILLERS = ["Tous", "Aïssatou Diallo", "Olivier Nguema", "Non affecté"];

export default function AdminDossiersPage() {
  const [q, setQ] = React.useState("");
  const [etat, setEtat] = React.useState<string>("tous");
  const [univ, setUniv] = React.useState<string>("tous");
  const [cons, setCons] = React.useState<string>("Tous");
  const [page, setPage] = React.useState(1);
  const perPage = 8;

  const filtered = React.useMemo(() => {
    return DOSSIERS.filter((d) => {
      if (q) {
        const s = `${d.reference} ${d.candidatNom} ${d.candidatPrenom} ${nomUniversite(d.universiteId)}`.toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      if (etat !== "tous" && d.etat !== etat) return false;
      if (univ !== "tous" && d.universiteId !== univ) return false;
      if (cons !== "Tous" && d.conseillerNom !== cons) return false;
      return true;
    });
  }, [q, etat, univ, cons]);

  React.useEffect(() => { setPage(1); }, [q, etat, univ, cons]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const reset = () => { setQ(""); setEtat("tous"); setUniv("tous"); setCons("Tous"); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Dossiers</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Tous les dossiers.</h1>
          <p className="text-sm text-ardoise">{filtered.length} dossier{filtered.length > 1 ? "s" : ""} · {DOSSIERS.length} au total</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-ligne bg-blanc p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Référence, candidat, université…" className="pl-9" aria-label="Recherche" />
          </div>
          <Select value={etat} onValueChange={setEtat}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les statuts</SelectItem>
              {ETATS.map((e) => <SelectItem key={e.code} value={e.code}>{e.libelle}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={univ} onValueChange={setUniv}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Université" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Toutes les universités</SelectItem>
              {UNIVERSITES.map((u) => <SelectItem key={u.id} value={u.id}>{u.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cons} onValueChange={setCons}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Conseiller" /></SelectTrigger>
            <SelectContent>
              {CONSEILLERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={reset} className="text-ardoise hover:text-lapis">
            <SlidersHorizontal className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Réinitialiser
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="overflow-x-auto scroll-fine">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Référence</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Candidat</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Université</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Formation</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Statut</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Conseiller</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Date</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Frais</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <p className="text-sm text-ardoise">Aucun dossier ne correspond à ces filtres. Élargissez votre recherche.</p>
                    <Button variant="outline" onClick={reset} className="mt-3">Réinitialiser les filtres</Button>
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((d) => {
                  const e = etatParCode(d.etat as EtatCode);
                  const c = COULEUR_BADGE[e.couleur];
                  const form = formationParId(d.formationId);
                  return (
                    <TableRow key={d.id} className="border-ligne hover:bg-porcelaine/60 cursor-pointer" onClick={() => window.location.href = `/admin/dossiers/${d.id}`}>
                      <TableCell className="font-mono text-xs text-encre">{d.reference}</TableCell>
                      <TableCell className="text-sm text-encre">{d.candidatPrenom} {d.candidatNom}</TableCell>
                      <TableCell className="text-sm text-encre">{nomUniversite(d.universiteId)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-ardoise">{form?.intitule}</TableCell>
                      <TableCell>
                        <Badge className={cn("font-mono text-[10px] uppercase", c.text, c.border, c.bg)}>{e.libelle}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-ardoise">{d.conseillerNom}</TableCell>
                      <TableCell className="font-mono text-xs text-ardoise">{formatDate(d.dateMaj)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-encre">{formatFCFA(d.fraisAgence)}</TableCell>
                      <TableCell>
                        <Link href={`/admin/dossiers/${d.id}`} onClick={(e) => e.stopPropagation()} className="text-ardoise hover:text-lapis" aria-label="Voir le dossier">
                          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-ligne px-4 py-3">
          <p className="text-xs text-ardoise">Page {page} sur {totalPages} · {filtered.length} résultat(s)</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
