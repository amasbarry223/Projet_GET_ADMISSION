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
import { VilleFranceCombobox } from "@/components/logement/ville-france-combobox";
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

export type DemandeCrousDetail = {
  id: string;
  nom: string;
  prenom: string;
  nomUsage: string | null;
  dateNaissance: string;
  lieuNaissance: string;
  paysNaissance: string;
  nationalite: string;
  sexe: "M" | "F";
  telephone: string;
  email: string;
  villeEtablissementFrance: string;
  fichierPasseportRectoUrl?: string | null;
  fichierPasseportVersoUrl?: string | null;
  fichierAttestationAccordPrealableUrl?: string | null;
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
  DemandeCrousDetail,
  "id" | "statut" | "motifCorrection" | "createdAt" | "candidatNomComplet"
>;

function toFormValues(r: DemandeCrousDetail): FormValues {
  return {
    nom: r.nom,
    prenom: r.prenom,
    nomUsage: r.nomUsage,
    dateNaissance: r.dateNaissance,
    lieuNaissance: r.lieuNaissance,
    paysNaissance: r.paysNaissance,
    nationalite: r.nationalite,
    sexe: r.sexe,
    telephone: r.telephone,
    email: r.email,
    villeEtablissementFrance: r.villeEtablissementFrance,
  };
}

export function DemandeCrousDetailClient({ demande: initial }: { demande: DemandeCrousDetail }) {
  const router = useRouter();
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.role, "logement.write");

  const [demande, setDemande] = React.useState(initial);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<FormValues>(() => toFormValues(initial));
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [correctionOpen, setCorrectionOpen] = React.useState(false);
  const [motif, setMotif] = React.useState("");
  const [submittingCorrection, setSubmittingCorrection] = React.useState(false);

  const startEdit = () => {
    setForm(toFormValues(demande));
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const result = await apiJson<DemandeCrousDetail>(`/api/admin/logement/crous/${demande.id}`, "PUT", form);
    setSaving(false);
    if (!result.ok) {
      toast.error("Modification impossible", { description: result.error });
      return;
    }
    setDemande((prev) => ({ ...prev, ...form }));
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
    const result = await apiJson<DemandeCrousDetail>(`/api/admin/logement/crous/${demande.id}/correction`, "POST", {
      motif: trimmed,
    });
    setSubmittingCorrection(false);
    if (!result.ok) {
      toast.error("Échec de la demande de correction", { description: result.error });
      return;
    }
    setDemande((prev) => ({ ...prev, statut: "correction_demandee", motifCorrection: trimmed }));
    setCorrectionOpen(false);
    toast.success("Correction demandée", { description: "Le candidat a été notifié." });
    router.refresh();
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const result = await apiJson(`/api/admin/logement/crous/${demande.id}`, "DELETE");
    setDeleting(false);
    if (!result.ok) {
      toast.error("Suppression impossible", { description: result.error });
      return;
    }
    toast.success("Demande supprimée");
    router.push("/admin/logement?tab=crous");
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
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 text-ardoise"
            onClick={() => router.push("/admin/logement?tab=crous")}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Retour aux demandes
          </Button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
            {demande.prenom} {demande.nom}
          </h1>
          <p className="text-sm text-ardoise">Candidat : {demande.candidatNomComplet}</p>
        </div>
        <Badge className={`font-mono text-[10px] uppercase ${STATUT_TONE[demande.statut?.toLowerCase()] ?? STATUT_TONE[demande.statut] ?? "text-vert border-vert bg-vert/5"}`}>
          {STATUT_LABEL[demande.statut?.toLowerCase()] ?? STATUT_LABEL[demande.statut] ?? demande.statut}
        </Badge>
      </div>

      {demande.statut === "correction_demandee" && demande.motifCorrection && (
        <Card className="border-lapis/30 bg-lapis/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-lapis">
            <MessageSquareWarning className="h-3.5 w-3.5" strokeWidth={1.5} /> Motif envoyé au candidat
          </p>
          <p className="mt-1 text-sm text-encre">{demande.motifCorrection}</p>
        </Card>
      )}

      <Card className="border-ligne bg-card p-5">
        {!editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {field("Nom", demande.nom)}
            {field("Prénom", demande.prenom)}
            {field("Nom d'usage", demande.nomUsage || "—")}
            {field("Date de naissance", demande.dateNaissance)}
            {field("Lieu de naissance", demande.lieuNaissance)}
            {field("Pays de naissance", demande.paysNaissance)}
            {field("Nationalité", demande.nationalite)}
            {field("Sexe", demande.sexe === "M" ? "Masculin" : "Féminin")}
            {field("Téléphone", demande.telephone)}
            {field("E-mail", demande.email)}
            {field("Ville d'établissement (France)", demande.villeEtablissementFrance)}
            {field("Soumise le", formatDateTime(demande.createdAt))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Prénom</Label>
              <Input value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nom d&apos;usage</Label>
              <Input
                value={form.nomUsage ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, nomUsage: e.target.value }))}
              />
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
              <Label>Sexe</Label>
              <Select value={form.sexe} onValueChange={(v) => setForm((f) => ({ ...f, sexe: v as "M" | "F" }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lieu de naissance</Label>
              <Input
                value={form.lieuNaissance}
                onChange={(e) => setForm((f) => ({ ...f, lieuNaissance: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pays de naissance</Label>
              <Input
                value={form.paysNaissance}
                onChange={(e) => setForm((f) => ({ ...f, paysNaissance: e.target.value }))}
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
            <div className="space-y-1.5">
              <Label>Ville d&apos;établissement (France)</Label>
              <VilleFranceCombobox
                value={form.villeEtablissementFrance}
                onChange={(v) => setForm((f) => ({ ...f, villeEtablissementFrance: v }))}
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
              onClick={() => window.open(`/api/admin/logement/crous/${demande.id}/print`, "_blank")}
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
                    La demande de {demande.prenom} {demande.nom} sera définitivement supprimée. Action irréversible.
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
            Documents uploadés ({[demande.fichierPasseportRectoUrl, demande.fichierPasseportVersoUrl, demande.fichierAttestationAccordPrealableUrl].filter(Boolean).length})
          </h2>
          <p className="text-xs text-ardoise mt-0.5">
            Fichiers joints transmis par le candidat pour sa demande de logement CROUS.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Fichier Passeport Recto */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-ligne bg-porcelaine/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-md bg-vert/10 text-vert">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-encre truncate">Passeport (Recto)</p>
                <p className="text-xs text-ardoise">Pièce d&apos;identité recto</p>
              </div>
            </div>
            {demande.fichierPasseportRectoUrl ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(`/api/admin/logement/crous/${demande.id}/files/passeport_recto?disposition=inline`, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" /> Voir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-ardoise hover:text-encre"
                  title="Télécharger"
                  onClick={() => window.open(`/api/admin/logement/crous/${demande.id}/files/passeport_recto?disposition=attachment`, "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="text-ardoise text-[11px]">Non téléversé</Badge>
            )}
          </div>

          {/* Fichier Passeport Verso */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-ligne bg-porcelaine/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-md bg-vert/10 text-vert">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-encre truncate">Passeport (Verso)</p>
                <p className="text-xs text-ardoise">Pièce d&apos;identité verso</p>
              </div>
            </div>
            {demande.fichierPasseportVersoUrl ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(`/api/admin/logement/crous/${demande.id}/files/passeport_verso?disposition=inline`, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" /> Voir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-ardoise hover:text-encre"
                  title="Télécharger"
                  onClick={() => window.open(`/api/admin/logement/crous/${demande.id}/files/passeport_verso?disposition=attachment`, "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Badge variant="outline" className="text-ardoise text-[11px]">Non téléversé</Badge>
            )}
          </div>

          {/* Fichier Attestation Accord Prealable */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border border-ligne bg-porcelaine/50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-md bg-lapis/10 text-lapis">
                <FileText className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-encre truncate">Attestation préalable</p>
                <p className="text-xs text-ardoise">Accord préalable / Inscription</p>
              </div>
            </div>
            {demande.fichierAttestationAccordPrealableUrl ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => window.open(`/api/admin/logement/crous/${demande.id}/files/attestation?disposition=inline`, "_blank")}
                >
                  <Eye className="h-3.5 w-3.5" /> Voir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-ardoise hover:text-encre"
                  title="Télécharger"
                  onClick={() => window.open(`/api/admin/logement/crous/${demande.id}/files/attestation?disposition=attachment`, "_blank")}
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
              Le motif sera envoyé à {demande.prenom} (message + notification) et la demande repassera en
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
