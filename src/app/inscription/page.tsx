"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Plane,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

const EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_MS = 5200;

/** Campus africains partenaires — assets locaux */
const CAMPUS_AFRIQUE = [
  {
    src: "/images/partenaires/universite-yaounde-i/cover.webp",
    nom: "Université de Yaoundé I",
    lieu: "Yaoundé · Cameroun",
  },
  {
    src: "/images/partenaires/universite-gaston-berger/cover.webp",
    nom: "Université Gaston Berger",
    lieu: "Saint-Louis · Sénégal",
  },
  {
    src: "/images/partenaires/universite-cape-town/cover.webp",
    nom: "University of Cape Town",
    lieu: "Le Cap · Afrique du Sud",
  },
  {
    src: "/images/partenaires/universite-mohammed-v-rabat/cover.webp",
    nom: "Université Mohammed V",
    lieu: "Rabat · Maroc",
  },
  {
    src: "/images/partenaires/universite-tunis-el-manar/cover.webp",
    nom: "Université Tunis El Manar",
    lieu: "Tunis · Tunisie",
  },
] as const;

const fieldClass =
  "h-12 rounded-xl border-ligne bg-blanc text-encre placeholder:text-ardoise/70 focus-visible:border-lapis focus-visible:ring-lapis/25";

type Destination = {
  universiteId: string;
  formationId: string | null;
  universiteNom: string;
  formationLabel: string | null;
};

function passwordStrength(pw: string): { score: number; label: string; tone: string } {
  if (!pw) return { score: 0, label: "", tone: "bg-ligne" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 1) return { score, label: "Faible", tone: "bg-carmin" };
  if (score === 2) return { score, label: "Moyen", tone: "bg-ambre" };
  if (score === 3) return { score, label: "Bon", tone: "bg-lapis" };
  return { score, label: "Fort", tone: "bg-or" };
}

function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function parseDossierCallback(callbackUrl: string | null): {
  universiteId: string | null;
  formationId: string | null;
} {
  if (!callbackUrl) return { universiteId: null, formationId: null };
  try {
    const url = new URL(callbackUrl, "http://local.invalid");
    if (!url.pathname.startsWith("/espace/dossier")) {
      return { universiteId: null, formationId: null };
    }
    return {
      universiteId: url.searchParams.get("universite"),
      formationId: url.searchParams.get("formation"),
    };
  } catch {
    return { universiteId: null, formationId: null };
  }
}

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-porcelaine">
          <Loader2 className="h-6 w-6 animate-spin text-lapis" />
        </div>
      }
    >
      <InscriptionInner />
    </Suspense>
  );
}

function InscriptionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const reduce = useReducedMotion();
  const [form, setForm] = React.useState({
    prenom: "",
    nom: "",
    email: "",
    password: "",
    confirm: "",
    nationalite: "",
    consent: false,
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  const [nationalites, setNationalites] = React.useState<string[]>([]);
  const [loadingNationalites, setLoadingNationalites] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [destination, setDestination] = React.useState<Destination | null>(null);
  const [loadingDest, setLoadingDest] = React.useState(false);
  const [campusIndex, setCampusIndex] = React.useState(0);
  const strength = passwordStrength(form.password);
  const campus = CAMPUS_AFRIQUE[campusIndex];

  const { universiteId, formationId } = React.useMemo(
    () => parseDossierCallback(callbackUrl),
    [callbackUrl]
  );

  React.useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setCampusIndex((i) => (i + 1) % CAMPUS_AFRIQUE.length);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      fetch("/api/public/nationalites")
        .then((r) => r.json())
        .then((data: string[]) => {
          if (cancelled) return;
          setNationalites(Array.isArray(data) ? data : []);
          setLoadingNationalites(false);
        })
        .catch(() => {
          if (cancelled) return;
          setNationalites([]);
          setLoadingNationalites(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!universiteId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadingDest(true);
      fetch(`/api/universites/${universiteId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (
            data: {
              nom?: string;
              formations?: { id: string; intitule?: string; niveau?: string }[];
            } | null
          ) => {
            if (cancelled || !data?.nom) {
              if (!cancelled) setDestination(null);
              return;
            }
            const formation = formationId
              ? data.formations?.find((f) => f.id === formationId)
              : undefined;
            const formationLabel = formation
              ? [formation.niveau, formation.intitule].filter(Boolean).join(" · ") ||
                formation.intitule ||
                null
              : null;
            setDestination({
              universiteId,
              formationId,
              universiteNom: data.nom,
              formationLabel,
            });
          }
        )
        .catch(() => {
          if (!cancelled) setDestination(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingDest(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [universiteId, formationId]);

  const destinationAffichee = universiteId ? destination : null;
  const loadingDestAffiche = universiteId ? loadingDest : false;

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.prenom.trim()) e.prenom = "Veuillez renseigner votre prénom.";
    if (!form.nom.trim()) e.nom = "Veuillez renseigner votre nom.";
    if (!form.email.trim()) e.email = "Veuillez renseigner votre e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "L'e-mail saisi n'est pas valide.";
    if (!form.password) e.password = "Veuillez choisir un mot de passe.";
    else if (form.password.length < 8)
      e.password = "Le mot de passe doit contenir au moins 8 caractères.";
    if (form.confirm !== form.password) e.confirm = "Les mots de passe ne correspondent pas.";
    if (!form.nationalite) e.nationalite = "Sélectionnez votre nationalité.";
    if (!form.consent) e.consent = "Vous devez accepter les conditions d'agence.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error("Formulaire incomplet", { description: "Vérifiez les champs signalés." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom: form.prenom,
          nom: form.nom,
          email: form.email,
          password: form.password,
          nationalite: form.nationalite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ALREADY_REGISTERED") {
          toast.error("Compte existant", {
            description: data.error,
            action: {
              label: "Se connecter",
              onClick: () => router.push("/connexion"),
            },
          });
        } else {
          toast.error("Inscription échouée", {
            description: data.error || "Erreur lors de la création du compte.",
          });
        }
        setLoading(false);
        return;
      }

      const emailNorm = form.email.toLowerCase().trim();
      const signInRes = await signIn("credentials", {
        email: emailNorm,
        password: form.password,
        portal: "candidat",
        redirect: false,
      });

      if (signInRes?.error) {
        toast.success("Compte créé", {
          description: "Connectez-vous avec votre e-mail et mot de passe.",
        });
        setLoading(false);
        router.push(
          callbackUrl
            ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : "/connexion"
        );
        return;
      }

      toast.success("Compte créé", {
        description: "Bienvenue sur GET Admission.",
      });

      const dest =
        callbackUrl &&
        (callbackUrl === "/espace" || callbackUrl.startsWith("/espace/"))
          ? callbackUrl
          : "/espace";
      router.push(dest);
      return;
    } catch {
      toast.error("Erreur", { description: "Une erreur est survenue. Réessayez." });
    }
    setLoading(false);
  };

  const loginHref = callbackUrl
    ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/connexion";

  return (
    <div className="grid min-h-screen bg-blanc text-encre lg:grid-cols-2">
      {/* —— Colonne campus Afrique (clair) —— */}
      <section
        className="relative flex min-h-[42vh] flex-col overflow-hidden bg-or-pale lg:min-h-screen"
        aria-roledescription="carousel"
        aria-label="Campus universitaires africains partenaires"
      >
        <div className="absolute inset-0" aria-hidden>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={campus.src}
              className="absolute inset-0"
              initial={reduce ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <Image
                src={campus.src}
                alt=""
                fill
                priority={campusIndex === 0}
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </motion.div>
          </AnimatePresence>
          {/* Voile clair — lisibilité sans panneau sombre */}
          <div className="absolute inset-0 bg-gradient-to-t from-blanc via-blanc/75 to-blanc/30" />
          <div className="absolute inset-0 bg-gradient-to-br from-or-pale/55 via-transparent to-blanc/45" />
        </div>

        <div className="relative z-10 flex h-full flex-1 flex-col justify-between px-6 py-7 sm:px-10 lg:px-12 lg:py-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex items-start justify-between gap-3"
          >
            <Link
              href="/"
              className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis focus-visible:ring-offset-2"
            >
              <BrandLogo height={48} priority />
            </Link>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={campus.nom}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="max-w-[11rem] rounded-full border border-ligne/80 bg-blanc/90 px-3 py-1.5 text-right backdrop-blur-sm sm:max-w-none"
              >
                <p className="truncate font-mono text-[10px] font-medium uppercase tracking-wide text-encre">
                  {campus.nom}
                </p>
                <p className="truncate font-mono text-[9px] uppercase tracking-wide text-ardoise">
                  {campus.lieu}
                </p>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="my-8 max-w-lg lg:my-0">
            <motion.p
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-or"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06, ease: EASE }}
            >
              Campus Afrique · Compte candidat
            </motion.p>
            <motion.h1
              className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.06] tracking-tight text-encre text-balance"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12, ease: EASE }}
            >
              Embarquez pour votre admission.
            </motion.h1>
            <motion.p
              className="mt-3 max-w-md text-sm leading-relaxed text-ardoise text-pretty sm:text-base"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
            >
              Des universités africaines partenaires vous attendent — créez votre compte et
              démarrez votre dossier.
            </motion.p>

            {/* Stub destination — surface claire */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26, ease: EASE }}
              className="mt-6 max-w-md overflow-hidden rounded-2xl border border-ligne bg-blanc shadow-sm"
            >
              <div className="rule-or" aria-hidden />
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-or-pale text-lapis">
                  <Plane className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                    {destinationAffichee || loadingDestAffiche ? "Destination réservée" : "Destination"}
                  </p>
                  {loadingDestAffiche ? (
                    <p className="mt-1 flex items-center gap-2 text-sm text-ardoise">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-lapis" />
                      Chargement…
                    </p>
                  ) : destinationAffichee ? (
                    <>
                      <p className="mt-1 font-display text-base font-bold leading-snug text-encre">
                        {destinationAffichee.universiteNom}
                      </p>
                      {destinationAffichee.formationLabel && (
                        <p className="mt-0.5 truncate text-sm text-ardoise">
                          {destinationAffichee.formationLabel}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="mt-1 font-display text-base font-bold text-encre">
                        Destination à choisir
                      </p>
                      <p className="mt-0.5 text-sm text-ardoise">
                        Catalogue partenaires · après inscription
                      </p>
                    </>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide text-lapis">
                  GET-NEW
                </span>
              </div>
            </motion.div>

            <motion.ul
              className="mt-6 hidden space-y-2 lg:block"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.34 }}
            >
              {[
                "Campus partenaires en Afrique",
                "Conseiller dédié",
                "Paiement Mobile Money",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-encre/80">
                  <Check className="h-3.5 w-3.5 shrink-0 text-lapis" strokeWidth={2} />
                  {t}
                </li>
              ))}
            </motion.ul>

            {/* Indicateurs diaporama */}
            <div className="mt-6 flex gap-1.5" role="tablist" aria-label="Campus">
              {CAMPUS_AFRIQUE.map((c, i) => (
                <button
                  key={c.src}
                  type="button"
                  role="tab"
                  aria-selected={i === campusIndex}
                  aria-label={c.nom}
                  onClick={() => setCampusIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === campusIndex ? "w-7 bg-lapis" : "w-1.5 bg-encre/20 hover:bg-encre/35"
                  )}
                />
              ))}
            </div>
          </div>

          <p className="relative z-10 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ardoise lg:block">
            Cameroun · Sénégal · Afrique du Sud · Maroc · Tunisie
          </p>
        </div>
      </section>

      {/* —— Colonne formulaire — clair, hors carte —— */}
      <section className="relative flex items-center bg-porcelaine px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% 12%, rgba(60,169,54,0.08), transparent 40%), radial-gradient(circle at 10% 90%, rgba(46,131,41,0.05), transparent 36%)",
          }}
        />

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="relative z-10 mx-auto w-full max-w-md lg:mx-0"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ardoise">
                Inscription candidat
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-encre text-balance sm:text-[1.75rem]">
                Créer mon compte
              </h2>
              <p className="mt-1.5 text-sm text-ardoise">
                Remplissez vos informations pour accéder à votre espace.
              </p>
            </div>
            <Link
              href={loginHref}
              className="shrink-0 rounded-full border border-ligne bg-blanc px-3 py-1.5 text-xs font-medium text-encre transition-colors hover:border-lapis/40 hover:bg-or-pale hover:text-lapis"
            >
              Se connecter
            </Link>
          </div>

          {(destinationAffichee || loadingDestAffiche) && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-lapis/15 bg-or-pale/70 px-3.5 py-2.5">
              <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lapis" strokeWidth={1.75} />
              <div className="min-w-0 text-xs leading-snug">
                <p className="font-medium text-encre">Vous rejoignez</p>
                {loadingDestAffiche ? (
                  <p className="mt-0.5 text-ardoise">Chargement…</p>
                ) : destinationAffichee ? (
                  <p className="mt-0.5 truncate text-ardoise">
                    <span className="font-medium text-lapis">{destinationAffichee.universiteNom}</span>
                    {destinationAffichee.formationLabel ? ` · ${destinationAffichee.formationLabel}` : null}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
            <fieldset className="space-y-3.5">
              <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-ardoise">
                01 · Identité
              </legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom" className="text-sm font-medium text-encre">
                    Prénom
                  </Label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                      strokeWidth={1.5}
                    />
                    <Input
                      id="prenom"
                      value={form.prenom}
                      onChange={(e) => set("prenom", e.target.value)}
                      className={cn("pl-10", fieldClass, errors.prenom && "border-carmin")}
                      placeholder="Fatou"
                      aria-invalid={!!errors.prenom}
                    />
                  </div>
                  {errors.prenom && <p className="text-xs text-carmin">{errors.prenom}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom" className="text-sm font-medium text-encre">
                    Nom
                  </Label>
                  <Input
                    id="nom"
                    value={form.nom}
                    onChange={(e) => set("nom", e.target.value)}
                    className={cn(fieldClass, errors.nom && "border-carmin")}
                    placeholder="Diallo"
                    aria-invalid={!!errors.nom}
                  />
                  {errors.nom && <p className="text-xs text-carmin">{errors.nom}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-encre">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                    strokeWidth={1.5}
                  />
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={cn("pl-10", fieldClass, errors.email && "border-carmin")}
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && <p className="text-xs text-carmin">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nationalite" className="text-sm font-medium text-encre">
                  Nationalité
                </Label>
                <Select value={form.nationalite} onValueChange={(v) => set("nationalite", v)}>
                  <SelectTrigger
                    id="nationalite"
                    className={cn(
                      "h-12 w-full rounded-xl border-ligne bg-blanc text-encre shadow-none data-[placeholder]:text-ardoise/70",
                      errors.nationalite && "border-carmin"
                    )}
                    aria-invalid={!!errors.nationalite}
                  >
                    <SelectValue
                      placeholder={
                        loadingNationalites ? "Chargement…" : "Sélectionnez votre nationalité"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="border-ligne bg-blanc text-encre">
                    {nationalites.map((n) => (
                      <SelectItem key={n} value={n} className="focus:bg-or-pale focus:text-encre">
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.nationalite && (
                  <p className="text-xs text-carmin">{errors.nationalite}</p>
                )}
              </div>
            </fieldset>

            <fieldset className="space-y-3.5">
              <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-ardoise">
                02 · Accès
              </legend>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-encre">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                    strokeWidth={1.5}
                  />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    className={cn("pl-10 pr-11", fieldClass, errors.password && "border-carmin")}
                    placeholder="Minimum 8 caractères"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ardoise hover:text-encre"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {form.password && (
                  <div className="pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors duration-300",
                            i <= strength.score ? strength.tone : "bg-ligne"
                          )}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ardoise">
                        Solidité : {strength.label}
                      </p>
                    )}
                  </div>
                )}
                {errors.password && <p className="text-xs text-carmin">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm font-medium text-encre">
                  Confirmer
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                    strokeWidth={1.5}
                  />
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={form.confirm}
                    onChange={(e) => set("confirm", e.target.value)}
                    className={cn("pl-10 pr-11", fieldClass, errors.confirm && "border-carmin")}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirm}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ardoise hover:text-encre"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={
                      showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                {errors.confirm && <p className="text-xs text-carmin">{errors.confirm}</p>}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="sr-only">Consentement</legend>
              <label htmlFor="consent" className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  id="consent"
                  checked={form.consent}
                  onCheckedChange={(v) => set("consent", !!v)}
                  className="mt-0.5 border-ligne data-[state=checked]:border-lapis data-[state=checked]:bg-lapis"
                />
                <span className="text-xs leading-relaxed text-ardoise">
                  J&apos;accepte les{" "}
                  <Link
                    href="/mentions-legales"
                    className="font-medium text-lapis underline-offset-2 hover:underline"
                  >
                    conditions d&apos;agence
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/mentions-legales"
                    className="font-medium text-lapis underline-offset-2 hover:underline"
                  >
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
              {errors.consent && <p className="text-xs text-carmin">{errors.consent}</p>}

              <motion.div
                whileHover={reduce ? undefined : { y: -1 }}
                whileTap={reduce ? undefined : { scale: 0.99 }}
              >
                <Button
                  type="submit"
                  className="group h-12 w-full rounded-full bg-lapis text-blanc hover:bg-or hover:shadow-[0_0_0_6px_rgba(60,169,54,0.12)]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création…
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight
                        className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                        strokeWidth={1.5}
                      />
                    </>
                  )}
                </Button>
              </motion.div>
            </fieldset>
          </form>

          <p className="mt-8 text-sm text-ardoise">
            Déjà un compte ?{" "}
            <Link
              href={loginHref}
              className="font-medium text-encre underline-offset-4 hover:text-lapis hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </motion.div>
      </section>
    </div>
  );
}
