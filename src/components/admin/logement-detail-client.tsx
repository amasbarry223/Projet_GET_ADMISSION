"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { apiJson } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import {
  Download,
  Eye,
  FileText,
  ArrowLeft,
  Loader2,
  Pencil,
  Printer,
  Trash2,
  AlertTriangle,
  MessageSquareWarning,
} from "lucide-react";

type Statut = "soumis" | "en_cours_traitement" | "correction_demandee" | "traite";

export type LogementReservationDetail = {
  id: string;
  civilite: "M" | "MME";
  nom: string;
  prenom: string;
  dateNaissance: string;
  nationalite: string;
  telephone: string;
  email: string;
  agenceAccompagnante: string | null;
  numeroPasseport: string;
  paysDemandeVisa: string;
  villeEtablissementFrance: string;
  dateArriveePrevue: string;
  fichierPasseportUrl?: string | null;
  fichierAttestationInscriptionUrl?: string | null;
  statut: Statut;
  motifCorrection: string | null;
  createdAt: string;
  candidatNomComplet: string;
};

const STATUT_LABEL: Record<string, string> = {
  soumis: "Soumise",
  en_cours_traitement: "En cours de traitement",
  correction_demandee: "Correction demandée",
  traite: "Traité",
};

const STATUT_TONE: Record<string, string> = {
  soumis: "text-ambre border-ambre bg-ambre/5",
  en_cours_traitement: "text-vert border-vert bg-vert/5",
  correction_demandee: "text-lapis border-lapis bg-lapis/5",
  traite: "text-vert border-vert bg-vert/10 font-bold",
};

type FormValues = Omit<
  LogementReservationDetail,
  "id" | "statut" | "motifCorrection" | "createdAt" | "candidatNomComplet"
>;

function toFormValues(r: LogementReservationDetail): FormValues {
  return {
    civilite: r.civilite,
    nom: r.nom,
    prenom: r.prenom,
    dateNaissance: r.dateNaissance,
    nationalite: r.nationalite,
    telephone: r.telephone,
    email: r.email,
    agenceAccompagnante: r.agenceAccompagnante,
    numeroPasseport: r.numeroPasseport,
    paysDemandeVisa: r.paysDemandeVisa,
    villeEtablissementFrance: r.villeEtablissementFrance,
    dateArriveePrevue: r.dateArriveePrevue,
  };
}

