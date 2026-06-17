"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { dossierParId } from "@/lib/mock/dossiers";
import { formationParId } from "@/lib/mock/formations";
import { UNIVERSITES } from "@/lib/mock/universites";
import { etatParCode, ETATS, COULEUR_BADGE } from "@/lib/mock/etats";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, Send, Wallet, Stamp, XCircle, History, MessageSquare, User, ShieldCheck, Eye, AlertTriangle, Info } from "lucide-react";

type ActionDef = {
  label: string;
  icon: React.ElementType;
  tone: "primary" | "outline" | "danger";
  toastLabel: string;
  toastDesc: string;
  confirm?: { title: string; desc: string };
};

export default function AdminDossierDetail() {
  const params = useParams<{ id: string }>();
  const dossier = dossierParId(params.id);
  if (!dossier) notFound();

  const e = etatParCode(dossier.etat);
  const c = COULEUR_BADGE[e.couleur];
  const form = formationParId(dossier.formationId);
  const univ = UNIVERSITES.find((u) => u.id === dossier.universiteId);

  const actions: ActionDef[] = [];
  if (dossier.etat === "soumis" || dossier.etat === "verification") {
    actions.push({ label: "Vérifier le dossier", icon: ShieldCheck, tone: "primary", toastLabel: "Dossier vérifié", toastDesc: "Transition vers « Paiement en attente »." });
    actions.push({ label: "Demander correction", icon: AlertCircle, tone: "outline", toastLabel: "Correction demandée", toastDesc: "Le candidat a été notifié.", confirm: { title: "Demander une correction ?", desc: `Le candidat ${dossier.candidatPrenom} sera notifié et le dossier repassera en « À corriger ».` } });
  }
  if (dossier.etat === "correction") {
    actions.push({ label: "Vérifier les corrections", icon: ShieldCheck, tone: "primary", toastLabel: "Corrections vérifiées", toastDesc: "Le dossier reprend son parcours." });
  }
  if (dossier.etat === "paiement_attente") {
    actions.push({ label: "Confirmer le paiement", icon: Wallet, tone: "primary", toastLabel: "Paiement confirmé", toastDesc: "Dossier prêt à être transmis.", confirm: { title: "Confirmer le paiement ?", desc: `Vérifiez que les ${formatFCFA(dossier.fraisAgence)} ont bien été reçus avant de confirmer.` } });
  }
  if (dossier.etat === "paiement_confirme") {
    actions.push({ label: "Transmettre à l'université", icon: Send, tone: "primary", toastLabel: "Dossier transmis", toastDesc: `${univ?.nom} a été notifié.`, confirm: { title: "Transmettre à l'université ?", desc: `Le dossier sera envoyé à ${univ?.nom}. Cette action est irréversible.` } });
  }
  if (dossier.etat === "attente_reponse") {
    actions.push({ label: "Marquer accepté", icon: CheckCircle2, tone: "primary", toastLabel: "Pré-admission accordée", toastDesc: "Attestation à émettre sous 48h.", confirm: { title: "Marquer la candidature acceptée ?", desc: `L'université ${univ?.nom} a accordé la pré-admission. L'attestation pourra ensuite être émise.` } });
    actions.push({ label: "Marquer refusé", icon: XCircle, tone: "danger", toastLabel: "Candidature refusée", toastDesc: "Le candidat a été informé.", confirm: { title: "Marquer la candidature refusée ?", desc: `Cette action notifiera ${dossier.candidatPrenom} du refus de ${univ?.nom}.` } });
  }
  if (dossier.etat === "pre_admission") {
    actions.push({ label: "Émettre l'attestation", icon: Stamp, tone: "primary", toastLabel: "Attestation émise", toastDesc: "Disponible dans l'espace candidat.", confirm: { title: "Émettre l'attestation ?", desc: "L'attestation de pré-inscription sera générée avec sceau officiel et code de vérification." } });
  }

  const execAction = (a: ActionDef) => () => toast.success(a.toastLabel, { description: a.toastDesc });

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/admin/dossiers" className="flex items-center gap-1 text-ardoise hover:text-lapis">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Dossiers
        </Link>
        <span className="text-ardoise/50">/</span>
        <span className="font-mono text-encre">{dossier.reference}</span>
      </div>

      {/* Boarding pass */}
      <BoardingPass
        variant="large"
        reference={dossier.reference}
        universiteNom={univ?.nom ?? ""}
        formationLabel={`${form?.niveau ?? ""} · ${form?.intitule ?? ""}`}
        etat={dossier.etat}
        etapeActuelle={dossier.etapeActuelle}
        etapeTotal={12}
        conseiller={dossier.conseillerNom}
        fraisAgence={dossier.fraisAgence}
        mrz={dossier.mrz}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Main: tabs */}
        <Tabs defaultValue="profil">
          <TabsList className="bg-porcelaine">
            <TabsTrigger value="profil"><User className="mr-1.5 h-3.5 w-3.5" /> Profil candidat</TabsTrigger>
            <TabsTrigger value="pieces"><FileText className="mr-1.5 h-3.5 w-3.5" /> Pièces</TabsTrigger>
            <TabsTrigger value="paiements"><Wallet className="mr-1.5 h-3.5 w-3.5" /> Paiements</TabsTrigger>
            <TabsTrigger value="historique"><History className="mr-1.5 h-3.5 w-3.5" /> Historique</TabsTrigger>
            <TabsTrigger value="messages"><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="profil">
            <Card className="border-ligne bg-blanc p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-ligne">
                  <AvatarFallback className="bg-lapis/10 font-mono text-base font-bold text-lapis">{dossier.candidatNom.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-display text-lg font-bold text-encre">{dossier.candidatPrenom} {dossier.candidatNom}</h2>
                  <p className="text-sm text-ardoise">Nationalité : {dossier.candidatNationalite}</p>
                </div>
              </div>
              <Separator className="my-4 bg-ligne" />
              <dl className="grid gap-3 sm:grid-cols-2">
                <Field label="E-mail" value="fatou.diallo@demo.getadm" />
                <Field label="Téléphone" value="+221 77 123 45 67" />
                <Field label="Université" value={univ?.nom ?? ""} />
                <Field label="Formation" value={form?.intitule ?? ""} />
                <Field label="Niveau" value={form?.niveau ?? ""} />
                <Field label="Domaine" value={form?.domaine ?? ""} />
                <Field label="Frais d'agence" value={formatFCFA(dossier.fraisAgence)} mono />
                <Field label="Date de création" value={formatDate(dossier.dateCreation)} />
              </dl>
            </Card>
          </TabsContent>

          <TabsContent value="pieces">
            <Card className="border-ligne bg-blanc p-0 overflow-hidden">
              <div className="border-b border-ligne px-6 py-4">
                <p className="eyebrow">Pièces du dossier</p>
                <h2 className="font-display text-base font-bold text-encre">{dossier.pieces.length} document(s)</h2>
              </div>
              <ul className="divide-y divide-ligne">
                {dossier.pieces.map((p) => {
                  const cfg = {
                    manquante: { icon: AlertCircle, color: "text-carmin", bg: "bg-carmin/5", label: "Manquante" },
                    televersee: { icon: FileText, color: "text-lapis", bg: "bg-lapis/5", label: "Téléversée" },
                    a_corriger: { icon: AlertCircle, color: "text-ambre", bg: "bg-ambre/5", label: "À corriger" },
                    validee: { icon: CheckCircle2, color: "text-vert", bg: "bg-vert/5", label: "Validée" },
                  }[p.statut];
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", cfg.bg, cfg.color)}>
                        <cfg.icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-encre">{p.libelle}</p>
                        {p.taille && <p className="font-mono text-[11px] text-ardoise">{p.taille}{p.televerseeLe ? ` · ${formatDate(p.televerseeLe)}` : ""}</p>}
                      </div>
                      <Badge className={cn("font-mono text-[10px] uppercase", cfg.color, "border-current")}>{cfg.label}</Badge>
                      <Button variant="ghost" size="icon" aria-label="Voir la pièce"><Eye className="h-4 w-4" strokeWidth={1.5} /></Button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="paiements">
            <Card className="border-ligne bg-blanc p-0 overflow-hidden">
              <div className="border-b border-ligne px-6 py-4">
                <p className="eyebrow">Transactions</p>
                <h2 className="font-display text-base font-bold text-encre">{dossier.paiements.length} paiement(s)</h2>
              </div>
              {dossier.paiements.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-ardoise">Aucun paiement enregistré pour ce dossier.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-mono text-[10px] uppercase text-ardoise">Référence</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase text-ardoise">Date</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase text-ardoise">Moyen</TableHead>
                      <TableHead className="text-right font-mono text-[10px] uppercase text-ardoise">Montant</TableHead>
                      <TableHead className="text-right font-mono text-[10px] uppercase text-ardoise">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossier.paiements.map((p) => (
                      <TableRow key={p.id} className="border-ligne">
                        <TableCell className="font-mono text-xs text-encre">{p.reference}</TableCell>
                        <TableCell className="text-sm text-encre">{formatDate(p.date)}</TableCell>
                        <TableCell className="text-sm text-encre">{p.moyen}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-encre">{formatFCFA(p.montant)}</TableCell>
                        <TableCell className="text-right"><Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">{p.statut}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="historique">
            <Card className="border-ligne bg-blanc p-6">
              <p className="eyebrow">Journal horodaté</p>
              <h2 className="font-display text-base font-bold text-encre">Historique du dossier</h2>
              <ol className="mt-4 space-y-3">
                {dossier.historique.slice().reverse().map((h) => {
                  const he = etatParCode(h.etat);
                  const hc = COULEUR_BADGE[he.couleur];
                  return (
                    <li key={h.id} className="flex gap-3">
                      <div className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-mono font-semibold", hc.bg, hc.text)}>{he.ordre}</div>
                      <div className="flex-1 border-b border-ligne pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-encre">{he.libelle}</p>
                          <span className="font-mono text-[10px] text-ardoise">{formatDateTime(h.date)}</span>
                          <span className="text-xs text-ardoise">· {h.auteur}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-ardoise">{h.note}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="border-ligne bg-blanc p-6">
              <p className="eyebrow">Messagerie</p>
              <h2 className="font-display text-base font-bold text-encre">Conversation avec {dossier.candidatPrenom}</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-md border border-ligne bg-blanc px-3.5 py-2.5 text-sm text-encre">
                  Bonjour {dossier.candidatPrenom}, votre dossier a bien été reçu. Je démarre la vérification.
                  <p className="mt-1 font-mono text-[10px] text-ardoise">14 janvier 2026 · 14:30 — {dossier.conseillerNom}</p>
                </div>
                <div className="ml-auto max-w-[80%] rounded-md bg-lapis px-3.5 py-2.5 text-sm text-blanc">
                  Bonjour Madame, merci beaucoup. Faut-il fournir une copie certifiée du diplôme ?
                  <p className="mt-1 font-mono text-[10px] text-blanc/60">14 janvier 2026 · 15:02 — {dossier.candidatPrenom}</p>
                </div>
              </div>
              <Button variant="outline" className="mt-4" onClick={() => toast.success("Ouverture de la messagerie")}>
                <MessageSquare className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Ouvrir la conversation
              </Button>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sidebar: workflow + statut */}
        <div className="space-y-4">
          <Card className="border-ligne bg-blanc p-5">
            <p className="eyebrow">Statut courant</p>
            <Badge className={cn("mt-2 font-mono text-[10px] uppercase", c.text, c.border, c.bg)}>{e.libelle}</Badge>
            <p className="mt-2 text-xs text-ardoise">{e.description}</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-ardoise">Progression</span>
                <span className="font-mono text-encre">{dossier.etapeActuelle}/12</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ligne">
                <div className="h-full bg-lapis" style={{ width: `${(dossier.etapeActuelle / 12) * 100}%` }} />
              </div>
            </div>
          </Card>

          <Card className="border-ligne bg-blanc p-5">
            <p className="eyebrow">Conseiller affecté</p>
            <div className="mt-2 flex items-center gap-2.5">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-lapis/10 font-mono text-[10px] font-semibold text-lapis">{dossier.conseillerNom.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
              <div>
                <p className="text-sm font-medium text-encre">{dossier.conseillerNom}</p>
                <p className="text-xs text-ardoise">Conseiller(ère)</p>
              </div>
            </div>
          </Card>

          {actions.length > 0 && (
            <Card className="border-lapis/30 bg-lapis/5 p-5">
              <p className="eyebrow">Prochaine transition</p>
              <p className="mt-1 text-sm font-medium text-encre">Actions de workflow</p>
              <div className="mt-3 space-y-2">
                {actions.map((a) =>
                  a.confirm ? (
                    <AlertDialog key={a.label}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={a.tone === "primary" ? "default" : a.tone === "danger" ? "outline" : "outline"}
                          className={cn("w-full justify-start", a.tone === "primary" && "bg-lapis text-blanc hover:bg-lapis/90", a.tone === "danger" && "border-carmin/40 text-carmin hover:bg-carmin/5")}
                          size="sm"
                        >
                          <a.icon className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {a.label}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-blanc">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-display text-lg flex items-center gap-2">
                            {a.tone === "danger" ? <AlertTriangle className="h-5 w-5 text-carmin" strokeWidth={1.5} /> : <Info className="h-5 w-5 text-lapis" strokeWidth={1.5} />}
                            {a.confirm.title}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm text-ardoise">{a.confirm.desc}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-porcelaine">Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className={cn(a.tone === "danger" ? "bg-carmin text-blanc hover:bg-carmin/90" : "bg-lapis text-blanc hover:bg-lapis/90")}
                            onClick={execAction(a)}
                          >
                            Confirmer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      key={a.label}
                      variant={a.tone === "primary" ? "default" : "outline"}
                      className={cn("w-full justify-start", a.tone === "primary" && "bg-lapis text-blanc hover:bg-lapis/90")}
                      size="sm"
                      onClick={execAction(a)}
                    >
                      <a.icon className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {a.label}
                    </Button>
                  )
                )}
              </div>
            </Card>
          )}

          {dossier.etat === "refuse" && (
            <Alert className="border-carmin/40 bg-carmin/5">
              <XCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
              <AlertTitle className="font-display text-sm font-bold text-carmin">Candidature refusée</AlertTitle>
              <AlertDescription className="text-sm text-ardoise">
                L'université a décliné cette candidature. Contactez le candidat pour l'accompagner vers une alternative.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ligne/60 pb-2">
      <span className="text-xs text-ardoise">{label}</span>
      <span className={cn("text-sm font-medium text-encre text-right", mono && "font-mono")}>{value}</span>
    </div>
  );
}
