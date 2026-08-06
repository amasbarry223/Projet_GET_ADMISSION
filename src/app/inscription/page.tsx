"use client";

/**
 * /inscription — design login + parcours 2 étapes sécurisé
 * Étape 1 Identité · Étape 2 Accès (mdp + consentement)
 */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
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
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  Plane,
  Globe2,
  Check,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { FieldError } from "@/components/ui/field-error";
import { toastApiErrorSync } from "@/lib/toast-api";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/shared/constants";

type Destination = {
  universiteId: string;
  formationId: string | null;
  universiteNom: string;
  formationLabel: string | null;
};

type Step = 1 | 2;

const NAME_RE = /^[\p{L}][\p{L}\s'.-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "motdepasse",
  "12345678",
  "123456789",
  "azertyui",
  "qwerty123",
  "getadmission",
]);

function sanitizeName(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[^\p{L}\s'.-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX_LENGTH);
}

function sanitizeEmail(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/g, "").slice(0, EMAIL_MAX_LENGTH);
}

function passwordChecks(pw: string, email: string) {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return {
    length: pw.length >= PASSWORD_MIN_LENGTH && pw.length <= PASSWORD_MAX_LENGTH,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    notEmail: !local || local.length < 3 || !pw.toLowerCase().includes(local),
    notCommon: !COMMON_PASSWORDS.has(pw.toLowerCase()),
  };
}

