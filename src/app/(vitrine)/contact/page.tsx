"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Clock, Send, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eyebrow } from "@/components/site/reveal";

type FormState = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  objet: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type ContactInfo = {
  email: string;
  telephone: string;
  adresses: string;
  horaires: string;
};

const INITIAL: FormState = {
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  objet: "",
  message: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const telHref = (t: string) => `tel:${t.replace(/[^+0-9]/g, "")}`;

export default function ContactPage() {
  const [form, setForm] = React.useState<FormState>(INITIAL);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [contactInfo, setContactInfo] = React.useState<ContactInfo | null>(null);
  const [objets, setObjets] = React.useState<string[]>([]);
  const [loadingInfo, setLoadingInfo] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/public/contact-info").then((r) => r.json()),
      fetch("/api/public/objets-contact").then((r) => r.json()),
    ])
      .then(([info, objs]: [ContactInfo, string[]]) => {
        setContactInfo(info);
        setObjets(Array.isArray(objs) ? objs : []);
        setLoadingInfo(false);
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setContactInfo({ email: "", telephone: "", adresses: "", horaires: "" });
        setObjets([]);
        setLoadingInfo(false);
      });
  }, []);

  const update = (field: keyof FormState, value: string) => {
    setForm((s) => ({ ...s, [field]: value }));
    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.prenom.trim()) e.prenom = "Veuillez renseigner votre prénom.";
    if (!form.nom.trim()) e.nom = "Veuillez renseigner votre nom.";
    if (!form.email.trim()) {
      e.email = "Veuillez renseigner votre e-mail.";
    } else if (!EMAIL_RE.test(form.email.trim())) {
      e.email = "L'e-mail saisi n'est pas valide.";
    }
    if (!form.objet) e.objet = "Veuillez choisir un objet.";
    if (!form.message.trim()) {
      e.message = "Veuillez renseigner votre message.";
    } else if (form.message.trim().length < 10) {
      e.message = "Votre message est un peu court. Détaillez votre demande.";
    }
    return e;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Formulaire incomplet", {
        description: "Veuillez corriger les champs signalés.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: FormState = { ...form };
      if (!payload.telephone.trim()) delete (payload as Partial<FormState>).telephone;
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Message envoyé", {
          description: "Un conseiller vous répondra sous 24h ouvrées.",
        });
        setForm(INITIAL);
        setErrors({});
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Erreur", {
          description: data.error || "L'envoi a échoué. Réessayez.",
        });
      }
    } catch {
      toast.error("Erreur", {
        description: "L'envoi a échoué. Réessayez.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="bg-porcelaine" aria-labelledby="contact-title">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <Eyebrow>Contact</Eyebrow>
            <h1
              id="contact-title"
              className="mt-5 font-display text-4xl font-extrabold tracking-tightest text-encre sm:text-5xl"
            >
              Contactez un conseiller
            </h1>
            <p className="mt-4 text-lg text-ardoise">
              Une question, un projet d'admission, un suivi de dossier ? Écrivez-nous. Un conseiller
              vous répond sous 24 heures ouvrées.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-blanc" aria-label="Coordonnées et formulaire">
        <div className="rule-or" aria-hidden />
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr]">
            {/* Formulaire */}
            <form onSubmit={onSubmit} noValidate className="rounded-lg border border-ligne bg-blanc p-6 shadow-sm sm:p-8">
              <p className="eyebrow">Votre message</p>
              <h2 className="mt-3 font-display text-xl font-bold text-encre">
                Décrivez votre demande
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom">
                    Prénom <span className="text-carmin">*</span>
                  </Label>
                  <Input
                    id="prenom"
                    name="prenom"
                    autoComplete="given-name"
                    value={form.prenom}
                    onChange={(e) => update("prenom", e.target.value)}
                    aria-invalid={!!errors.prenom}
                    aria-describedby={errors.prenom ? "prenom-err" : undefined}
                  />
                  {errors.prenom && (
                    <p id="prenom-err" className="text-xs text-carmin">
                      {errors.prenom}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nom">
                    Nom <span className="text-carmin">*</span>
                  </Label>
                  <Input
                    id="nom"
                    name="nom"
                    autoComplete="family-name"
                    value={form.nom}
                    onChange={(e) => update("nom", e.target.value)}
                    aria-invalid={!!errors.nom}
                    aria-describedby={errors.nom ? "nom-err" : undefined}
                  />
                  {errors.nom && (
                    <p id="nom-err" className="text-xs text-carmin">
                      {errors.nom}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">
                    E-mail <span className="text-carmin">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-err" : undefined}
                  />
                  {errors.email && (
                    <p id="email-err" className="text-xs text-carmin">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="telephone">Téléphone (optionnel)</Label>
                  <Input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+221 …"
                    value={form.telephone}
                    onChange={(e) => update("telephone", e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 space-y-1.5">
                <Label htmlFor="objet">
                  Objet <span className="text-carmin">*</span>
                </Label>
                <Select value={form.objet} onValueChange={(v) => update("objet", v)}>
                  <SelectTrigger
                    id="objet"
                    className="w-full bg-blanc"
                    aria-invalid={!!errors.objet}
                  >
                    <SelectValue placeholder={loadingInfo ? "Chargement…" : "Choisir un objet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {objets.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.objet && (
                  <p className="text-xs text-carmin">{errors.objet}</p>
                )}
              </div>

              <div className="mt-5 space-y-1.5">
                <Label htmlFor="message">
                  Message <span className="text-carmin">*</span>
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Décrivez votre projet d'études, votre situation, vos questions…"
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "message-err" : undefined}
                />
                {errors.message && (
                  <p id="message-err" className="text-xs text-carmin">
                    {errors.message}
                  </p>
                )}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="bg-lapis text-blanc hover:bg-lapis/90"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blanc/40 border-t-blanc" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" strokeWidth={1.75} />
                      Envoyer le message
                    </>
                  )}
                </Button>
                <p className="text-xs text-ardoise">
                  Réponse sous 24h ouvrées · aucun engagement
                </p>
              </div>
            </form>

            {/* Coord */}
            <aside className="space-y-4">
              <div className="rounded-lg border border-ligne bg-porcelaine p-6">
                <p className="eyebrow">Coordonnées</p>
                {loadingInfo || !contactInfo ? (
                  <div className="mt-6 flex items-center gap-2 text-sm text-ardoise">
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    Chargement des coordonnées…
                  </div>
                ) : (
                  <ul className="mt-5 space-y-4 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blanc text-lapis shadow-sm">
                        <Mail className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                          E-mail
                        </p>
                        <a
                          href={`mailto:${contactInfo.email}`}
                          className="mt-0.5 inline-block font-medium text-encre hover:text-lapis"
                        >
                          {contactInfo.email || "—"}
                        </a>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blanc text-lapis shadow-sm">
                        <Phone className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                          Téléphone
                        </p>
                        <a
                          href={telHref(contactInfo.telephone)}
                          className="mt-0.5 inline-block font-medium text-encre hover:text-lapis"
                        >
                          {contactInfo.telephone || "—"}
                        </a>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blanc text-lapis shadow-sm">
                        <MapPin className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                          Agences
                        </p>
                        <p className="mt-0.5 font-medium text-encre">
                          {contactInfo.adresses || "—"}
                        </p>
                        <p className="mt-1 text-xs text-ardoise">
                          Plateau (Abidjan), Mermoz (Dakar), Bè (Lomé)
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blanc text-lapis shadow-sm">
                        <Clock className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                          Horaires
                        </p>
                        <p className="mt-0.5 font-medium text-encre">
                          {contactInfo.horaires || "—"}
                        </p>
                        <p className="mt-1 text-xs text-ardoise">
                          Sam. · 9h00 – 13h00 (sur rendez-vous)
                        </p>
                      </div>
                    </li>
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-ligne bg-or-pale/40 p-6">
                <p className="font-display text-base font-bold text-encre">
                  Vous préférez démarrer maintenant ?
                </p>
                <p className="mt-2 text-sm text-ardoise">
                  Créez votre dossier en ligne, un conseiller vous contactera dès la soumission.
                </p>
                <Button asChild className="mt-4 w-full bg-lapis text-blanc hover:bg-lapis/90">
                  <Link href="/inscription">
                    Créer mon dossier
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
