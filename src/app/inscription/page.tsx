"use client";

/**
 * /inscription — page autonome alignée sur le héros vitrine
 * (fond campus, tokens sémantiques, thème clair/sombre)
 */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { FieldError } from "@/components/ui/field-error";
import { toastApiErrorSync } from "@/lib/toast-api";
import { VitrineThemeProvider } from "@/components/site/vitrine-theme-provider";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { MotionButton } from "@/components/site/motion-button";
import { fadeInUp, motionSafeVariants } from "@/lib/animations";

const fieldClass =
  "h-12 rounded-md border-border bg-background text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

type Destination = {
  universiteId: string;
  formationId: string | null;
  universiteNom: string;
  formationLabel: string | null;
};

function passwordStrength(pw: string): { score: number; label: string; tone: string } {
  if (!pw) return { score: 0, label: "", tone: "bg-border" };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;
  if (score <= 1) return { score, label: "Faible", tone: "bg-carmin" };
  if (score === 2) return { score, label: "Moyen", tone: "bg-ambre" };
  if (score === 3) return { score, label: "Bon", tone: "bg-primary" };
  return { score, label: "Fort", tone: "bg-primary" };
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
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <VitrineThemeProvider>
        <InscriptionInner />
      </VitrineThemeProvider>
    </Suspense>
  );
}

function InscriptionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const reduce = useReducedMotion();
  const variants = motionSafeVariants(reduce, fadeInUp);
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
  const [nationalitesError, setNationalitesError] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [destination, setDestination] = React.useState<Destination | null>(null);
  const [loadingDest, setLoadingDest] = React.useState(false);
  const strength = passwordStrength(form.password);

  const { universiteId, formationId } = React.useMemo(
    () => parseDossierCallback(callbackUrl),
    [callbackUrl],
  );

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      fetch("/api/public/nationalites")
        .then(async (r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data: string[]) => {
          if (cancelled) return;
          setNationalites(Array.isArray(data) ? data : []);
          setNationalitesError(false);
          setLoadingNationalites(false);
        })
        .catch(() => {
          if (cancelled) return;
          setNationalites([]);
          setNationalitesError(true);
          setLoadingNationalites(false);
          toastApiErrorSync(new Error("Impossible de charger la liste des nationalités."), {
            title: "Liste indisponible",
          });
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
            } | null,
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
          },
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
      const first = Object.keys(
        (() => {
          const e: Record<string, string> = {};
          if (!form.prenom.trim()) e.prenom = "1";
          else if (!form.nom.trim()) e.nom = "1";
          else if (!form.email.trim()) e.email = "1";
          else if (!form.nationalite) e.nationalite = "1";
          else if (!form.password) e.password = "1";
          else if (form.confirm !== form.password) e.confirm = "1";
          return e;
        })(),
      )[0];
      if (first) document.getElementById(first)?.focus();
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
            : "/connexion",
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
      toastApiErrorSync(
        new Error("Une erreur est survenue. Vérifiez votre connexion et réessayez."),
        { title: "Inscription interrompue" },
      );
    }
    setLoading(false);
  };

  const loginHref = callbackUrl
    ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/connexion";

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/images/campus-sorbonne.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-25"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="glow-primary absolute -left-24 top-10 h-80 w-80 blur-3xl" />
        <div className="glow-primary absolute -right-16 bottom-0 h-72 w-72 opacity-60 blur-3xl" />
      </div>

      <div className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Accueil GET Admission"
        >
          <BrandLogo height={48} priority className="max-h-12 w-auto max-w-[200px]" />
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12 pt-2 sm:px-6">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants}
          className="glass-card w-full max-w-md rounded-xl p-6 shadow-lg sm:p-8"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-eyebrow text-primary">
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
            Compte candidat
          </span>

          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Créer mon compte
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            En moins de 2 minutes — accès immédiat à votre espace dossier.
          </p>

          {(destinationAffichee || loadingDestAffiche) && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-primary/25 bg-primary/10 px-3.5 py-3">
              <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
              <div className="min-w-0 text-xs leading-snug">
                <p className="font-medium text-foreground">Vous rejoignez</p>
                {loadingDestAffiche ? (
                  <p className="mt-0.5 text-muted-foreground">Chargement…</p>
                ) : destinationAffichee ? (
                  <p className="mt-0.5 truncate text-muted-foreground">
                    <span className="font-medium text-primary">
                      {destinationAffichee.universiteNom}
                    </span>
                    {destinationAffichee.formationLabel
                      ? ` · ${destinationAffichee.formationLabel}`
                      : null}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-6" noValidate>
            <fieldset className="space-y-3.5">
              <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                01 · Identité
              </legend>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom" className="text-sm font-medium text-foreground">
                    Prénom
                  </Label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <Input
                      id="prenom"
                      value={form.prenom}
                      onChange={(e) => set("prenom", e.target.value)}
                      className={cn("pl-10", fieldClass, errors.prenom && "border-carmin")}
                      placeholder="Fatou"
                      aria-invalid={!!errors.prenom}
                      aria-describedby={errors.prenom ? "err-inscription-prenom" : undefined}
                    />
                  </div>
                  <FieldError id="err-inscription-prenom" message={errors.prenom} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom" className="text-sm font-medium text-foreground">
                    Nom
                  </Label>
                  <Input
                    id="nom"
                    value={form.nom}
                    onChange={(e) => set("nom", e.target.value)}
                    className={cn(fieldClass, errors.nom && "border-carmin")}
                    placeholder="Diallo"
                    aria-invalid={!!errors.nom}
                    aria-describedby={errors.nom ? "err-inscription-nom" : undefined}
                  />
                  <FieldError id="err-inscription-nom" message={errors.nom} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                    aria-describedby={errors.email ? "err-inscription-email" : undefined}
                  />
                </div>
                <FieldError id="err-inscription-email" message={errors.email} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nationalite" className="text-sm font-medium text-foreground">
                  Nationalité
                </Label>
                <Select value={form.nationalite} onValueChange={(v) => set("nationalite", v)}>
                  <SelectTrigger
                    id="nationalite"
                    className={cn(
                      "h-12 w-full rounded-md border-border bg-background text-foreground shadow-none data-[placeholder]:text-muted-foreground",
                      errors.nationalite && "border-carmin",
                    )}
                    aria-invalid={!!errors.nationalite}
                    aria-describedby={
                      errors.nationalite || nationalitesError
                        ? "err-inscription-nationalite"
                        : undefined
                    }
                  >
                    <SelectValue
                      placeholder={
                        loadingNationalites
                          ? "Chargement…"
                          : nationalitesError
                            ? "Liste indisponible — réessayez plus tard"
                            : "Sélectionnez votre nationalité"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover text-popover-foreground">
                    {nationalites.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError
                  id="err-inscription-nationalite"
                  message={
                    errors.nationalite ||
                    (nationalitesError
                      ? "Impossible de charger les nationalités. Rafraîchissez la page."
                      : null)
                  }
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3.5">
              <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                02 · Accès
              </legend>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                    aria-describedby={errors.password ? "err-inscription-password" : undefined}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
                <AnimatePresence>
                  {form.password ? (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={reduce ? undefined : { opacity: 0, height: 0 }}
                      className="overflow-hidden pt-1"
                    >
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors duration-300",
                              i <= strength.score ? strength.tone : "bg-border",
                            )}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          Solidité : {strength.label}
                        </p>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <FieldError id="err-inscription-password" message={errors.password} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
                  Confirmer
                </Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                    aria-describedby={errors.confirm ? "err-inscription-confirm" : undefined}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
                <FieldError id="err-inscription-confirm" message={errors.confirm} />
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="sr-only">Consentement</legend>
              <label htmlFor="consent" className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  id="consent"
                  checked={form.consent}
                  onCheckedChange={(v) => set("consent", !!v)}
                  className="mt-0.5 border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  J&apos;accepte les{" "}
                  <Link
                    href="/mentions-legales"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    conditions d&apos;agence
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/mentions-legales"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
              <FieldError id="err-inscription-consent" message={errors.consent} />

              <div className="flex w-full [&>div]:w-full [&_button]:w-full">
                <MotionButton type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Création…
                    </>
                  ) : (
                    <>
                      Créer mon compte
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </>
                  )}
                </MotionButton>
              </div>
            </fieldset>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link
              href={loginHref}
              className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
