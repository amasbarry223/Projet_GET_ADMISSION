"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiJson } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import {
  ArrowLeft,
  Share2,
  Loader2,
  Upload,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Mail,
  Link2,
  FileDown,
  Archive,
} from "lucide-react";

export type CrousDetailData = {
  id: string;
  statut: string;
  createdAt: string;
  updatedAt: string;
  dossier: {
    id: string;
    reference: string;
    etat: string;
    candidat: { prenom: string; nom: string; email: string; telephone: string | null };
    universite: string;
    formation: string;
  };
  documents: {
    id: string;
    libelle: string;
    nomFichier: string;
    taille: string | null;
    televerseLe: string;
  }[];
  partages: {
    id: string;
    destinataire: string;
    methode: string;
    documents: string;
    statut: string;
    erreur: string | null;
    createdAt: string;
  }[];
  disponibilite: {
    infosCandidat: boolean;
    kyc: boolean;
    visa: boolean;
    accordPrealable: boolean;
    docsCrous: boolean;
  };
};

const INCLURE_OPTIONS: { key: keyof CrousDetailData["disponibilite"]; label: string }[] = [
  { key: "infosCandidat", label: "Informations candidat" },
  { key: "kyc", label: "Pièce d'identité (KYC)" },
  { key: "visa", label: "Visa" },
  { key: "accordPrealable", label: "Accord préalable d'admission" },
  { key: "docsCrous", label: "Documents de la demande CROUS" },
];

const MODE_OPTIONS: { key: "email" | "lien" | "pdf" | "zip"; label: string; icon: typeof Mail; available: boolean }[] = [
  { key: "email", label: "E-mail", icon: Mail, available: true },
  { key: "lien", label: "Lien sécurisé temporaire", icon: Link2, available: false },
  { key: "pdf", label: "Export PDF", icon: FileDown, available: false },
  { key: "zip", label: "Export ZIP complet", icon: Archive, available: false },
];

