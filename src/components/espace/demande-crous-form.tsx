"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { VilleFranceCombobox } from "@/components/logement/ville-france-combobox";
import { LogementFileDropzone } from "@/components/logement/logement-file-dropzone";
import { LogementFormSection } from "@/components/logement/form-section";
import { demandeCrousSchema } from "@/lib/validations";
import { formatDateTime } from "@/lib/format";
import { BedDouble, Loader2, Clock, Pencil, MessageSquareWarning, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeBroadcast } from "@/hooks/use-realtime-broadcast";
import { LOGEMENT_LIVE_CHANNEL } from "@/lib/logement/live-broadcast";

type DemandeCrousFormValues = z.infer<typeof demandeCrousSchema>;

const DEFAULT_VALUES: DemandeCrousFormValues = {
  nom: "",
  prenom: "",
  nomUsage: "",
  dateNaissance: "",
  lieuNaissance: "",
  paysNaissance: "",
  nationalite: "",
  sexe: "M",
  telephone: "",
  email: "",
  villeEtablissementFrance: "",
};

type Demande = {
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
  statut: "soumis" | "en_cours_traitement" | "correction_demandee" | "traite" | string;
  motifCorrection: string | null;
  createdAt: string;
};

const STATUT_META: Record<
  string,
  { label: string; icon: typeof Clock; tone: string }
> = {
  soumis: { label: "Soumise — en attente de prise en charge", icon: Clock, tone: "text-ambre border-ambre bg-ambre/5" },
  en_cours_traitement: { label: "En cours de traitement", icon: Loader2, tone: "text-vert border-vert bg-vert/5" },
  correction_demandee: { label: "Correction demandée", icon: MessageSquareWarning, tone: "text-lapis border-lapis bg-lapis/5" },
  traite: { label: "Traité", icon: CheckCircle2, tone: "text-vert border-vert bg-vert/10 font-bold" },
};

