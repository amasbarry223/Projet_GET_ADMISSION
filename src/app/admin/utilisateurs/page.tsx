"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UTILISATEURS_INTERNES, type RoleInterne } from "@/lib/mock/utilisateurs";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Search, ShieldCheck, Headset, Wallet, Crown, UserCog } from "lucide-react";

const ROLE_ICON: Record<RoleInterne, React.ElementType> = {
  Conseiller: Headset,
  Financier: Wallet,
  Admin: ShieldCheck,
  "Super Admin": Crown,
};
const ROLE_TONE: Record<RoleInterne, string> = {
  Conseiller: "bg-lapis/10 text-lapis",
  Financier: "bg-vert/10 text-vert",
  Admin: "bg-ambre/10 text-ambre",
  "Super Admin": "bg-or/15 text-or",
};

export default function AdminUtilisateursPage() {
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("tous");

  const filtered = UTILISATEURS_INTERNES.filter((u) => {
    if (q) {
      const s = `${u.prenom} ${u.nom} ${u.email}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    if (role !== "tous" && u.role !== role) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Utilisateurs</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Personnel & rôles.</h1>
          <p className="text-sm text-ardoise">{UTILISATEURS_INTERNES.length} membres · {UTILISATEURS_INTERNES.filter((u) => u.actif).length} actifs</p>
        </div>
        <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Invitation envoyée", { description: "Un e-mail d'invitation a été envoyé." })}>
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Inviter un membre
        </Button>
      </div>

      <Card className="border-ligne bg-blanc p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise" strokeWidth={1.5} />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail…" className="pl-9" />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rôle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les rôles</SelectItem>
              <SelectItem value="Conseiller">Conseiller</SelectItem>
              <SelectItem value="Financier">Financier</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Super Admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="border-ligne bg-blanc p-0 overflow-hidden">
        <div className="overflow-x-auto scroll-fine">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Membre</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Rôle</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Dossiers</TableHead>
                <TableHead className="font-mono text-[10px] uppercase text-ardoise">Créé le</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-ardoise">Actif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const Icon = ROLE_ICON[u.role];
                return (
                  <TableRow key={u.id} className="border-ligne hover:bg-porcelaine/60">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-ligne"><AvatarFallback className="bg-lapis/10 font-mono text-xs font-semibold text-lapis">{u.initiales}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-medium text-encre">{u.prenom} {u.nom}</p>
                          <p className="font-mono text-[11px] text-ardoise">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-mono text-[10px] uppercase ${ROLE_TONE[u.role]}`}>
                        <Icon className="mr-1 h-3 w-3" strokeWidth={1.5} /> {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-encre">{u.dossiersAssignes}</TableCell>
                    <TableCell className="font-mono text-xs text-ardoise">{formatDate(u.dateCreation)}</TableCell>
                    <TableCell className="text-right">
                      <Switch defaultChecked={u.actif} onCheckedChange={(v) => toast.success(v ? "Membre activé" : "Membre suspendu", { description: `${u.prenom} ${u.nom}` })} aria-label={`Activer ${u.prenom}`} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
