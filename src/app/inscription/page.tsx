"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";

const EASE = [0.22, 1, 0.36, 1] as const;

const fieldClass =
  "h-11 border-white/12 bg-white/[0.06] text-blanc placeholder:text-white/35 focus-visible:border-lapis/60 focus-visible:ring-lapis/30";

export default function InscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-encre">
          <Loader2 className="h-6 w-6 animate-spin text-blanc/60" />
        </div>
      }
    >
      <InscriptionInner />
    </Suspense>
  );
}

function safeCallback(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
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

  React.useEffect(() => {
    fetch("/api/public/nationalites")
      .then((r) => r.json())
      .then((data: string[]) => {
        setNationalites(Array.isArray(data) ? data : []);
        setLoadingNationalites(false);
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setNationalites([]);
        setLoadingNationalites(false);
      });
  }, []);

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.prenom.trim()) e.prenom = "Veuillez renseigner votre prénom.";
    if (!form.nom.trim()) e.nom = "Veuillez renseigner votre nom.";
    if (!form.email.trim()) e.email = "Veuillez renseigner votre e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "L'e-mail saisi n'est pas valide.";
    if (!form.password) e.password = "Veuillez choisir un mot de passe.";
    else if (form.password.length < 8) e.password = "Le mot de passe doit contenir au moins 8 caractères.";
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
      toast.error("Erreur", { description: "Une erreur est survenue. Réessayez." });
    }
    setLoading(false);
  };

  const loginHref = callbackUrl
    ? `/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/connexion";

  return (
    <div className="relative min-h-screen overflow-hidden bg-encre text-blanc">
      {/* Plan visuel plein écran — campus projet */}
      <div className="absolute inset-0" aria-hidden>
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
        >
          <Image
            src="/images/campus-sorbonne.jpg"
            alt=""
            fill
            priority
            className="object-cover object-[50%_35%] grayscale-[0.35] contrast-[1.05]"
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/88 to-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_minmax(0,28rem)] xl:grid-cols-[1.15fr_minmax(0,32rem)]">
        {/* Colonne marque — composition hero */}
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <Link href="/" className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lapis">
              <BrandLogo height={56} priority className="brightness-110" />
            </Link>
          </motion.div>

          <div className="my-10 max-w-xl lg:my-0">
            <motion.p
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-lapis-clair"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
            >
              Espace candidat
            </motion.p>
            <motion.h1
              className="mt-4 font-display text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.05] tracking-tight text-blanc text-balance"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.14, ease: EASE }}
            >
              Votre admission commence ici.
            </motion.h1>
            <motion.p
              className="mt-5 max-w-md text-base leading-relaxed text-white/65 text-pretty sm:text-lg"
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22, ease: EASE }}
            >
              Créez votre compte, confirmez votre e-mail, puis démarrez votre dossier en quelques minutes.
            </motion.p>

            <motion.ul
              className="mt-8 hidden gap-x-8 gap-y-2 sm:flex sm:flex-wrap"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
            >
              {["Suivi en temps réel", "Conseiller dédié", "Mobile Money & carte"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-white/55">
                  <span className="h-1 w-1 rounded-full bg-lapis" aria-hidden />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.p
            className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 lg:block"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            Confidentiel — GET Admission
          </motion.p>
        </section>

        {/* Formulaire — surface d’interaction noire */}
        <aside className="relative flex items-stretch border-t border-white/10 bg-black/85 backdrop-blur-xl lg:border-t-0 lg:border-l lg:border-white/10 lg:bg-black/92">
          <div className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:px-10 lg:py-12">
            <motion.div
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: EASE }}
              className="mx-auto w-full max-w-sm"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Inscription</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-blanc text-balance">
                Créer mon compte
              </h2>
              <p className="mt-1.5 text-sm text-white/50">
                Mot de passe, puis activation par e-mail.
              </p>

              <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom" className="text-sm font-medium text-white/80">
                      Prénom
                    </Label>
                    <div className="relative">
                      <User
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                        strokeWidth={1.5}
                      />
                      <Input
                        id="prenom"
                        value={form.prenom}
                        onChange={(e) => set("prenom", e.target.value)}
                        className={cn("pl-9", fieldClass, errors.prenom && "border-carmin")}
                        placeholder="Fatou"
                        aria-invalid={!!errors.prenom}
                      />
                    </div>
                    {errors.prenom && <p className="text-xs text-carmin">{errors.prenom}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nom" className="text-sm font-medium text-white/80">
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
                  <Label htmlFor="email" className="text-sm font-medium text-white/80">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                      strokeWidth={1.5}
                    />
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={cn("pl-9", fieldClass, errors.email && "border-carmin")}
                      placeholder="vous@exemple.com"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-carmin">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nationalite" className="text-sm font-medium text-white/80">
                    Nationalité
                  </Label>
                  <Select value={form.nationalite} onValueChange={(v) => set("nationalite", v)}>
                    <SelectTrigger
                      id="nationalite"
                      className={cn(
                        "h-11 w-full border-white/12 bg-white/[0.06] text-blanc shadow-none data-[placeholder]:text-white/35 [&_svg]:text-white/35",
                        errors.nationalite && "border-carmin",
                      )}
                      aria-invalid={!!errors.nationalite}
                    >
                      <SelectValue
                        placeholder={loadingNationalites ? "Chargement…" : "Sélectionnez votre nationalité"}
                      />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-encre text-blanc">
                      {nationalites.map((n) => (
                        <SelectItem
                          key={n}
                          value={n}
                          className="focus:bg-white/10 focus:text-blanc"
                        >
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.nationalite && <p className="text-xs text-carmin">{errors.nationalite}</p>}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-white/80">
                      Mot de passe
                    </Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                        strokeWidth={1.5}
                      />
                      <Input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                        className={cn("pl-9", fieldClass, errors.password && "border-carmin")}
                        placeholder="Minimum 8 caractères"
                        autoComplete="new-password"
                        aria-invalid={!!errors.password}
                      />
                    </div>
                    {errors.password && <p className="text-xs text-carmin">{errors.password}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-sm font-medium text-white/80">
                      Confirmer
                    </Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                        strokeWidth={1.5}
                      />
                      <Input
                        id="confirm"
                        type="password"
                        value={form.confirm}
                        onChange={(e) => set("confirm", e.target.value)}
                        className={cn("pl-9", fieldClass, errors.confirm && "border-carmin")}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        aria-invalid={!!errors.confirm}
                      />
                    </div>
                    {errors.confirm && <p className="text-xs text-carmin">{errors.confirm}</p>}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label htmlFor="consent" className="flex cursor-pointer items-start gap-2.5">
                    <Checkbox
                      id="consent"
                      checked={form.consent}
                      onCheckedChange={(v) => set("consent", !!v)}
                      className="mt-0.5 border-white/30 data-[state=checked]:border-lapis data-[state=checked]:bg-lapis"
                    />
                    <span className="text-xs leading-relaxed text-white/50">
                      J&apos;accepte les{" "}
                      <Link href="/mentions-legales" className="text-lapis-clair underline-offset-2 hover:underline">
                        conditions d&apos;agence
                      </Link>{" "}
                      et la{" "}
                      <Link href="/mentions-legales" className="text-lapis-clair underline-offset-2 hover:underline">
                        politique de confidentialité
                      </Link>
                      .
                    </span>
                  </label>
                  {errors.consent && <p className="text-xs text-carmin">{errors.consent}</p>}
                </div>

                <Button
                  type="submit"
                  className="group h-11 w-full bg-lapis text-blanc hover:bg-or"
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
              </form>

              <p className="mt-7 text-center text-sm text-white/45">
                Déjà un compte ?{" "}
                <Link href={loginHref} className="font-medium text-blanc underline-offset-4 hover:underline">
                  Se connecter
                </Link>
              </p>
            </motion.div>
          </div>
        </aside>
      </div>
    </div>
  );
}
