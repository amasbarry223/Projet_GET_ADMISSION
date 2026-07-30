"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { formatFCFA } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Upload, CheckCircle2, AlertCircle, X, ArrowLeft, ArrowRight, Save, Check, Lock, Plane, Loader2 } from "lucide-react";

const STEPS = [
  { n: 1, label: "Université & formation" },
  { n: 2, label: "Informations" },
  { n: 3, label: "Documents académiques" },
  { n: 4, label: "Pièces d'identité" },
  { n: 5, label: "Récapitulatif & soumission" },
];

type PieceState = "manquante" | "televersee" | "validee" | "a_corriger";

type Universite = {
  id: string;
  nom: string;
  ville: string;
  drapeau: string;
  pays: string;
  domaines: string[];
  formations: Formation[];
};

type Formation = {
  id: string;
  intitule: string;
  niveau: string;
  domaine: string;
  duree: string;
  fraisAgence: number;
  prerequis: string[] | string;
  piecesRequises: string[] | string;
};

type Dossier = {
  id: string;
  reference: string;
  etat: string;
  etapeActuelle: number;
  fraisAgence: number;
  mrz: string;
  candidat: { prenom: string; nom: string; email: string; nationalite: string; telephone: string };
  universite: { id: string; nom: string };
  formation: { id: string; intitule: string; niveau: string; fraisAgence: number };
  conseiller: { prenom: string; nom: string } | null;
  pieces: { id: string; libelle: string; statut: PieceState }[];
};

