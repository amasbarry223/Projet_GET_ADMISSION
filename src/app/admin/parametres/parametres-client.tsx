"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { apiFetch, apiJson } from "@/lib/api-client";
import { toast } from "sonner";
import { Lock, Save, ShieldCheck, CreditCard, Bell, GitBranch, Loader2, FileText, Database, Download, Upload, AlertTriangle } from "lucide-react";

const RESET_CONFIRM_PHRASE = "REINITIALISER";
const IMPORT_CONFIRM_PHRASE = "IMPORTER";
const BACKUP_APP_NAME = "GET Admission";

type PendingBackup = {
  backup: Record<string, unknown>;
  totalRows: number;
  generatedAt: string | undefined;
  generatedBy: string | undefined;
};

type ParamsState = {
  fraisMin: string;
  fraisMax: string;
  fraisAgencePublic: string;
  fraisAgencePrive: string;
  paiementTranches: boolean;
  notifEmail: boolean;
  notifInApp: boolean;
  workflowStrict: boolean;
  exigerEmailVerifie: boolean;
  mentionsLegales: string;
  politiqueConfidentialite: string;
};

export default function AdminParametresClient() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [form, setForm] = React.useState<ParamsState>({
    fraisMin: "",
    fraisMax: "",
    fraisAgencePublic: "65000",
    fraisAgencePrive: "110000",
    paiementTranches: true,
    notifEmail: true,
    notifInApp: true,
    workflowStrict: true,
    exigerEmailVerifie: false,
    mentionsLegales: "",
    politiqueConfidentialite: "",
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [hasExported, setHasExported] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetConfirmText, setResetConfirmText] = React.useState("");
  const [resetting, setResetting] = React.useState(false);

  const importFileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = React.useState<PendingBackup | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importConfirmText, setImportConfirmText] = React.useState("");
  const [importing, setImporting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void apiFetch<Record<string, unknown>>("/api/admin/parametres").then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        toast.error("Chargement échoué", { description: result.error });
        setLoading(false);
        return;
      }
      const data = result.data;
      setForm({
        fraisMin: String(data.fraisMin ?? ""),
        fraisMax: String(data.fraisMax ?? ""),
        fraisAgencePublic: String(data.fraisAgencePublic ?? data.fraisMin ?? 65000),
        fraisAgencePrive: String(data.fraisAgencePrive ?? data.fraisMax ?? 110000),
        paiementTranches: !!data.paiementTranches,
        notifEmail: data.notifEmail !== false,
        notifInApp: data.notifInApp !== false,
        workflowStrict: data.workflowStrict !== false,
        exigerEmailVerifie: !!data.exigerEmailVerifie,
        mentionsLegales: String(data.mentionsLegales ?? ""),
        politiqueConfidentialite: String(data.politiqueConfidentialite ?? ""),
      });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof ParamsState>(key: K, value: ParamsState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const publicAmt = Number(form.fraisAgencePublic) || 0;
    const priveAmt = Number(form.fraisAgencePrive) || 0;
    const result = await apiJson("/api/admin/parametres", "PUT", {
      fraisAgencePublic: publicAmt,
      fraisAgencePrive: priveAmt,
      fraisMin: publicAmt,
      fraisMax: priveAmt,
      paiementTranches: form.paiementTranches,
      notifEmail: form.notifEmail,
      notifInApp: form.notifInApp,
      workflowStrict: form.workflowStrict,
      exigerEmailVerifie: form.exigerEmailVerifie,
      mentionsLegales: form.mentionsLegales,
      politiqueConfidentialite: form.politiqueConfidentialite,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error("Enregistrement échoué", { description: result.error });
      return;
    }
    toast.success("Paramètres enregistrés");
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/backup/export");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Export échoué");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `getadmission-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setHasExported(true);
      toast.success("Export généré", { description: "Le fichier JSON a été téléchargé." });
    } catch (e) {
      toast.error("Export échoué", { description: e instanceof Error ? e.message : "Erreur inconnue" });
    } finally {
      setExporting(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    const result = await apiJson<{ deleted: { dossiers: number; notifications: number; auditLogs: number } }>(
      "/api/admin/backup/reset",
      "POST",
      { confirm: resetConfirmText },
    );
    setResetting(false);
    if (!result.ok) {
      toast.error("Réinitialisation échouée", { description: result.error });
      return;
    }
    setResetOpen(false);
    setResetConfirmText("");
    const { dossiers, notifications, auditLogs } = result.data.deleted;
    toast.success("Données d'activité réinitialisées", {
      description: `${dossiers} dossier(s), ${notifications} notification(s), ${auditLogs} entrée(s) d'audit supprimées.`,
    });
  };

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier ensuite
    if (!file) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast.error("Fichier invalide", { description: "Le fichier sélectionné n'est pas un JSON valide." });
      return;
    }

    if (typeof parsed !== "object" || parsed === null) {
      toast.error("Fichier invalide", { description: "Le contenu du fichier est invalide." });
      return;
    }
    const backup = parsed as Record<string, unknown>;
    const meta = backup.meta as { app?: string; generatedAt?: string; generatedBy?: string } | undefined;
    if (meta?.app !== BACKUP_APP_NAME) {
      toast.error("Fichier invalide", { description: "Ce fichier ne semble pas être une sauvegarde GET Admission." });
      return;
    }

    const totalRows = Object.entries(backup)
      .filter(([key, value]) => key !== "meta" && Array.isArray(value))
      .reduce((sum, [, value]) => sum + (value as unknown[]).length, 0);

    setPendingImport({ backup, totalRows, generatedAt: meta.generatedAt, generatedBy: meta.generatedBy });
    setImportConfirmText("");
    setImportOpen(true);
  };

  const handleImportConfirm = async () => {
    if (!pendingImport) return;
    setImporting(true);
    const result = await apiJson<{ totalRestored: number }>("/api/admin/backup/import", "POST", {
      confirm: importConfirmText,
      backup: pendingImport.backup,
    });
    setImporting(false);
    if (!result.ok) {
      toast.error("Import échoué", { description: result.error });
      return;
    }
    setImportOpen(false);
    setPendingImport(null);
    setImportConfirmText("");
    toast.success("Sauvegarde importée", {
      description: `${result.data.totalRestored} enregistrement(s) créé(s) ou mis à jour.`,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Configuration de l&apos;agence.</h1>
        {!isSuperAdmin && (
          <Alert className="mt-3 border-ambre/40 bg-ambre/5">
            <Lock className="h-4 w-4 text-ambre" strokeWidth={1.5} />
            <AlertTitle className="font-display text-sm font-bold text-ambre">Accès restreint</AlertTitle>
            <AlertDescription className="text-sm text-ardoise">
              La modification des paramètres est réservée au Super Administrateur.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="frais">
        <TabsList className="bg-porcelaine">
          <TabsTrigger value="frais">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Frais & paiement
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="workflow">
            <GitBranch className="mr-1.5 h-3.5 w-3.5" /> Workflow
          </TabsTrigger>
          <TabsTrigger value="legal">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Mentions
          </TabsTrigger>
          <TabsTrigger value="systeme">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Système
          </TabsTrigger>
          <TabsTrigger value="donnees">
            <Database className="mr-1.5 h-3.5 w-3.5" /> Données
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frais" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={CreditCard} title="Frais d'agence (CDC)" />
            <p className="mb-4 text-xs text-ardoise">
              Montants appliqués selon le type d&apos;établissement (public / privé).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Établissement public (FCFA)</Label>
                <Input
                  value={form.fraisAgencePublic}
                  onChange={(e) => set("fraisAgencePublic", e.target.value)}
                  className="font-mono"
                  disabled={!isSuperAdmin || loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Établissement privé (FCFA)</Label>
                <Input
                  value={form.fraisAgencePrive}
                  onChange={(e) => set("fraisAgencePrive", e.target.value)}
                  className="font-mono"
                  disabled={!isSuperAdmin || loading}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-md border border-ligne bg-porcelaine p-3">
              <div>
                <Label className="text-sm font-medium text-encre">Paiement en tranches</Label>
                <p className="text-xs text-ardoise">Autoriser les candidats à payer en plusieurs fois.</p>
              </div>
              <Switch
                checked={form.paiementTranches}
                onCheckedChange={(v) => set("paiementTranches", v)}
                disabled={!isSuperAdmin || loading}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={Bell} title="Canaux de notification" />
            <div className="space-y-3">
              <ToggleRow
                label="E-mails transactionnels"
                desc="Envoi d'e-mails à chaque transition de dossier"
                checked={form.notifEmail}
                onChange={(v) => set("notifEmail", v)}
                disabled={!isSuperAdmin || loading}
              />
              <ToggleRow
                label="Notifications in-app"
                desc="Bell et alertes dans l'espace candidat"
                checked={form.notifInApp}
                onChange={(v) => set("notifInApp", v)}
                disabled={!isSuperAdmin || loading}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={GitBranch} title="Règles de workflow" />
            <ToggleRow
              label="Workflow strict (§6)"
              desc="Refuse les transitions hors circuit (ex. transmission sans paiement)"
              checked={form.workflowStrict}
              onChange={(v) => set("workflowStrict", v)}
              disabled={!isSuperAdmin || loading}
            />
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={FileText} title="Contenus légaux" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Mentions légales</Label>
                <Textarea
                  rows={8}
                  value={form.mentionsLegales}
                  onChange={(e) => set("mentionsLegales", e.target.value)}
                  disabled={!isSuperAdmin || loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Politique de confidentialité</Label>
                <Textarea
                  rows={8}
                  value={form.politiqueConfidentialite}
                  onChange={(e) => set("politiqueConfidentialite", e.target.value)}
                  disabled={!isSuperAdmin || loading}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="systeme" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={ShieldCheck} title="Sécurité" />
            <ToggleRow
              label="Exiger e-mail vérifié (BF-06)"
              desc="Bloque la connexion candidat tant que l'e-mail n'est pas confirmé"
              checked={form.exigerEmailVerifie}
              onChange={(v) => set("exigerEmailVerifie", v)}
              disabled={!isSuperAdmin || loading}
            />
          </Card>
        </TabsContent>

        <TabsContent value="donnees" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={Download} title="Sauvegarde" />
            <p className="mb-4 text-xs text-ardoise">
              Exporte l&apos;intégralité des données de l&apos;application (dossiers, utilisateurs, catalogue,
              paiements, contenu…) dans un fichier JSON téléchargeable. Les mots de passe et jetons de sécurité
              sont exclus de l&apos;export.
            </p>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!isSuperAdmin || exporting}
            >
              {exporting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Download className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              )}
              Exporter toutes les données (JSON)
            </Button>
          </Card>

          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={Upload} title="Restauration" />
            <p className="mb-4 text-xs text-ardoise">
              Importe un fichier de sauvegarde JSON généré par cette même fonction d&apos;export. Fusion
              non destructive : les enregistrements dont l&apos;identifiant correspond à un enregistrement
              existant sont mis à jour, les autres sont créés. Les données déjà présentes en base mais
              absentes du fichier sont conservées.
            </p>
            <input
              ref={importFileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void handleImportFileSelected(e)}
            />
            <Button
              variant="outline"
              disabled={!isSuperAdmin || importing}
              onClick={() => importFileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              Importer une sauvegarde (JSON)
            </Button>
          </Card>

          <Card className={`border-carmin/30 bg-carmin/5 p-5 ${!isSuperAdmin ? "opacity-70" : ""}`}>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
              <h2 className="font-display text-base font-bold text-carmin">Zone dangereuse</h2>
            </div>
            <p className="mb-1 text-sm text-encre">Réinitialiser les données d&apos;activité</p>
            <p className="mb-4 text-xs text-ardoise">
              Supprime définitivement tous les dossiers (et leurs pièces, paiements, historiques,
              attestations, messages, demandes de correction), toutes les notifications et le journal
              d&apos;audit. Le catalogue (universités/formations), les comptes utilisateurs et les paramètres
              sont conservés. <strong>Cette action est irréversible</strong> — exportez une sauvegarde avant
              de continuer.
            </p>
            <Button
              variant="outline"
              className="border-carmin/40 text-carmin hover:bg-carmin/10"
              disabled={!isSuperAdmin}
              onClick={() => {
                setResetConfirmText("");
                setResetOpen(true);
              }}
            >
              <AlertTriangle className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Réinitialiser les données d&apos;activité
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-carmin">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.5} /> Réinitialiser les données d&apos;activité ?
            </DialogTitle>
            <DialogDescription>
              Tous les dossiers, pièces, paiements, historiques, attestations, messages, demandes de
              correction, notifications et le journal d&apos;audit seront supprimés définitivement. Le
              catalogue, les comptes utilisateurs et les paramètres sont conservés. Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>

          {!hasExported && (
            <Alert className="border-ambre/40 bg-ambre/5">
              <AlertTriangle className="h-4 w-4 text-ambre" strokeWidth={1.5} />
              <AlertDescription className="text-sm text-ardoise">
                Vous n&apos;avez pas encore exporté de sauvegarde dans cette session. Il est fortement
                recommandé de le faire avant de continuer.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm">
              Saisissez <span className="font-mono font-semibold">{RESET_CONFIRM_PHRASE}</span> pour confirmer
            </Label>
            <Input
              id="reset-confirm"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-carmin text-blanc hover:bg-carmin/90"
              disabled={resetConfirmText !== RESET_CONFIRM_PHRASE || resetting}
              onClick={() => void handleReset()}
            >
              {resetting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Réinitialiser définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) setPendingImport(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lapis">
              <Upload className="h-5 w-5" strokeWidth={1.5} /> Importer cette sauvegarde ?
            </DialogTitle>
            <DialogDescription>
              {pendingImport?.totalRows ?? 0} enregistrement(s) seront créés ou mis à jour.
              {pendingImport?.generatedAt && (
                <>
                  {" "}Fichier généré le {new Date(pendingImport.generatedAt).toLocaleString("fr-FR")}
                  {pendingImport.generatedBy ? ` par ${pendingImport.generatedBy}` : ""}.
                </>
              )}
              {" "}Les données existantes non incluses dans le fichier sont conservées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="import-confirm">
              Saisissez <span className="font-mono font-semibold">{IMPORT_CONFIRM_PHRASE}</span> pour confirmer
            </Label>
            <Input
              id="import-confirm"
              value={importConfirmText}
              onChange={(e) => setImportConfirmText(e.target.value)}
              className="font-mono"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setPendingImport(null); }}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={importConfirmText !== IMPORT_CONFIRM_PHRASE || importing}
              onClick={() => void handleImportConfirm()}
            >
              {importing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end">
        <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={handleSave} disabled={saving || loading || !isSuperAdmin}>
          {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
          <Save className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}

function cardLocked(isSuperAdmin: boolean) {
  return `border-ligne bg-card p-5 ${!isSuperAdmin ? "opacity-70" : ""}`;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-lapis" strokeWidth={1.5} />
      <h2 className="font-display text-base font-bold text-encre">{title}</h2>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const labelId = React.useId();
  const descId = React.useId();
  return (
    <div className="flex items-center justify-between rounded-md border border-ligne px-3 py-3">
      <div>
        <p id={labelId} className="text-sm font-medium text-encre">
          {label}
        </p>
        <p id={descId} className="text-xs text-ardoise">
          {desc}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={descId}
      />
    </div>
  );
}
