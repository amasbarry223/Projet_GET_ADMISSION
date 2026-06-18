"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UNIVERSITES, type Universite } from "@/lib/mock/universites";
import { FORMATIONS, formationsParUniversite, type Formation } from "@/lib/mock/formations";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Search, Building2, GraduationCap, Pencil, Trash2, Globe, MapPin } from "lucide-react";

export default function AdminCataloguePage() {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Universite | null>(null);

  const filtered = UNIVERSITES.filter((u) => {
    if (!q) return true;
    const s = `${u.nom} ${u.ville} ${u.pays} ${u.domaines.join(" ")}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Universités & formations.</h1>
          <p className="text-sm text-ardoise">{UNIVERSITES.length} universités · {FORMATIONS.length} formations</p>
        </div>
        <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Formulaire d'ajout", { description: "Une nouvelle université sera créée (mock)." })}>
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Ajouter une université
        </Button>
      </div>

      <Card className="border-ligne bg-blanc p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, ville, domaine…" className="pl-9" />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((u) => (
          <Card key={u.id} className="border-ligne bg-blanc p-5">
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-md bg-gradient-to-br ${u.imageCouleur} font-mono text-xs font-bold text-blanc`}>{u.ecusson}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{u.drapeau}</span>
                  <h3 className="font-display text-base font-bold text-encre">{u.nom}</h3>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-ardoise"><MapPin className="h-3 w-3" />{u.ville}, {u.pays}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {u.domaines.slice(0, 4).map((d) => <Badge key={d} variant="outline" className="text-[10px] font-mono text-ardoise">{d}</Badge>)}
                </div>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-ardoise hover:text-lapis" aria-label="Modifier" onClick={() => setSelected(u)}>
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md bg-blanc overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="font-display text-lg font-bold text-encre">{u.nom}</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-6 space-y-4">
                    <p className="text-sm text-ardoise">{u.description}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="font-mono text-[10px] uppercase text-ardoise">Ville</p><p className="text-encre">{u.ville}</p></div>
                      <div><p className="font-mono text-[10px] uppercase text-ardoise">Pays</p><p className="text-encre">{u.pays}</p></div>
                      <div><p className="font-mono text-[10px] uppercase text-ardoise">Frais min</p><p className="font-mono text-encre">{formatFCFA(u.fraisMin)}</p></div>
                      <div><p className="font-mono text-[10px] uppercase text-ardoise">Frais max</p><p className="font-mono text-encre">{formatFCFA(u.fraisMax)}</p></div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase text-ardoise">Formations ({formationsParUniversite(u.id).length})</p>
                      <ul className="mt-2 space-y-1.5">
                        {formationsParUniversite(u.id).map((f) => (
                          <li key={f.id} className="flex items-center justify-between rounded-md border border-ligne px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium text-encre">{f.intitule}</p>
                              <p className="text-xs text-ardoise">{f.niveau} · {f.domaine} · {f.duree}</p>
                            </div>
                            <span className="font-mono text-xs text-encre">{formatFCFA(f.fraisAgence)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Modifications enregistrées")}>Enregistrer</Button>
                      <Button variant="outline" className="border-carmin/40 text-carmin hover:bg-carmin/5" onClick={() => toast.error("Suppression simulée")}><Trash2 className="h-4 w-4" strokeWidth={1.5} /></Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