function parseStringList(value: string[] | string | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DossierPage() {
  const [loadingDossier, setLoadingDossier] = React.useState(true);
  const [universites, setUniversites] = React.useState<Universite[]>([]);
  const [universitesLoading, setUniversitesLoading] = React.useState(true);
  const [universitesError, setUniversitesError] = React.useState(false);
  const [existingDossier, setExistingDossier] = React.useState<Dossier | null>(null);

  const [step, setStep] = React.useState(1);
  const [univId, setUnivId] = React.useState("");
  const [formId, setFormId] = React.useState("");
  const [info, setInfo] = React.useState({ nom: "", prenom: "", naissance: "", nationalite: "", email: "", tel: "", adresse: "" });
  const [pieces, setPieces] = React.useState<Record<string, PieceState>>({});
  const [savedBadge, setSavedBadge] = React.useState(false);

  // Fetch universités (public, no auth needed) — pour les selectors step 1
  React.useEffect(() => {
    fetch("/api/universites")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Universite[]) => {
        setUniversites(data);
        setUniversitesLoading(false);
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setUniversitesError(true);
        setUniversitesLoading(false);
      });
  }, []);

  // Fetch le dossier existant du candidat — pour pré-remplir
  React.useEffect(() => {
    fetch("/api/dossiers")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Dossier[]) => {
        if (data[0]) {
          const d = data[0];
          setExistingDossier(d);
          setUnivId(d.universite.id);
          setFormId(d.formation.id);
          setInfo({
            nom: d.candidat.nom,
            prenom: d.candidat.prenom,
            naissance: "",
            nationalite: d.candidat.nationalite,
            email: d.candidat.email,
            tel: d.candidat.telephone,
            adresse: "",
          });
          const map: Record<string, PieceState> = {};
          d.pieces.forEach((p) => {
            const st = (["manquante", "televersee", "validee", "a_corriger"].includes(p.statut) ? p.statut : "manquante") as PieceState;
            map[p.libelle] = st;
          });
          setPieces(map);
        }
        setLoadingDossier(false);
      })
      .catch((e) => {
        console.error("fetch error:", e);
        setLoadingDossier(false);
      });
  }, []);

  // Sélection par défaut : première université + première formation
  React.useEffect(() => {
    if (!universitesLoading && universites.length > 0 && !univId) {
      const first = universites[0];
      setUnivId(first.id);
      if (first.formations[0]) {
        setFormId(first.formations[0].id);
      }
    }
  }, [universitesLoading, universites, univId]);

  const universite = universites.find((u) => u.id === univId);
  const formationsForUniv = universite?.formations ?? [];
  const formation = formationsForUniv.find((f) => f.id === formId);

  const prerequisList = parseStringList(formation?.prerequis);
  const piecesRequises = parseStringList(formation?.piecesRequises);

  // Mock "draft saved" indicator
  React.useEffect(() => {
    if (loadingDossier || universitesLoading) return;
    const t = setTimeout(() => {
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 2000);
    }, 800);
    return () => clearTimeout(t);
  }, [step, univId, formId, info, pieces, loadingDossier, universitesLoading]);

  const identityPieces = ["Passeport ou CNI (page photo)", "Photo d'identité récente"];
  const allPieces = [...piecesRequises, ...identityPieces];
  const missing = allPieces.filter((p) => !pieces[p] || pieces[p] === "manquante");
  const canSubmit = missing.length === 0 && step === 5;

  const togglePiece = (libelle: string) => {
    setPieces((prev) => {
      const cur = prev[libelle] ?? "manquante";
      const next: PieceState = cur === "manquante" ? "televersee" : cur === "televersee" ? "validee" : "manquante";
      return { ...prev, [libelle]: next };
    });
  };

  const submit = () => {
    if (!canSubmit) {
      toast.error("Dossier incomplet", { description: `${missing.length} pièce(s) obligatoire(s) manquante(s).` });
      return;
    }
    toast.success("Dossier soumis", { description: "Votre conseiller va prendre en charge votre dossier." });
    setStep(1);
  };

  if (loadingDossier || universitesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (universitesError) {
    return (
      <Alert className="border-ambre/40 bg-ambre/5">
        <AlertCircle className="h-4 w-4 text-ambre" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Catalogue indisponible</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">
          Impossible de charger les universités partenaires. Réessayez dans un instant.
        </AlertDescription>
      </Alert>
    );
  }

  // Helpers pour les champs récap — utilisent les données du dossier existant (DB)
  // ou des valeurs génériques pour un nouveau dossier en cours de constitution.
  const boardingReference = existingDossier?.reference ?? "Nouveau dossier";
  const boardingEtat = existingDossier?.etat ?? "brouillon";
  const boardingEtape = existingDossier?.etapeActuelle ?? 1;
  const boardingMrz = existingDossier?.mrz ?? "GETADM<<NOUVEAU DOSSIER<<<<<<<<<<<<<<\n2026<<EN COURS DE CONSTITUTION<<<<\nREFERENCE A GENERER<<<<<<<<<<<<<<";
  const boardingConseiller = existingDossier?.conseiller ? `${existingDossier.conseiller.prenom} ${existingDossier.conseiller.nom}` : "Non affecté";
  const boardingFrais = formation?.fraisAgence ?? existingDossier?.fraisAgence ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Formulaire de dossier</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-encre sm:text-3xl">Constituez votre dossier.</h1>
        </div>
        <div className="flex items-center gap-2">
          {savedBadge && (
            <Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">
              <Save className="mr-1 h-3 w-3" /> Brouillon enregistré
            </Badge>
          )}
          <Badge variant="outline" className="font-mono text-[10px] uppercase text-ardoise">Brouillon</Badge>
        </div>
      </div>

      {/* Stepper */}
      <nav aria-label="Étapes du dossier" className="overflow-x-auto scroll-fine">
        <ol className="flex min-w-max items-center gap-1 px-1">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <li key={s.n} className="flex items-center">
                <div className={cn("flex items-center gap-2 rounded-md px-3 py-2", active && "bg-lapis/8")}>
                  <span className={cn(
                    "flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 font-mono text-[11px] font-semibold",
                    done && "border-vert bg-vert text-blanc",
                    active && "border-lapis bg-lapis text-blanc",
                    !done && !active && "border-ligne text-ardoise"
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : String(s.n).padStart(2, "0")}
                  </span>
                  <span className={cn("text-xs font-medium", active ? "text-lapis" : done ? "text-encre" : "text-ardoise")}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-ligne sm:w-10" aria-hidden />}
              </li>
            );
          })}
        </ol>
      </nav>

      <Card className="border-ligne bg-blanc p-6 sm:p-8">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-encre">Université & formation</h2>
              <p className="text-sm text-ardoise">Choisissez votre destination et votre cursus.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Université partenaire</Label>
                <Select value={univId} onValueChange={(v) => {
                  setUnivId(v);
                  const u = universites.find((x) => x.id === v);
                  if (u?.formations[0]) setFormId(u.formations[0].id);
                }}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez une université" /></SelectTrigger>
                  <SelectContent>
                    {universites.map((u) => <SelectItem key={u.id} value={u.id}>{u.drapeau} {u.nom} — {u.ville}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Formation</Label>
                <Select value={formId} onValueChange={setFormId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez une formation" /></SelectTrigger>
                  <SelectContent>
                    {formationsForUniv.map((f) => <SelectItem key={f.id} value={f.id}>{f.intitule} ({f.niveau})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formation && (
              <div className="rounded-md border border-ligne bg-porcelaine p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Niveau" value={formation.niveau} />
                  <Field label="Domaine" value={formation.domaine} />
                  <Field label="Durée" value={formation.duree} />
                  <Field label="Frais d'agence" value={formatFCFA(formation.fraisAgence)} mono />
                </div>
                <div className="mt-3 border-t border-ligne pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Prérequis</p>
                  <p className="mt-1 text-sm text-encre">{prerequisList.length > 0 ? prerequisList.join(" · ") : "—"}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-encre">Informations personnelles</h2>
              <p className="text-sm text-ardoise">Vos coordonnées telles qu'elles figureront sur le dossier.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Prénom</Label>
                <Input value={info.prenom} onChange={(e) => setInfo({ ...info, prenom: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Nom</Label>
                <Input value={info.nom} onChange={(e) => setInfo({ ...info, nom: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Date de naissance</Label>
                <Input type="date" value={info.naissance} onChange={(e) => setInfo({ ...info, naissance: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Nationalité</Label>
                <Input value={info.nationalite} onChange={(e) => setInfo({ ...info, nationalite: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">E-mail</Label>
                <Input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-encre">Téléphone</Label>
                <Input value={info.tel} onChange={(e) => setInfo({ ...info, tel: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm font-medium text-encre">Adresse</Label>
                <Input value={info.adresse} onChange={(e) => setInfo({ ...info, adresse: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-encre">Documents académiques</h2>
              <p className="text-sm text-ardoise">Téléversez vos pièces au format PDF, JPG ou PNG (10 Mo max).</p>
            </div>
            <div className="space-y-3">
              {piecesRequises.length === 0 ? (
                <p className="rounded-md border border-ligne bg-porcelaine p-4 text-sm text-ardoise">
                  Sélectionnez d'abord une formation à l'étape 1 pour voir la liste des pièces requises.
                </p>
              ) : (
                piecesRequises.map((libelle) => (
                  <UploadZone key={libelle} libelle={libelle} state={pieces[libelle] ?? "manquante"} onToggle={() => togglePiece(libelle)} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-encre">Pièces d'identité</h2>
              <p className="text-sm text-ardoise">Passeport ou CNI, et photo d'identité.</p>
            </div>
            <div className="space-y-3">
              {identityPieces.map((libelle) => (
                <UploadZone key={libelle} libelle={libelle} state={pieces[libelle] ?? "manquante"} onToggle={() => togglePiece(libelle)} />
              ))}
            </div>
          </div>
        )}

        {/* Step 5 */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-encre">Récapitulatif & soumission</h2>
              <p className="text-sm text-ardoise">Vérifiez votre dossier avant de le transmettre.</p>
            </div>

            <BoardingPass
              variant="large"
              reference={boardingReference}
              universiteNom={universite?.nom ?? ""}
              formationLabel={`${formation?.niveau ?? ""} · ${formation?.intitule ?? ""}`}
              etat={boardingEtat}
              etapeActuelle={boardingEtape}
              etapeTotal={12}
              conseiller={boardingConseiller}
              fraisAgence={boardingFrais}
              mrz={boardingMrz}
            />

            <div className="rounded-md border border-ligne bg-porcelaine p-4">
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Informations</p>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <RecapLine label="Candidat" value={`${info.prenom} ${info.nom}`.trim()} />
                <RecapLine label="Nationalité" value={info.nationalite} />
                <RecapLine label="E-mail" value={info.email} />
                <RecapLine label="Téléphone" value={info.tel} />
                <RecapLine label="Université" value={universite?.nom ?? ""} />
                <RecapLine label="Formation" value={formation?.intitule ?? ""} />
              </div>
            </div>

            <div className="rounded-md border border-ligne bg-blanc p-4">
              <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Pièces ({allPieces.length - missing.length}/{allPieces.length})</p>
              <ul className="mt-2 space-y-1.5">
                {allPieces.map((p) => {
                  const st = pieces[p] ?? "manquante";
                  return (
                    <li key={p} className="flex items-center gap-2 text-sm">
                      {st === "manquante" ? <AlertCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} /> : st === "a_corriger" ? <AlertCircle className="h-4 w-4 text-ambre" strokeWidth={1.5} /> : <CheckCircle2 className="h-4 w-4 text-vert" strokeWidth={1.5} />}
                      <span className={cn(st === "manquante" ? "text-carmin" : "text-encre")}>{p}</span>
                      <span className="ml-auto font-mono text-[10px] uppercase text-ardoise">{st.replace("_", " ")}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {missing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-carmin/30 bg-carmin/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-carmin" strokeWidth={1.5} />
                <p className="text-sm text-carmin">
                  Votre dossier ne peut pas être soumis : {missing.length} pièce(s) obligatoire(s) manquante(s). Complétez-la(s) pour poursuivre.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-ligne pt-5">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ArrowLeft className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> Étape précédente
          </Button>
          {step < 5 ? (
            <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={() => setStep((s) => Math.min(5, s + 1))}>
              Étape suivante <ArrowRight className="ml-1.5 h-4 w-4" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button className="bg-lapis text-blanc hover:bg-lapis/90" onClick={submit} disabled={!canSubmit}>
              {canSubmit ? <><Plane className="mr-1.5 h-4 w-4 -rotate-12" /> Soumettre mon dossier</> : <><Lock className="mr-1.5 h-4 w-4" /> Dossier incomplet</>}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">{label}</p>
      <p className={cn("mt-0.5 text-sm text-encre", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function RecapLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-ligne/60 py-1 last:border-0">
      <span className="text-xs text-ardoise">{label}</span>
      <span className="text-right text-sm font-medium text-encre">{value}</span>
    </div>
  );
}

function UploadZone({ libelle, state, onToggle }: { libelle: string; state: PieceState; onToggle: () => void }) {
  const config = {
    manquante: { border: "border-ligne", icon: Upload, iconColor: "text-ardoise", label: "Glissez votre fichier ici ou cliquez pour parcourir", sub: "PDF, JPG, PNG · 10 Mo max", action: "Téléverser" },
    televersee: { border: "border-vert/40 bg-vert/5", icon: CheckCircle2, iconColor: "text-vert", label: "document.pdf · 1,2 Mo", sub: "Téléversé", action: "Marquer validé" },
    validee: { border: "border-vert/40 bg-vert/5", icon: CheckCircle2, iconColor: "text-vert", label: "document.pdf · 1,2 Mo", sub: "Validé", action: "Retirer" },
    a_corriger: { border: "border-ambre/40 bg-ambre/5", icon: AlertCircle, iconColor: "text-ambre", label: "document.pdf · 1,2 Mo", sub: "À corriger — format trop lourd", action: "Retéléverser" },
  }[state];

  return (
    <div className={cn("rounded-md border p-4", config.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 flex-none items-center justify-center rounded-md bg-blanc border border-ligne", config.iconColor)}>
          <config.icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-encre">{libelle}</p>
          <p className="truncate text-xs text-ardoise">{config.label}</p>
          <p className={cn("mt-0.5 font-mono text-[10px] uppercase", config.iconColor)}>{config.sub}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onToggle} className="flex-none">
          {state === "manquante" && <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />}
          {state === "televersee" && <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />}
          {state === "validee" && <X className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />}
          {state === "a_corriger" && <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />}
          {config.action}
        </Button>
      </div>
    </div>
  );
}
