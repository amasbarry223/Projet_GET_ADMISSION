"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { ShieldAlert, Loader2, Info, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditEntry = {
  id: number;
  date: string;
  userEmail: string;
  role: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string;
  ip: string | null;
};

const ACTION_TONE: Record<string, string> = {
  CREATE: "bg-vert/10 text-vert border-vert",
  UPDATE: "bg-bleu-pale text-bleu-vif border-bleu-vif",
  DELETE: "bg-carmin/10 text-carmin border-carmin",
  LOGIN: "bg-lapis/10 text-lapis border-lapis",
  LOGOUT: "bg-ardoise/10 text-ardoise border-ardoise",
  WORKFLOW: "bg-ambre/10 text-ambre border-ambre",
  VERIFY_EMAIL: "bg-violet-pale text-violet border-violet",
};

const RESOURCE_LABELS: Record<string, string> = {
  dossier: "Dossier",
  user: "Utilisateur",
  universite: "Université",
  paiement: "Paiement",
  attestation: "Attestation",
  parametre: "Paramètre",
  message: "Message",
  auth: "Auth",
};

export function AuditClient({ initialData }: { initialData: AuditEntry[] }) {
  const [data] = React.useState<AuditEntry[]>(initialData);
  const [resourceFilter, setResourceFilter] = React.useState("tous");
  const [actionFilter, setActionFilter] = React.useState("tous");

  const filtered = data.filter((l) => {
    if (resourceFilter !== "tous" && l.resource !== resourceFilter) return false;
    if (actionFilter !== "tous" && l.action !== actionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Sécurité</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Journaux d'audit.</h1>
        <p className="text-sm text-ardoise">Traçabilité de toutes les actions sensibles — qui, quoi, quand.</p>
      </div>

      <Alert className="border-ligne bg-blanc">
        <Info className="h-4 w-4 text-lapis" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Journal d'audit</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Chaque action sensible (création, modification, suppression, transition de workflow) est tracée avec l'utilisateur, la date, l'adresse IP et les détails.
        </AlertDescription>
      </Alert>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Ressource" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes les ressources</SelectItem>
            {Object.entries(RESOURCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes les actions</SelectItem>
            {Object.keys(ACTION_TONE).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-ardoise">{filtered.length} entrée(s)</span>
      </div>

      {/* Table */}
      <Card className="border-ligne bg-blanc p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto scroll-fine">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ligne">
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Date</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Utilisateur</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Rôle</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Action</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Ressource</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Détails</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-ardoise/40" strokeWidth={1.5} />
                    <p className="text-sm text-ardoise">Aucune entrée dans le journal d'audit pour ces filtres.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="border-b border-ligne last:border-0 hover:bg-porcelaine/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-ardoise whitespace-nowrap">{formatDateTime(l.date)}</td>
                    <td className="px-4 py-2.5 text-sm font-medium text-encre">{l.userEmail}</td>
                    <td className="px-4 py-2.5 text-xs text-ardoise">{l.role}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={cn("font-mono text-[10px] uppercase border", ACTION_TONE[l.action] ?? "bg-ardoise/10 text-ardoise border-ardoise")}>
                        {l.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-encre">{RESOURCE_LABELS[l.resource] ?? l.resource}</td>
                    <td className="px-4 py-2.5 text-sm text-ardoise max-w-xs truncate" title={l.details}>{l.details}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ardoise">{l.ip ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
