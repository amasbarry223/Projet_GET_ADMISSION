"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { logementReservationSchema } from "@/lib/validations";
import { formatDateTime } from "@/lib/format";
import { BedDouble, Loader2, Clock, Upload, Pencil, MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils";

type LogementFormValues = z.infer<typeof logementReservationSchema>;

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
  statut: "soumis" | "correction_demandee";
  motifCorrection: string | null;
  createdAt: string;
};

const STATUT_META: Record<
  Reservation["statut"],
  { label: string; icon: typeof Clock; tone: string }
> = {
  soumis: { label: "Soumise — en cours de traitement par l'administration", icon: Clock, tone: "text-ambre border-ambre bg-ambre/5" },
  correction_demandee: { label: "Correction demandée", icon: MessageSquareWarning, tone: "text-lapis border-lapis bg-lapis/5" },
};

export default function LogementPage() {
  const [reservations, setReservations] = React.useState<Reservation[] | null>(null);
  const [nationalites, setNationalites] = React.useState<string[]>([]);
  const [passeportFile, setPasseportFile] = React.useState<File | null>(null);
  const [attestationFile, setAttestationFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const form = useForm<LogementFormValues>({
    resolver: zodResolver(logementReservationSchema),
    defaultValues: {
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
    },
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
  }, [loadReservations, form]);

  const onSubmit = async (values: LogementFormValues) => {
    const isCorrection = editingId !== null;
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
      form.reset({
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
      });
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
      document.getElementById("logement-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const cancelCorrection = () => {
    setEditingId(null);
    setPasseportFile(null);
    setAttestationFile(null);
    form.reset({
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
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Réservation de logement</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">
          Réservez votre logement étudiant.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-ardoise">
          Remplissez le formulaire ci-dessous pour soumettre votre demande — elle sera traitée par notre équipe.
        </p>
      </div>

      {reservations && reservations.length > 0 && (
        <Card className="border-ligne bg-card p-5">
          <p className="text-xs font-medium text-ardoise">Mes demandes</p>
          <div className="mt-3 space-y-3">
            {reservations.map((r) => {
              const meta = STATUT_META[r.statut];
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

      <Card id="logement-form" className="border-ligne bg-card p-0 overflow-hidden scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ligne bg-porcelaine px-6 py-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
            <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
            {editingId ? "Corriger ma demande de réservation" : "Formulaire de réservation de logement"}
          </p>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={cancelCorrection}>
              Annuler la correction
            </Button>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
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
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateNaissance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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

              <FormField
                control={form.control}
                name="telephone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="agenceAccompagnante"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Agence accompagnante (optionnel)</FormLabel>
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
                      <Input {...field} />
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fichierPasseport">
                  Passeport (PDF, JPG, PNG — 10 Mo max){editingId ? " — optionnel, conserve le fichier existant" : ""}
                </Label>
                <label
                  htmlFor="fichierPasseport"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-ligne px-3 py-2.5 text-sm text-ardoise hover:border-lapis/50"
                >
                  <Upload className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{passeportFile ? passeportFile.name : "Choisir un fichier"}</span>
                </label>
                <input
                  id="fichierPasseport"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) => setPasseportFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fichierAttestationInscription">
                  Attestation d&apos;inscription (PDF, JPG, PNG — 10 Mo max)
                  {editingId ? " — optionnel, conserve le fichier existant" : ""}
                </Label>
                <label
                  htmlFor="fichierAttestationInscription"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-ligne px-3 py-2.5 text-sm text-ardoise hover:border-lapis/50"
                >
                  <Upload className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">
                    {attestationFile ? attestationFile.name : "Choisir un fichier"}
                  </span>
                </label>
                <input
                  id="fichierAttestationInscription"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) => setAttestationFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-ligne pt-5">
              <Button type="submit" disabled={submitting} className="bg-lapis text-blanc hover:bg-lapis/90">
                {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                {editingId ? "Renvoyer ma demande corrigée" : "Envoyer ma demande"}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