export function LogementDetailClient({ reservation: initial }: { reservation: LogementReservationDetail }) {
  const router = useRouter();
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.role, "logement.write");

  const [reservation, setReservation] = React.useState(initial);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<FormValues>(() => toFormValues(initial));
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [correctionOpen, setCorrectionOpen] = React.useState(false);
  const [motif, setMotif] = React.useState("");
  const [submittingCorrection, setSubmittingCorrection] = React.useState(false);

  const startEdit = () => {
    setForm(toFormValues(reservation));
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const result = await apiJson<LogementReservationDetail>(`/api/admin/logement/${reservation.id}`, "PUT", form);
    setSaving(false);
    if (!result.ok) {
      toast.error("Modification impossible", { description: result.error });
      return;
    }
    setReservation((prev) => ({ ...prev, ...form }));
    setEditing(false);
    toast.success("Demande mise à jour");
    router.refresh();
  };

  const openCorrectionDialog = () => {
    setMotif("");
    setCorrectionOpen(true);
  };

  const confirmCorrection = async () => {
    const trimmed = motif.trim();
    if (!trimmed) return;
    setSubmittingCorrection(true);
    const result = await apiJson<LogementReservationDetail>(`/api/admin/logement/${reservation.id}/correction`, "POST", {
      motif: trimmed,
    });
    setSubmittingCorrection(false);
    if (!result.ok) {
      toast.error("Échec de la demande de correction", { description: result.error });
      return;
    }
    setReservation((prev) => ({ ...prev, statut: "correction_demandee", motifCorrection: trimmed }));
    setCorrectionOpen(false);
    toast.success("Correction demandée", { description: "Le candidat a été notifié." });
    router.refresh();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const result = await apiJson(`/api/admin/logement/${reservation.id}`, "DELETE");
    setDeleting(false);
    if (!result.ok) {
      toast.error("Suppression impossible", { description: result.error });
      return;
    }
    toast.success("Demande supprimée");
    router.push("/admin/logement");
  };

  const field = (label: string, value: React.ReactNode) => (
    <div>
      <p className="text-xs font-medium text-ardoise">{label}</p>
      <p className="mt-0.5 text-sm text-encre">{value}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-ardoise" onClick={() => router.push("/admin/logement")}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Retour aux demandes
          </Button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            {reservation.prenom} {reservation.nom}
          </h1>
          <p className="text-sm text-ardoise">Candidat : {reservation.candidatNomComplet}</p>
        </div>
        <Badge className={`font-mono text-[10px] uppercase ${STATUT_TONE[reservation.statut?.toLowerCase()] ?? STATUT_TONE[reservation.statut] ?? "text-vert border-vert bg-vert/5"}`}>
          {STATUT_LABEL[reservation.statut?.toLowerCase()] ?? STATUT_LABEL[reservation.statut] ?? reservation.statut}
        </Badge>
      </div>

      {reservation.statut === "correction_demandee" && reservation.motifCorrection && (
        <Card className="border-lapis/30 bg-lapis/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-lapis">
            <MessageSquareWarning className="h-3.5 w-3.5" strokeWidth={1.5} /> Motif envoyé au candidat
          </p>
          <p className="mt-1 text-sm text-encre">{reservation.motifCorrection}</p>
        </Card>
      )}

      <Card className="border-ligne bg-card p-5">
        {!editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {field("Civilité", reservation.civilite === "M" ? "Monsieur" : "Madame")}
            {field("Nom", reservation.nom)}
            {field("Prénom", reservation.prenom)}
            {field("Date de naissance", reservation.dateNaissance)}
            {field("Nationalité", reservation.nationalite)}
            {field("Téléphone", reservation.telephone)}
            {field("E-mail", reservation.email)}
            {field("Agence accompagnante", reservation.agenceAccompagnante || "—")}
            {field("N° passeport", reservation.numeroPasseport)}
            {field("Pays de demande de visa", reservation.paysDemandeVisa)}
            {field("Ville d'établissement (France)", reservation.villeEtablissementFrance)}
            {field("Date d'arrivée prévue", reservation.dateArriveePrevue)}
            {field("Soumise le", formatDateTime(reservation.createdAt))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Civilité</Label>
              <Select value={form.civilite} onValueChange={(v) => setForm((f) => ({ ...f, civilite: v as "M" | "MME" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Monsieur</SelectItem>
                  <SelectItem value="MME">Madame</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div />
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date de naissance</Label>
              <Input
                type="date"
                value={form.dateNaissance}
                onChange={(e) => setForm((f) => ({ ...f, dateNaissance: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nationalité</Label>
              <Input value={form.nationalite} onChange={(e) => setForm((f) => ({ ...f, nationalite: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Agence accompagnante</Label>
              <Input
                value={form.agenceAccompagnante ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, agenceAccompagnante: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>N° passeport</Label>
              <Input
                value={form.numeroPasseport}
                onChange={(e) => setForm((f) => ({ ...f, numeroPasseport: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pays de demande de visa</Label>
              <Input
                value={form.paysDemandeVisa}
                onChange={(e) => setForm((f) => ({ ...f, paysDemandeVisa: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ville d&apos;établissement (France)</Label>
              <Input
                value={form.villeEtablissementFrance}
                onChange={(e) => setForm((f) => ({ ...f, villeEtablissementFrance: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date d&apos;arrivée prévue</Label>
              <Input
                type="date"
                value={form.dateArriveePrevue}
                onChange={(e) => setForm((f) => ({ ...f, dateArriveePrevue: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ligne pt-4">
          {canWrite && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Modifier
            </Button>
          )}
          {editing && (
            <>
              <Button size="sm" className="bg-lapis text-blanc hover:bg-lapis/90" disabled={saving} onClick={() => void saveEdit()}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
                Enregistrer
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </>
          )}
          {canWrite && !editing && (
            <Button variant="outline" size="sm" onClick={openCorrectionDialog}>
              <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Demander une correction
            </Button>
          )}
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/admin/logement/${reservation.id}/print`, "_blank")}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Imprimer
            </Button>
          )}
          {canWrite && !editing && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-carmin/40 text-carmin hover:bg-carmin/5">
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-carmin" strokeWidth={1.5} /> Supprimer cette demande ?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-ardoise">
                    La demande de {reservation.prenom} {reservation.nom} sera définitivement supprimée. Action irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-carmin text-blanc hover:bg-carmin/90"
                    disabled={deleting}
                    onClick={() => void confirmDelete()}
                  >
                    {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </Card>

      {/* Section Documents uploadés */}
      <Card className="border-ligne bg-card p-5 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-encre flex items-center gap-2">
            <FileText className="h-5 w-5 text-vert" strokeWidth={1.5} />
            Documents uploadés ({[reservation.fichierPasseportUrl, reservation.fichierAttestationInscriptionUrl].filter(Boolean).length})
          </h2>
          <p className="text-xs text-ardoise mt-0.5">
            Fichiers joints transmis par le candidat pour sa demande de logement.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Fichier Passeport / CNI */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-ligne bg-porcelaine/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-md bg-vert/10 text-vert">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-encre truncate">Passeport / CNI</p>
                <p className="text-xs text-ardoise">Pièce d&apos;identité du candidat</p>
              </div>
            </div>
            {reservation.fichierPasseportUrl ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(`/api/admin/logement/${reservation.id}/files/passeport?disposition=inline`, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" /> Voir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-ardoise hover:text-encre"
                  title="Télécharger"
                  onClick={() => window.open(`/api/admin/logement/${reservation.id}/files/passeport?disposition=attachment`, "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="text-ardoise text-[11px]">Non téléversé</Badge>
            )}
          </div>

          {/* Fichier Attestation Inscription */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-ligne bg-porcelaine/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-md bg-lapis/10 text-lapis">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-encre truncate">Attestation d&apos;inscription</p>
                <p className="text-xs text-ardoise">Justificatif d&apos;admission / Inscription</p>
              </div>
            </div>
            {reservation.fichierAttestationInscriptionUrl ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(`/api/admin/logement/${reservation.id}/files/attestation?disposition=inline`, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" /> Voir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-ardoise hover:text-encre"
                  title="Télécharger"
                  onClick={() => window.open(`/api/admin/logement/${reservation.id}/files/attestation?disposition=attachment`, "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="text-ardoise text-[11px]">Non téléversé</Badge>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander une correction</DialogTitle>
            <DialogDescription>
              Le motif sera envoyé à {reservation.prenom} (message + notification) et la demande repassera en
              « Correction demandée » jusqu&apos;à ce que le candidat la corrige et la resoumette.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Décrivez précisément ce qui doit être corrigé…"
              rows={5}
              aria-label="Motif de la demande de correction"
            />
            {motif.trim().length === 0 && <p className="text-xs text-carmin">Le motif est obligatoire.</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={motif.trim().length === 0 || submittingCorrection}
              onClick={() => void confirmCorrection()}
            >
              {submittingCorrection && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