export function DemandeCrousForm() {
  const [demandes, setDemandes] = React.useState<Demande[] | null>(null);
  const [nationalites, setNationalites] = React.useState<string[]>([]);
  const [passeportRectoFile, setPasseportRectoFile] = React.useState<File | null>(null);
  const [passeportVersoFile, setPasseportVersoFile] = React.useState<File | null>(null);
  const [attestationFile, setAttestationFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const form = useForm<DemandeCrousFormValues>({
    resolver: zodResolver(demandeCrousSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const loadDemandes = React.useCallback(async () => {
    const res = await fetch("/api/logement/crous");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setDemandes(body.demandes ?? []);
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => void loadDemandes());

    queueMicrotask(async () => {
      try {
        const res = await fetch("/api/public/nationalites");
        const list = await res.json().catch(() => []);
        if (Array.isArray(list)) setNationalites(list);
      } catch {
        // liste non bloquante — champ restera vide si indisponible
      }
    });

    queueMicrotask(async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const profile = await res.json();
        form.reset({
          ...form.getValues(),
          nom: profile.nom ?? "",
          prenom: profile.prenom ?? "",
          email: profile.email ?? "",
          telephone: profile.telephone ?? "",
          nationalite: profile.nationalite ?? "",
          dateNaissance: profile.dateNaissance ?? "",
        });
      } catch {
        // préremplissage non bloquant
      }
    });
    // form volontairement omis des deps : reset une seule fois au montage
  }, [loadDemandes]);

  // Réveil instantané quand l'admin change le statut
  useRealtimeBroadcast(LOGEMENT_LIVE_CHANNEL, "logement_updated", () => {
    void loadDemandes();
  });

  const isCorrection = editingId !== null;

  const onSubmit = async (values: DemandeCrousFormValues) => {
    if (!isCorrection) {
      if (!passeportRectoFile) {
        toast.error("Le passeport (recto) est requis");
        return;
      }
      if (!passeportVersoFile) {
        toast.error("Le passeport (verso) est requis");
        return;
      }
      if (!attestationFile) {
        toast.error("L'attestation d'accord préalable est requise");
        return;
      }
    }

    setSubmitting(true);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    }
    if (passeportRectoFile) formData.append("fichierPasseportRecto", passeportRectoFile);
    if (passeportVersoFile) formData.append("fichierPasseportVerso", passeportVersoFile);
    if (attestationFile) formData.append("fichierAttestationAccordPrealable", attestationFile);

    try {
      const url = isCorrection ? `/api/logement/crous/${editingId}` : "/api/logement/crous";
      const res = await fetch(url, { method: isCorrection ? "PUT" : "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(isCorrection ? "Correction échouée" : "Demande échouée", {
          description: body?.error ?? "Erreur serveur.",
        });
        return;
      }
      toast.success(isCorrection ? "Demande corrigée et renvoyée" : "Demande de logement CROUS envoyée");
      setPasseportRectoFile(null);
      setPasseportVersoFile(null);
      setAttestationFile(null);
      setEditingId(null);
      form.reset(DEFAULT_VALUES);
      await loadDemandes();
    } catch {
      toast.error("Erreur réseau", { description: "Réessayez dans quelques instants." });
    } finally {
      setSubmitting(false);
    }
  };

  const startCorrection = (r: Demande) => {
    setEditingId(r.id);
    setPasseportRectoFile(null);
    setPasseportVersoFile(null);
    setAttestationFile(null);
    form.reset({
      nom: r.nom,
      prenom: r.prenom,
      nomUsage: r.nomUsage ?? "",
      dateNaissance: r.dateNaissance,
      lieuNaissance: r.lieuNaissance,
      paysNaissance: r.paysNaissance,
      nationalite: r.nationalite,
      sexe: r.sexe,
      telephone: r.telephone,
      email: r.email,
      villeEtablissementFrance: r.villeEtablissementFrance,
    });
    if (typeof document !== "undefined") {
      document.getElementById("crous-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const cancelCorrection = () => {
    setEditingId(null);
    setPasseportRectoFile(null);
    setPasseportVersoFile(null);
    setAttestationFile(null);
    form.reset(DEFAULT_VALUES);
  };

  return (
    <div className="space-y-6">
      {demandes && demandes.length > 0 && (
        <Card className="border-ligne bg-card p-5">
          <p className="text-xs font-medium text-ardoise">Mes demandes CROUS</p>
          <div className="mt-3 space-y-3">
            {demandes.map((r) => {
              const meta = STATUT_META[r.statut] ?? {
                label: r.statut,
                icon: CheckCircle2,
                tone: "text-vert border-vert bg-vert/5",
              };
              return (
                <div key={r.id} className="rounded-md border border-ligne px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-encre">{r.villeEtablissementFrance}</p>
                      <p className="text-xs text-ardoise">Envoyée le {formatDateTime(r.createdAt)}</p>
                    </div>
                    <Badge className={cn("font-mono text-[10px] uppercase", meta.tone)}>
                      <meta.icon className="mr-1 h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </div>
                  {r.statut === "correction_demandee" && (
                    <div className="mt-3 rounded-md border border-lapis/30 bg-lapis/5 px-3 py-2.5">
                      {r.motifCorrection && <p className="text-xs text-encre">{r.motifCorrection}</p>}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 px-2.5 text-xs"
                        onClick={() => startCorrection(r)}
                      >
                        <Pencil className="mr-1.5 h-3 w-3" strokeWidth={1.5} /> Corriger ma demande
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {demandes && demandes.length > 0 && !isCorrection && (
        <Alert className="border-ambre/40 bg-ambre/5">
          <Clock className="h-4 w-4 text-ambre" strokeWidth={1.5} />
          <AlertTitle className="font-display text-sm font-bold text-encre">
            Une seule demande CROUS par candidat.
          </AlertTitle>
          <AlertDescription className="text-sm text-ardoise">
            Vous avez déjà soumis une demande de logement CROUS. Si vous devez la modifier, contactez votre
            conseiller — une correction pourra être demandée et vous permettra de la mettre à jour.
          </AlertDescription>
        </Alert>
      )}

      {(demandes === null || demandes.length === 0 || isCorrection) && (
      <Card id="crous-form" className="border-ligne bg-card p-0 overflow-hidden scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ligne bg-porcelaine px-6 py-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
            <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
            {isCorrection ? "Corriger ma demande CROUS" : "Formulaire de demande de logement CROUS"}
          </p>
          {isCorrection && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={cancelCorrection}>
              Annuler la correction
            </Button>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6" noValidate>
            <LogementFormSection title="État civil" first>
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input autoComplete="family-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input autoComplete="given-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nomUsage"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Nom d&apos;usage <span className="font-normal text-ardoise">(optionnel)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </LogementFormSection>

            <LogementFormSection title="Naissance">
              <FormField
                control={form.control}
                name="dateNaissance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance</FormLabel>
                    <FormControl>
                      <Input type="date" autoComplete="bday" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sexe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexe</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lieuNaissance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paysNaissance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays de naissance</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nationalites.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </LogementFormSection>

            <LogementFormSection title="Nationalité & contact">
              <FormField
                control={form.control}
                name="nationalite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationalité</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nationalites.map((n) => (
                          <SelectItem key={n} value={n}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input type="tel" autoComplete="tel" placeholder="+223 00 00 00 00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Adresse e-mail</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </LogementFormSection>

            <LogementFormSection title="Logement">
              <FormField
                control={form.control}
                name="villeEtablissementFrance"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Ville de l&apos;établissement (France)</FormLabel>
                    <FormControl>
                      <VilleFranceCombobox value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </LogementFormSection>

            <LogementFormSection title="Documents" description="PDF, JPG, PNG ou WEBP — 10 Mo maximum par fichier.">
              <LogementFileDropzone
                id="fichierPasseportRecto"
                label="Passeport — recto"
                file={passeportRectoFile}
                onChange={setPasseportRectoFile}
                keepExistingOnEdit={isCorrection}
              />
              <LogementFileDropzone
                id="fichierPasseportVerso"
                label="Passeport — verso"
                file={passeportVersoFile}
                onChange={setPasseportVersoFile}
                keepExistingOnEdit={isCorrection}
              />
              <div className="sm:col-span-2">
                <LogementFileDropzone
                  id="fichierAttestationAccordPrealable"
                  label="Attestation d'accord préalable"
                  file={attestationFile}
                  onChange={setAttestationFile}
                  keepExistingOnEdit={isCorrection}
                />
              </div>
            </LogementFormSection>

            <div className="flex justify-end border-t border-ligne pt-6">
              <Button type="submit" disabled={submitting} className="bg-lapis text-blanc hover:bg-lapis/90">
                {submitting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                )}
                {isCorrection ? "Renvoyer ma demande corrigée" : "Envoyer ma demande"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
      )}
    </div>
  );
}