function passwordStrength(pw: string, email: string): { score: number; label: string; tone: string } {
  if (!pw) return { score: 0, label: "", tone: "bg-ligne" };
  const c = passwordChecks(pw, email);
  let score = 0;
  if (c.length) score += 1;
  if (c.upper && c.lower) score += 1;
  if (c.digit) score += 1;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score += 1;
  if (!c.notEmail || !c.notCommon) score = Math.min(score, 1);
  if (score <= 1) return { score: Math.max(score, 1), label: "Faible", tone: "bg-carmin" };
  if (score === 2) return { score, label: "Moyen", tone: "bg-ambre" };
  if (score === 3) return { score, label: "Bon", tone: "bg-lapis" };
  return { score, label: "Fort", tone: "bg-lapis" };
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
    <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-6">
      <Image
        src="/images/auth-students-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        aria-hidden
      />
      <div className="absolute inset-0 bg-encre/55" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-blanc" />}>
          <InscriptionInner />
        </Suspense>
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const items = [
    { n: 1 as const, label: "Identité" },
    { n: 2 as const, label: "Accès" },
  ];
  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Étapes d'inscription">
      {items.map((item, idx) => {
        const done = step > item.n;
        const active = step === item.n;
        return (
          <React.Fragment key={item.n}>
            {idx > 0 ? (
              <span
                className={cn("h-px flex-1", done || active ? "bg-lapis/40" : "bg-ligne")}
                aria-hidden
              />
            ) : null}
            <li
              className={cn(
                "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
                active && "bg-lapis/10 text-lapis",
                done && "text-lapis",
                !active && !done && "text-ardoise",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px]",
                  active && "bg-lapis text-blanc",
                  done && "bg-lapis text-blanc",
                  !active && !done && "bg-porcelaine text-ardoise",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : item.n}
              </span>
              {item.label}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function InscriptionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"));
  const [step, setStep] = React.useState<Step>(1);
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
  const strength = passwordStrength(form.password, form.email);
  const checks = passwordChecks(form.password, form.email);

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

  const setField = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    const prenom = form.prenom.trim();
    const nom = form.nom.trim();
    const email = sanitizeEmail(form.email).toLowerCase();

    if (!prenom) e.prenom = "Veuillez renseigner votre prénom.";
    else if (prenom.length < 2) e.prenom = "Le prénom doit contenir au moins 2 caractères.";
    else if (!NAME_RE.test(prenom)) e.prenom = "Caractères non autorisés dans le prénom.";

    if (!nom) e.nom = "Veuillez renseigner votre nom.";
    else if (nom.length < 2) e.nom = "Le nom doit contenir au moins 2 caractères.";
    else if (!NAME_RE.test(nom)) e.nom = "Caractères non autorisés dans le nom.";

    if (!email) e.email = "Veuillez renseigner votre e-mail.";
    else if (!EMAIL_RE.test(email)) e.email = "Indiquez une adresse e-mail valide.";
    else if (email.length > EMAIL_MAX_LENGTH) e.email = "E-mail trop long.";

    if (!form.nationalite) e.nationalite = "Sélectionnez votre nationalité.";
    else if (!nationalites.includes(form.nationalite)) {
      e.nationalite = "Nationalité invalide.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    const pw = form.password;
    const c = passwordChecks(pw, form.email);

    if (!pw) e.password = "Veuillez choisir un mot de passe.";
    else if (!c.length) {
      e.password = `Le mot de passe doit contenir entre ${PASSWORD_MIN_LENGTH} et ${PASSWORD_MAX_LENGTH} caractères.`;
    } else if (!c.upper || !c.lower || !c.digit) {
      e.password = "Incluez au moins une majuscule, une minuscule et un chiffre.";
    } else if (!c.notEmail) {
      e.password = "Le mot de passe ne doit pas contenir votre e-mail.";
    } else if (!c.notCommon) {
      e.password = "Ce mot de passe est trop courant. Choisissez-en un autre.";
    }

    if (!form.confirm) e.confirm = "Confirmez votre mot de passe.";
    else if (form.confirm !== pw) e.confirm = "Les mots de passe ne correspondent pas.";

    if (!form.consent) e.consent = "Vous devez accepter les conditions d'agence.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep1()) {
      toast.error("Étape incomplète", { description: "Corrigez les champs signalés." });
      return;
    }
    setForm((f) => ({
      ...f,
      prenom: f.prenom.trim(),
      nom: f.nom.trim(),
      email: sanitizeEmail(f.email).toLowerCase(),
    }));
    setStep(2);
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (step === 1) {
      goNext();
      return;
    }
    if (!validateStep1()) {
      setStep(1);
      toast.error("Identité incomplète", { description: "Vérifiez l'étape 1." });
      return;
    }
    if (!validateStep2()) {
      toast.error("Sécurité insuffisante", { description: "Renforcez votre mot de passe." });
      return;
    }

    setLoading(true);
    const payload = {
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email: sanitizeEmail(form.email).toLowerCase(),
      password: form.password,
      nationalite: form.nationalite,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
          setStep(1);
          setErrors((e) => ({ ...e, email: "Un compte existe déjà avec cet e-mail." }));
        } else {
          toast.error("Inscription échouée", {
            description: data.error || "Erreur lors de la création du compte.",
          });
        }
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
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

      toast.success("Compte créé", { description: "Bienvenue sur GET Admission." });
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
    <div className="rounded-lg border border-ligne bg-blanc p-6 shadow-md sm:p-8">
      <Link href="/" className="mb-5 flex items-center justify-center">
        <BrandLogo height={52} priority className="object-center" />
      </Link>

      <StepIndicator step={step} />

      <div className="mb-1 flex items-center gap-1.5 text-lapis">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
        <p className="eyebrow !mb-0">Espace candidat · Sécurisé</p>
      </div>
      <h1 className="font-display text-2xl font-bold text-encre">
        {step === 1 ? "Qui êtes-vous ?" : "Sécurisez votre accès."}
      </h1>
      <p className="mt-1.5 text-sm text-ardoise">
        {step === 1
          ? "Étape 1/2 — Vos informations d'identité."
          : "Étape 2/2 — Mot de passe robuste et consentement."}
      </p>

      {(destinationAffichee || loadingDestAffiche) && (
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-lapis/20 bg-lapis/5 px-3.5 py-3">
          <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lapis" strokeWidth={1.75} />
          <div className="min-w-0 text-xs leading-snug">
            <p className="font-medium text-encre">Vous rejoignez</p>
            {loadingDestAffiche ? (
              <p className="mt-0.5 text-ardoise">Chargement…</p>
            ) : destinationAffichee ? (
              <p className="mt-0.5 truncate text-ardoise">
                <span className="font-medium text-lapis">{destinationAffichee.universiteNom}</span>
                {destinationAffichee.formationLabel
                  ? ` · ${destinationAffichee.formationLabel}`
                  : null}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate autoComplete="on">
        {step === 1 ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="prenom" className="text-sm font-medium text-encre">
                  Prénom
                </Label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                    strokeWidth={1.5}
                  />
                  <Input
                    id="prenom"
                    value={form.prenom}
                    onChange={(e) => setField("prenom", sanitizeName(e.target.value))}
                    onBlur={() => setField("prenom", form.prenom.trim())}
                    className={cn("pl-9", errors.prenom && "border-carmin")}
                    placeholder="Fatou"
                    autoComplete="given-name"
                    maxLength={NAME_MAX_LENGTH}
                    spellCheck={false}
                    aria-invalid={!!errors.prenom}
                    aria-describedby={errors.prenom ? "err-inscription-prenom" : undefined}
                  />
                </div>
                <FieldError id="err-inscription-prenom" message={errors.prenom} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom" className="text-sm font-medium text-encre">
                  Nom
                </Label>
                <Input
                  id="nom"
                  value={form.nom}
                  onChange={(e) => setField("nom", sanitizeName(e.target.value))}
                  onBlur={() => setField("nom", form.nom.trim())}
                  className={cn(errors.nom && "border-carmin")}
                  placeholder="Diallo"
                  autoComplete="family-name"
                  maxLength={NAME_MAX_LENGTH}
                  spellCheck={false}
                  aria-invalid={!!errors.nom}
                  aria-describedby={errors.nom ? "err-inscription-nom" : undefined}
                />
                <FieldError id="err-inscription-nom" message={errors.nom} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-encre">
                E-mail
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                  strokeWidth={1.5}
                />
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => setField("email", sanitizeEmail(e.target.value))}
                  onBlur={() => setField("email", sanitizeEmail(form.email).toLowerCase())}
                  className={cn("pl-9", errors.email && "border-carmin")}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  maxLength={EMAIL_MAX_LENGTH}
                  spellCheck={false}
                  autoCapitalize="none"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "err-inscription-email" : undefined}
                />
              </div>
              <FieldError id="err-inscription-email" message={errors.email} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nationalite" className="text-sm font-medium text-encre">
                Nationalité
              </Label>
              <div className="relative">
                <Globe2
                  className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ardoise"
                  strokeWidth={1.5}
                />
                <Select
                  value={form.nationalite}
                  onValueChange={(v) => setField("nationalite", v)}
                >
                  <SelectTrigger
                    id="nationalite"
                    className={cn("pl-9", errors.nationalite && "border-carmin")}
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
                            ? "Liste indisponible"
                            : "Sélectionnez votre nationalité"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalites.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <Button
              type="submit"
              className="w-full bg-lapis text-blanc hover:bg-lapis/90"
            >
              Continuer
              <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-md border border-ligne bg-porcelaine/60 px-3 py-2 text-xs text-ardoise">
              Compte :{" "}
              <span className="font-medium text-encre">
                {form.prenom} {form.nom}
              </span>{" "}
              · {form.email}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-encre">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                  strokeWidth={1.5}
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setField("password", e.target.value.slice(0, PASSWORD_MAX_LENGTH))
                  }
                  className={cn("pl-9 pr-10", errors.password && "border-carmin")}
                  placeholder={`${PASSWORD_MIN_LENGTH}+ caractères`}
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  spellCheck={false}
                  aria-invalid={!!errors.password}
                  aria-describedby="pwd-rules err-inscription-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ardoise hover:bg-porcelaine hover:text-encre"
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

              {form.password ? (
                <div className="pt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= strength.score ? strength.tone : "bg-ligne",
                        )}
                      />
                    ))}
                  </div>
                  {strength.label ? (
                    <p className="mt-1 text-[11px] text-ardoise">Solidité : {strength.label}</p>
                  ) : null}
                </div>
              ) : null}

              <ul id="pwd-rules" className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                {(
                  [
                    ["length", `${PASSWORD_MIN_LENGTH}+ caractères`],
                    ["upper", "Une majuscule"],
                    ["lower", "Une minuscule"],
                    ["digit", "Un chiffre"],
                  ] as const
                ).map(([key, label]) => (
                  <li
                    key={key}
                    className={cn(
                      "flex items-center gap-1",
                      checks[key] ? "text-lapis" : "text-ardoise",
                    )}
                  >
                    <Check
                      className={cn("h-3 w-3", checks[key] ? "opacity-100" : "opacity-30")}
                      strokeWidth={2.5}
                    />
                    {label}
                  </li>
                ))}
              </ul>
              <FieldError id="err-inscription-password" message={errors.password} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium text-encre">
                Confirmer le mot de passe
              </Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ardoise"
                  strokeWidth={1.5}
                />
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) =>
                    setField("confirm", e.target.value.slice(0, PASSWORD_MAX_LENGTH))
                  }
                  className={cn("pl-9 pr-10", errors.confirm && "border-carmin")}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  spellCheck={false}
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? "err-inscription-confirm" : undefined}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ardoise hover:bg-porcelaine hover:text-encre"
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

            <div className="space-y-1.5">
              <label htmlFor="consent" className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  id="consent"
                  checked={form.consent}
                  onCheckedChange={(v) => setField("consent", !!v)}
                  className="mt-0.5"
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "err-inscription-consent" : undefined}
                />
                <span className="text-xs leading-relaxed text-ardoise">
                  J&apos;accepte les{" "}
                  <Link
                    href="/mentions-legales"
                    className="font-medium text-lapis-clair hover:underline"
                  >
                    conditions d&apos;agence
                  </Link>{" "}
                  et la{" "}
                  <Link
                    href="/mentions-legales"
                    className="font-medium text-lapis-clair hover:underline"
                  >
                    politique de confidentialité
                  </Link>
                  .
                </span>
              </label>
              <FieldError id="err-inscription-consent" message={errors.consent} />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                Retour
              </Button>
              <Button
                type="submit"
                className="min-w-0 flex-1 bg-lapis text-blanc hover:bg-lapis/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création…
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-ardoise">
        Déjà un compte ?{" "}
        <Link href={loginHref} className="font-medium text-lapis-clair hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
