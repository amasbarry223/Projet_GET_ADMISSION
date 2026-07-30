"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { formatFCFA } from "@/lib/format";
import { Lock, Save, ShieldCheck, CreditCard, Bell, GitBranch, Plane } from "lucide-react";

export default function AdminParametresPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Paramètres</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Configuration de l'agence.</h1>
        {!isSuperAdmin && (
          <Alert className="mt-3 border-ambre/40 bg-ambre/5">
            <Lock className="h-4 w-4 text-ambre" strokeWidth={1.5} />
            <AlertTitle className="font-display text-sm font-bold text-ambre">Accès restreint</AlertTitle>
            <AlertDescription className="text-sm text-ardoise">
              Certaines sections sont réservées au Super Admin. Connectez-vous en démo avec ce rôle (via le sélecteur en haut à droite) pour tout modifier.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="frais">
        <TabsList className="bg-porcelaine">
          <TabsTrigger value="frais"><CreditCard className="mr-1.5 h-3.5 w-3.5" /> Frais & paiement</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="workflow"><GitBranch className="mr-1.5 h-3.5 w-3.5" /> Workflow</TabsTrigger>
          <TabsTrigger value="systeme"><ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Système</TabsTrigger>
        </TabsList>

        {/* Frais & paiement */}
        <TabsContent value="frais" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={CreditCard} title="Frais d'agence par défaut" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-encre">Frais minimum (FCFA)</Label>
                <Input defaultValue="350000" className="font-mono" disabled={!isSuperAdmin} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-encre">Frais maximum (FCFA)</Label>
                <Input defaultValue="1750000" className="font-mono" disabled={!isSuperAdmin} />
              </div>
            </div>
          </Card>

          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={Plane} title="Moyens de paiement acceptés" />
            <div className="space-y-3">
              {[
                { name: "Orange Money", on: true },
                { name: "Moov Money", on: true },
                { name: "Wave", on: true },
                { name: "Carte bancaire", on: true },
                { name: "Virement bancaire", on: false },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between rounded-md border border-ligne px-3 py-2">
                  <span className="text-sm text-encre">{m.name}</span>
                  <Switch defaultChecked={m.on} disabled={!isSuperAdmin} onCheckedChange={() => toast.success("Moyen mis à jour")} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md border border-ligne bg-porcelaine p-3">
              <div>
                <Label className="text-sm font-medium text-encre">Paiement en tranches</Label>
                <p className="text-xs text-ardoise">Autoriser les candidats à payer en 2 fois.</p>
              </div>
              <Switch defaultChecked disabled={!isSuperAdmin} />
            </div>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="border-ligne bg-blanc p-5">
            <SectionHeader icon={Bell} title="Modèles de notifications" />
            <div className="space-y-3">
              {[
                { event: "Dossier soumis", channel: "E-mail + Push", on: true },
                { event: "Paiement confirmé", channel: "E-mail + SMS", on: true },
                { event: "Pré-admission accordée", channel: "E-mail + SMS + Push", on: true },
                { event: "Attestation disponible", channel: "E-mail + SMS", on: true },
                { event: "Refus de l'université", channel: "E-mail + Appel conseiller", on: true },
              ].map((n) => (
                <div key={n.event} className="flex items-center justify-between rounded-md border border-ligne px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-encre">{n.event}</p>
                    <p className="font-mono text-[11px] text-ardoise">{n.channel}</p>
                  </div>
                  <Switch defaultChecked={n.on} onCheckedChange={() => toast.success("Notification mise à jour")} />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Workflow */}
        <TabsContent value="workflow" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={GitBranch} title="Règles de workflow" />
            <div className="space-y-3 text-sm">
              <Rule label="Délai maximum de vérification" value="48h" disabled={!isSuperAdmin} />
              <Rule label="Délai de transmission à l'université" value="24h après paiement" disabled={!isSuperAdmin} />
              <Rule label="Relance candidat sans action" value="3 jours" disabled={!isSuperAdmin} />
              <Rule label="Validation automatique des pièces < 5 Mo" value="Activée" disabled={!isSuperAdmin} />
            </div>
          </Card>
        </TabsContent>

        {/* Système */}
        <TabsContent value="systeme" className="space-y-4">
          <Card className={cardLocked(isSuperAdmin)}>
            <SectionHeader icon={ShieldCheck} title="Système & sécurité" />
            <div className="space-y-3 text-sm">
              <Rule label="Version de la plateforme" value="2.4.1" disabled />
              <Rule label="Sauvegarde automatique" value="Quotidienne · 03:00" disabled={!isSuperAdmin} />
              <Rule label="Authentification à deux facteurs" value="Exigée pour Admin+" disabled={!isSuperAdmin} />
              <Rule label="Rétention des dossiers clôturés" value="5 ans" disabled={!isSuperAdmin} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => toast.success("Cache purgée")} disabled={!isSuperAdmin}>Purger le cache</Button>
              <Button variant="outline" className="border-carmin/40 text-carmin hover:bg-carmin/5" onClick={() => toast.error("Action simulée")} disabled={!isSuperAdmin}>Réinitialiser la plateforme</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => toast.success("Paramètres enregistrés")}>
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

function Rule({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ligne/60 py-2 last:border-0">
      <span className="text-ardoise">{label}</span>
      <span className="font-mono text-encre">{value}</span>
      {disabled && <Lock className="ml-2 h-3 w-3 text-ardoise" strokeWidth={1.5} />}
    </div>
  );
}