export function CrousDetailClient({ initialData }: { initialData: CrousDetailData }) {
  const [data, setData] = React.useState(initialData);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [step, setStep] = React.useState<"form" | "preview">("form");
  const [mode, setMode] = React.useState<"email" | "lien" | "pdf" | "zip">("email");
  const [destinataire, setDestinataire] = React.useState("");
  const [objet, setObjet] = React.useState(`Demande CROUS — dossier ${initialData.dossier.reference}`);
  const [message, setMessage] = React.useState(
    "Veuillez trouver ci-joint les documents relatifs à cette demande CROUS.",
  );
  const [inclure, setInclure] = React.useState<Record<string, boolean>>({
    infosCandidat: initialData.disponibilite.infosCandidat,
    kyc: false,
    visa: false,
    accordPrealable: false,
    docsCrous: false,
  });
  const [sending, setSending] = React.useState(false);

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadLibelle, setUploadLibelle] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const candidatNom = `${data.dossier.candidat.prenom} ${data.dossier.candidat.nom}`;

  const resetShareForm = () => {
    setStep("form");
    setMode("email");
    setDestinataire("");
    setObjet(`Demande CROUS — dossier ${data.dossier.reference}`);
    setMessage("Veuillez trouver ci-joint les documents relatifs à cette demande CROUS.");
    setInclure({
      infosCandidat: data.disponibilite.infosCandidat,
      kyc: false,
      visa: false,
      accordPrealable: false,
      docsCrous: false,
    });
  };

  const selectedLabels = INCLURE_OPTIONS.filter(
    (o) => inclure[o.key] && data.disponibilite[o.key],
  ).map((o) => o.label);

  const handleGoPreview = () => {
    if (!destinataire.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinataire)) {
      toast.error("Adresse e-mail destinataire invalide");
      return;
    }
    if (!objet.trim()) {
      toast.error("L'objet est requis");
      return;
    }
    setStep("preview");
  };

  const handleConfirmSend = async () => {
    setSending(true);
    const result = await apiJson<{ success: boolean; message: string }>(
      `/api/admin/crous/${data.id}/partage`,
      "POST",
      {
        mode,
        destinataire: destinataire.trim(),
        objet: objet.trim(),
        message: message.trim(),
        inclure,
      },
    );
    setSending(false);

    if (!result.ok) {
      toast.error("Échec du partage", { description: result.error });
      return;
    }

    toast.success(result.data.message);
    setShareOpen(false);
    resetShareForm();
    window.location.reload();
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Sélectionnez un fichier");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", uploadFile);
    if (uploadLibelle.trim()) form.append("libelle", uploadLibelle.trim());

    try {
      const res = await fetch(`/api/admin/crous/${data.id}/documents`, { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Téléversement échoué", { description: (body as { error?: string })?.error });
        setUploading(false);
        return;
      }
      toast.success("Document ajouté");
      setUploadOpen(false);
      setUploadFile(null);
      setUploadLibelle("");
      setData((prev) => ({
        ...prev,
        documents: [
          {
            id: body.document.id,
            libelle: body.document.libelle,
            nomFichier: body.document.nomFichier,
            taille: body.document.taille,
            televerseLe: body.document.televerseLe,
          },
          ...prev.documents,
        ],
        disponibilite: { ...prev.disponibilite, docsCrous: true },
      }));
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const result = await apiJson(`/api/admin/crous/${data.id}/documents/${docId}`, "DELETE", {});
    if (!result.ok) {
      toast.error("Suppression échouée", { description: result.error });
      return;
    }
    toast.success("Document supprimé");
    setData((prev) => {
      const documents = prev.documents.filter((d) => d.id !== docId);
      return { ...prev, documents, disponibilite: { ...prev.disponibilite, docsCrous: documents.length > 0 } };
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 text-sm">
        <Link href="/admin/crous" className="flex items-center gap-1 text-ardoise hover:text-or">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Demandes CROUS
        </Link>
        <span className="text-ardoise/50">/</span>
        <span className="font-mono text-encre">{data.dossier.reference}</span>
      </div>

      <Card className="border-ligne bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-lg font-bold text-encre">{candidatNom}</h1>
            <p className="mt-1 text-sm text-ardoise">
              Dossier <span className="font-mono">{data.dossier.reference}</span> · {data.dossier.universite} ·{" "}
              {data.dossier.formation}
            </p>
            <p className="mt-1 text-xs text-ardoise">
              {data.dossier.candidat.email}
              {data.dossier.candidat.telephone ? ` · ${data.dossier.candidat.telephone}` : ""}
            </p>
          </div>
          <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Partager la demande
          </Button>
        </div>
      </Card>

      <Card className="border-ligne bg-card p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ligne px-6 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-encre">Documents de la demande CROUS</h2>
            <p className="mt-0.5 text-xs text-ardoise">{data.documents.length} document(s)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Ajouter un document
          </Button>
        </div>
        {data.documents.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ardoise">Aucun document téléversé pour cette demande.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libellé</TableHead>
                <TableHead>Fichier</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead>Téléversé le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="text-sm font-medium text-encre">{doc.libelle}</TableCell>
                  <TableCell className="text-sm text-ardoise">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" strokeWidth={1.5} /> {doc.nomFichier}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-ardoise">{doc.taille ?? "—"}</TableCell>
                  <TableCell className="text-sm text-ardoise">{formatDateTime(doc.televerseLe)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-carmin hover:bg-carmin/5"
                      onClick={() => void handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="border-ligne bg-card p-0 overflow-hidden">
        <div className="border-b border-ligne px-6 py-4">
          <h2 className="font-display text-base font-bold text-encre">Historique des partages</h2>
          <p className="mt-0.5 text-xs text-ardoise">{data.partages.length} partage(s)</p>
        </div>
        {data.partages.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-ardoise">Cette demande n&apos;a pas encore été partagée.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.partages.map((p) => {
                let docs: string[] = [];
                try {
                  docs = JSON.parse(p.documents);
                } catch {
                  docs = [];
                }
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-ardoise">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-sm text-encre">{p.destinataire}</TableCell>
                    <TableCell className="text-sm text-ardoise capitalize">{p.methode}</TableCell>
                    <TableCell className="text-xs text-ardoise">{docs.join(", ") || "—"}</TableCell>
                    <TableCell>
                      {p.statut === "succes" ? (
                        <Badge className="border-vert bg-vert/5 font-mono text-[10px] uppercase text-vert">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Succès
                        </Badge>
                      ) : (
                        <Badge
                          className="border-carmin bg-carmin/5 font-mono text-[10px] uppercase text-carmin"
                          title={p.erreur ?? undefined}
                        >
                          <XCircle className="mr-1 h-3 w-3" /> Échec
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* --- Modal de partage --- */}
      <Dialog
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) resetShareForm();
        }}
      >
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Partager la demande CROUS</DialogTitle>
            <DialogDescription>
              Dossier {data.dossier.reference} — {candidatNom}
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MODE_OPTIONS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!m.available}
                    onClick={() => setMode(m.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs transition-colors ${
                      mode === m.key ? "border-lapis bg-lapis/5 text-lapis" : "border-ligne text-ardoise"
                    } ${!m.available ? "cursor-not-allowed opacity-50" : "hover:border-lapis/50"}`}
                    title={!m.available ? "Disponible prochainement" : undefined}
                  >
                    <m.icon className="h-4 w-4" strokeWidth={1.5} />
                    {m.label}
                  </button>
                ))}
              </div>

              {mode !== "email" && (
                <p className="rounded-md border border-ambre/40 bg-ambre/5 px-3 py-2 text-xs text-ambre">
                  Ce mode de partage n&apos;est pas encore disponible. Utilisez le mode E-mail.
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="crous-destinataire">Destinataire</Label>
                <Input
                  id="crous-destinataire"
                  type="email"
                  placeholder="service@crous.fr"
                  value={destinataire}
                  onChange={(e) => setDestinataire(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="crous-objet">Objet</Label>
                <Input id="crous-objet" value={objet} onChange={(e) => setObjet(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="crous-message">Message</Label>
                <Textarea
                  id="crous-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pièces jointes</Label>
                {INCLURE_OPTIONS.map((o) => {
                  const available = data.disponibilite[o.key];
                  return (
                    <label
                      key={o.key}
                      className={`flex items-center gap-2 text-sm ${available ? "text-encre" : "text-ardoise/50"}`}
                    >
                      <Checkbox
                        checked={!!inclure[o.key] && available}
                        disabled={!available}
                        onCheckedChange={(checked) =>
                          setInclure((prev) => ({ ...prev, [o.key]: checked === true }))
                        }
                      />
                      {o.label}
                      {!available && <span className="text-xs">(non disponible)</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-ligne bg-porcelaine/60 p-4">
                <p className="text-xs text-ardoise">À</p>
                <p className="font-medium text-encre">{destinataire}</p>
                <Separator className="my-2" />
                <p className="text-xs text-ardoise">Objet</p>
                <p className="font-medium text-encre">{objet}</p>
                <Separator className="my-2" />
                <p className="text-xs text-ardoise">Message</p>
                <p className="whitespace-pre-wrap text-encre">{message}</p>
                <Separator className="my-2" />
                <p className="text-xs text-ardoise">Pièces jointes</p>
                {selectedLabels.length ? (
                  <ul className="list-inside list-disc text-encre">
                    {selectedLabels.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ardoise">Aucune pièce jointe sélectionnée</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {step === "form" ? (
              <Button className="bg-lapis text-blanc hover:bg-lapis/90" disabled={mode !== "email"} onClick={handleGoPreview}>
                Aperçu avant envoi
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep("form")}>
                  Retour
                </Button>
                <Button
                  className="bg-lapis text-blanc hover:bg-lapis/90"
                  disabled={sending}
                  onClick={() => void handleConfirmSend()}
                >
                  {sending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                  Confirmer l&apos;envoi
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Modal d'upload de document --- */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Ajouter un document</DialogTitle>
            <DialogDescription>Document lié à la demande CROUS de {candidatNom}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="crous-doc-libelle">Libellé (optionnel)</Label>
              <Input
                id="crous-doc-libelle"
                placeholder="Ex. Justificatif de ressources"
                value={uploadLibelle}
                onChange={(e) => setUploadLibelle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crous-doc-file">Fichier (PDF, JPG, PNG, WEBP)</Label>
              <Input
                id="crous-doc-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Annuler
            </Button>
            <Button className="bg-lapis text-blanc hover:bg-lapis/90" disabled={uploading} onClick={() => void handleUpload()}>
              {uploading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Téléverser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
