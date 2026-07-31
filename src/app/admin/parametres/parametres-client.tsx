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
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Lock, Save, ShieldCheck, CreditCard, Bell, GitBranch, Loader2, FileText } from "lucide-react";

type ParamsState = {
  fraisMin: string;
  fraisMax: string;
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
    paiementTranches: true,
    notifEmail: true,
    notifInApp: true,
    workflowStrict: true,
    exigerEmailVerifie: true,
    mentionsLegales: "",
    politiqueConfidentialite: "",
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/parametres");
        if (!res.ok) {
          if (!cancelled) toast.error("Chargement échoué");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setForm({
          fraisMin: String(data.fraisMin ?? ""),
          fraisMax: String(data.fraisMax ?? ""),
          paiementTranches: !!data.paiementTranches,
          notifEmail: data.notifEmail !== false,
          notifInApp: data.notifInApp !== false,
          workflowStrict: data.workflowStrict !== false,
          exigerEmailVerifie: !!data.exigerEmailVerifie,
          mentionsLegales: data.mentionsLegales ?? "",
          politiqueConfidentialite: data.politiqueConfidentialite ?? "",
        });
      } catch {
        if (!cancelled) toast.error("Erreur réseau");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof ParamsState>(key: K, value: ParamsState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/parametres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fraisMin: Number(form.fraisMin) || 0,
          fraisMax: Number(form.fraisMax) || 0,
          paiementTranches: form.paiementTranches,
          notifEmail: form.notifEmail,
          notifInApp: form.notifInApp,
          workflowStrict: form.workflowStrict,
          exigerEmailVerifie: form.exigerEmailVerifie,
          mentionsLegales: form.mentionsLegales,
          politiqueConfidentialite: form.politiqueConfidentialite,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Enregistrement échoué", { description: (err as { error?: string })?.error ?? "Erreur serveur." });
        return;
      }
      toast.success("Paramètres enregistrés");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Paramètres</p>
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
        </TabsList>

        <TabsContent value="frais" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={CreditCard} title="Frais d'agence par défaut" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Frais minimum (FCFA)</Label>
                <Input
                  value={form.fraisMin}
                  onChange={(e) => set("fraisMin", e.target.value)}
                  className="font-mono"
                  disabled={!isSuperAdmin || loading}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Frais maximum (FCFA)</Label>
                <Input
                  value={form.fraisMax}
                  onChange={(e) => set("fraisMax", e.target.value)}
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
      </Tabs>

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
  return `border-ligne bg-blanc p-5 ${!isSuperAdmin ? "opacity-70" : ""}`;
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
  return (
    <div className="flex items-center justify-between rounded-md border border-ligne px-3 py-3">
      <div>
        <p className="text-sm font-medium text-encre">{label}</p>
        <p className="text-xs text-ardoise">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
