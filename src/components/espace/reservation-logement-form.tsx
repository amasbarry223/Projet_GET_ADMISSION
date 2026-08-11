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
import { LogementFileDropzone } from "@/components/logement/logement-file-dropzone";
import { LogementFormSection } from "@/components/logement/form-section";
import { logementReservationSchema } from "@/lib/validations";
import { formatDateTime } from "@/lib/format";
import { CheckCircle2, XCircle, Clock, Pencil, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type LogementFormValues = z.infer<typeof logementReservationSchema>;

const DEFAULT_VALUES: LogementFormValues = {
  civilite: "M",
  nom: "",
  prenom: "",
  dateNaissance: "",
  nationalite: "",
  telephone: "",
  email: "",
  agenceAccompagnante: "",
  numeroPasseport: "",
  paysDemandeVisa: "",
  villeEtablissementFrance: "",
  dateArriveePrevue: "",
};

type Reservation = {
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
  dateArriveePrevue: string;
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
  en_cours_traitement: { label: "En cours de traitement", icon: CheckCircle2, tone: "text-vert border-vert bg-vert/5" },
  correction_demandee: { label: "Correction demandée", icon: XCircle, tone: "text-lapis border-lapis bg-lapis/5" },
  traite: { label: "Traité", icon: CheckCircle2, tone: "text-vert border-vert bg-vert/10 font-bold" },
};

export function ReservationLogementForm() {
  const [reservations, setReservations] = React.useState<Reservation[] | null>(null);
  const [nationalites, setNationalites] = React.useState<string[]>([]);
  const [passeportFile, setPasseportFile] = React.useState<File | null>(null);
  const [attestationFile, setAttestationFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const form = useForm<LogementFormValues>({
    resolver: zodResolver(logementReservationSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onTouched",
  });

  const loadReservations = React.useCallback(async () => {
    const res = await fetch("/api/logement/reservations");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setReservations(body.reservations ?? []);
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => void loadReservations());

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
          numeroPasseport: profile.kycType === "passeport" ? (profile.kycNumero ?? "") : "",
        });
      } catch {
        // préremplissage non bloquant
      }
    });
    // form volontairement omis des deps : reset une seule fois au montage
  }, [loadReservations]);

  const isCorrection = editingId !== null;

  const onSubmit = async (values: LogementFormValues) => {
    if (!isCorrection) {
      if (!passeportFile) {
        toast.error("Le passeport est requis");
        return;
      }
      if (!attestationFile) {
        toast.error("L'attestation d'inscription est requise");
        return;
      }
    }

    setSubmitting(true);
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    }
    if (passeportFile) formData.append("fichierPasseport", passeportFile);
    if (attestationFile) formData.append("fichierAttestationInscription", attestationFile);

    try {
      const url = isCorrection ? `/api/logement/reservations/${editingId}` : "/api/logement/reservations";
      const res = await fetch(url, { method: isCorrection ? "PUT" : "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(isCorrection ? "Correction échouée" : "Demande échouée", {
          description: body?.error ?? "Erreur serveur.",
        });
        return;
      }
      toast.success(isCorrection ? "Demande corrigée et renvoyée" : "Demande de réservation envoyée");
      setPasseportFile(null);
      setAttestationFile(null);
      setEditingId(null);
      form.reset(DEFAULT_VALUES);
      await loadReservations();
    } catch {
      toast.error("Erreur réseau", { description: "Réessayez dans quelques instants." });
    } finally {
      setSubmitting(false);
    }
  };

  const startCorrection = (r: Reservation) => {
    setEditingId(r.id);
    setPasseportFile(null);
    setAttestationFile(null);
    form.reset({
      civilite: r.civilite,
      nom: r.nom,
      prenom: r.prenom,
      dateNaissance: r.dateNaissance,
      nationalite: r.nationalite,
      telephone: r.telephone,
      email: r.email,
      agenceAccompagnante: r.agenceAccompagnante ?? "",
      numeroPasseport: r.numeroPasseport,
      paysDemandeVisa: r.paysDemandeVisa,
      villeEtablissementFrance: r.villeEtablissementFrance,
      dateArriveePrevue: r.dateArriveePrevue,
    });
    if (typeof document !== "undefined") {
      document.getElementById("reservation-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const cancelCorrection = () => {
    setEditingId(null);
    setPasseportFile(null);
    setAttestationFile(null);
    form.reset(DEFAULT_VALUES);
  };

  return (
    <div className="space-y-6">
      {reservations && reservations.length > 0 && (
        <Card className="border-ligne bg-card p-5">
          <p className="text-xs font-medium text-ardoise">Mes demandes</p>
          <div className="mt-3 space-y-3">
            {reservations.map((r) => {
              const meta = STATUT_META[r.statut] ?? {
                label: r.statut,
                icon: CheckCircle2,
                tone: "text-vert border-vert bg-vert/5",
              };
              return (
                <div key={r.id} className="rounded-md border border-ligne px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-encre">
                        {r.villeEtablissementFrance} — arrivée le {r.dateArriveePrevue}
                      </p>
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

      {reservations && reservations.length > 0 && !isCorrection && (
        <Alert className="border-ambre/40 bg-ambre/5">
          <Clock className="h-4 w-4 text-ambre" strokeWidth={1.5} />
          <AlertTitle className="font-display text-sm font-bold text-encre">
            Une seule demande de réservation par candidat.
          </AlertTitle>
          <AlertDescription className="text-sm text-ardoise">
            Vous avez déjà soumis une demande de réservation de logement. Si vous devez la modifier, contactez
            votre conseiller — une correction pourra être demandée et vous permettra de la mettre à jour.
          </AlertDescription>
        </Alert>
      )}

      {(reservations === null || reservations.length === 0 || isCorrection) && (
      <Card id="reservation-form" className="border-ligne bg-card p-0 overflow-hidden scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ligne bg-porcelaine px-6 py-3">
          <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
            {isCorrection ? "Corriger ma demande de réservation" : "Formulaire de réservation de logement"}
          </p>
          {isCorrection && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={cancelCorrection}>
              Annuler la correction
            </Button>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6" noValidate>
            <LogementFormSection title="Identité" first>
              <FormField
                control={form.control}
                name="civilite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Civilité</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Monsieur</SelectItem>
                        <SelectItem value="MME">Madame</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div />
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
            </LogementFormSection>

            <LogementFormSection title="Naissance & nationalité">
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
            </LogementFormSection>

            <LogementFormSection title="Contact">
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
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </LogementFormSection>

            <LogementFormSection title="Voyage">
              <FormField
                control={form.control}
                name="agenceAccompagnante"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Agence accompagnante <span className="font-normal text-ardoise">(optionnel)</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numeroPasseport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de passeport</FormLabel>
                    <FormControl>
                      <Input className="uppercase" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paysDemandeVisa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays de demande de visa</FormLabel>
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

            <LogementFormSection title="Séjour">
              <FormField
                control={form.control}
                name="villeEtablissementFrance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville de l&apos;établissement (France)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateArriveePrevue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d&apos;arrivée prévue</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </LogementFormSection>

            <LogementFormSection title="Documents" description="PDF, JPG, PNG ou WEBP — 10 Mo maximum par fichier.">
              <LogementFileDropzone
                id="fichierPasseport"
                label="Passeport"
                file={passeportFile}
                onChange={setPasseportFile}
                keepExistingOnEdit={isCorrection}
              />
              <LogementFileDropzone
                id="fichierAttestationInscription"
                label="Attestation d'inscription"
                file={attestationFile}
                onChange={setAttestationFile}
                keepExistingOnEdit={isCorrection}
              />
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
