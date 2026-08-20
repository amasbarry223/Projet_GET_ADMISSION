"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DOSSIER_LIVE_CHANNEL, type DossierLiveBroadcastPayload } from "@/lib/dossier/live-broadcast";
import { MESSAGES_LIVE_CHANNEL } from "@/lib/messages/live-broadcast";
import { useRealtimeBroadcast } from "@/hooks/use-realtime-broadcast";
import { MessageComposer } from "@/components/messages/message-composer";
import { MessageAttachment } from "@/components/messages/message-attachment";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BoardingPass } from "@/components/getadm/boarding-pass";
import { etatParCode, COULEUR_BADGE } from "@/lib/etats";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";
import { apiFetch, apiJson } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, Send, Wallet, Stamp, XCircle, History, MessageSquare, User, ShieldCheck, Eye, AlertTriangle, Info, Loader2, UserPlus, UserMinus, Printer, Download, FileImage, IdCard, Landmark, Trash2 } from "lucide-react";
import { ETAPE_PAR_ETAT } from "@/shared/constants";
import { isPiecePassportOrCni } from "@/lib/dossier/pieces-requises";

type Conseiller = { id: string; prenom: string; nom: string; role: string; actif: boolean };

type EtablissementPublic = {
  id: string;
  nom: string;
  ville: string;
  typeEtablissement?: string;
  formations: { id: string; intitule: string; niveau: string }[];
};

type PieceApi = {
  id: string;
  libelle: string;
  statut: string;
  type: string;
  taille: string | null;
  televerseeLe: string | null;
  code?: string | null;
  categorie?: string | null;
  obligatoire?: boolean;
};

type PaiementApi = {
  id: string;
  reference: string;
  date: string;
  montant: number;
  moyen: string;
  statut: string;
  tranche: string | null;
};

type HistoriqueApi = {
  id: string;
  date: string;
  etat: string;
  auteur: string;
  note: string;
};

type MessageApi = {
  id: string;
  texte: string;
  createdAt: string;
  auteurId: string;
  pieceJointeNom?: string | null;
  pieceJointeTaille?: string | null;
  pieceJointeChemin?: string | null;
};

type DemandeCorrectionApi = {
  id: string;
  motif: string;
  statut: "EN_ATTENTE" | "SOUMISE" | "VALIDEE" | "REMPLACEE";
  createdAt: string;
  soumiseLe: string | null;
  traiteeLe: string | null;
  conseiller: { prenom: string; nom: string };
};

const STATUT_DEMANDE_CORRECTION: Record<
  DemandeCorrectionApi["statut"],
  { label: string; color: string; bg: string }
> = {
  EN_ATTENTE: { label: "En attente du candidat", color: "text-ambre", bg: "bg-ambre/10" },
  SOUMISE: { label: "Resoumise — à vérifier", color: "text-lapis", bg: "bg-lapis/10" },
  VALIDEE: { label: "Validée", color: "text-vert", bg: "bg-vert/10" },
  REMPLACEE: { label: "Remplacée", color: "text-ardoise", bg: "bg-ardoise/10" },
};

type DossierDetail = {
  id: string;
  reference: string;
  candidatId: string;
  etat: string;
  etapeActuelle: number;
  fraisAgence: number;
  mrz: string;
  createdAt: string;
  updatedAt: string;
  candidat: {
    id: string;
    prenom: string;
    nom: string;
    email: string;
    nationalite: string;
    telephone: string | null;
    kycType: string | null;
    kycRectoPath: string | null;
    kycVersoPath: string | null;
    kycVerifie: boolean;
    profilAcademique?: {
      statutCandidat: string;
      aObtenuBac: boolean;
      niveauEtudesSuperieures: string;
      formationEnCours: boolean;
      redoublements?: unknown[];
      interruptions?: unknown[];
      diplomesObtenus?: string[];
    } | null;
  };
  procedure?: "PRIVEE" | "PUBLIQUE";
  universite: { id: string; nom: string; typeEtablissement?: string; estPlaceholder?: boolean };
  formation: { id: string; intitule: string; niveau: string; domaine: string };
  conseiller: { id: string; prenom: string; nom: string } | null;
  pieces: PieceApi[];
  paiements: PaiementApi[];
  historiques: HistoriqueApi[];
  conversation: { messages: MessageApi[]; nonLusConseiller?: number } | null;
  demandesCorrection: DemandeCorrectionApi[];
  attestation: { id: string; nomFichier: string | null; cheminFichier: string | null } | null;
};

type ActionDef = {
  label: string;
  icon: React.ElementType;
  tone: "primary" | "outline" | "danger";
  toastLabel: string;
  toastDesc: string;
  workflowAction?: string;
  confirm?: { title: string; desc: string };
  /** Ouvre le dialog de saisie du motif de correction au lieu d'une simple confirmation. */
  motifDialog?: boolean;
  /** Ouvre le dialog de téléversement du document d'attestation. */
  fileDialog?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export default function DossierDetailClient() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const canAssign = hasPermission(session?.user?.role, "dossiers.assign");
  const canTransmettre = hasPermission(session?.user?.role, "dossiers.transmettre");
  const [dossier, setDossier] = React.useState<DossierDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [conseillers, setConseillers] = React.useState<Conseiller[] | null>(null);
  const [selectedConseillerId, setSelectedConseillerId] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);
  const [unassigning, setUnassigning] = React.useState(false);

  const [etablissementOpen, setEtablissementOpen] = React.useState(false);
  const [etablissementsPublics, setEtablissementsPublics] = React.useState<EtablissementPublic[] | null>(null);
  const [selectedUniversitePubliqueId, setSelectedUniversitePubliqueId] = React.useState("");
  const [selectedFormationPubliqueId, setSelectedFormationPubliqueId] = React.useState("");
  const [assigningEtablissement, setAssigningEtablissement] = React.useState(false);

  const [correctionOpen, setCorrectionOpen] = React.useState(false);
  const [motif, setMotif] = React.useState("");
  const [submittingCorrection, setSubmittingCorrection] = React.useState(false);

  const [downloadingPieces, setDownloadingPieces] = React.useState(false);

  const [attestationOpen, setAttestationOpen] = React.useState(false);
  const [attestationFile, setAttestationFile] = React.useState<File | null>(null);
  const [uploadingAttestation, setUploadingAttestation] = React.useState(false);
  const adminChatScrollRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState<string>(
    tabParam === "messages" || tabParam === "pieces" || tabParam === "paiements" || tabParam === "historique"
      ? tabParam
      : "profil",
  );
  const canDeleteDossier = hasPermission(session?.user?.role, "dossiers.write");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const confirmDeleteDossier = async () => {
    if (!dossier) return;
    setDeleting(true);
    const result = await apiJson(`/api/dossiers/${dossier.id}`, "DELETE");
    setDeleting(false);
    if (!result.ok) {
      toast.error("Suppression impossible", { description: result.error });
      return;
    }
    toast.success("Dossier supprimé", { description: `${dossier.reference} a été définitivement supprimé.` });
    router.push("/admin/dossiers");
  };

  const loadDossier = React.useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const result = await apiFetch<DossierDetail>(`/api/dossiers/${params.id}`);
      if (!result.ok) {
        setError(result.error);
        if (!opts?.silent) setLoading(false);
        return;
      }
      setDossier(result.data);
      setError(null);
      if (!opts?.silent) setLoading(false);
    },
    [params.id],
  );

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void loadDossier();
    });
    return () => {
      cancelled = true;
    };
  }, [loadDossier]);

  // Un autre membre du staff peut prendre en charge ce même dossier pendant que cette page est
  // ouverte (ex. « Prendre en charge » cliqué ailleurs) — on s'abonne au même canal temps réel que
  // l'espace candidat (broadcastDossierLive, déjà déclenché à chaque transition de workflow) pour
  // que le statut affiché ne reste pas figé tant que la page n'est pas rechargée manuellement.
  React.useEffect(() => {
    let cancelled = false;
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      try {
        supabase = createSupabaseBrowserClient();
        channel = supabase
          .channel(DOSSIER_LIVE_CHANNEL)
          .on("broadcast", { event: "dossier_updated" }, (msg) => {
            const payload = (msg as { payload?: DossierLiveBroadcastPayload }).payload;
            if (cancelled || !payload || payload.dossierId !== params.id) return;
            void loadDossier({ silent: true });
          })
          .subscribe();
      } catch {
        // abonnement temps réel optionnel — la page reste fonctionnelle sans lui
      }
    })();

    return () => {
      cancelled = true;
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [params.id, loadDossier]);

  useRealtimeBroadcast(MESSAGES_LIVE_CHANNEL, "message_created", () => {
    void loadDossier({ silent: true });
  });

  React.useEffect(() => {
    if (dossier?.conversation?.messages?.length) {
      adminChatScrollRef.current?.scrollTo({ top: adminChatScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [dossier?.conversation?.messages?.length]);

  // Polling silencieux (10s) en complément du broadcast Supabase — garantit l'actualisation
  // automatique sur desktop même si le websocket est inactif ou que le broadcast n'est pas reçu.
  React.useEffect(() => {
    const interval = setInterval(() => {
      void loadDossier({ silent: true });
    }, 10_000);
    return () => clearInterval(interval);
  }, [loadDossier]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-lapis" />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <Alert className="border-carmin/40 bg-carmin/5">
        <AlertTriangle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
        <AlertTitle className="font-display text-sm font-bold text-encre">Erreur de chargement</AlertTitle>
        <AlertDescription className="text-sm text-ardoise">{error ?? "Dossier indisponible."}</AlertDescription>
      </Alert>
    );
  }

  const e = etatParCode(dossier.etat);
  const c = COULEUR_BADGE[e.couleur];
  const form = dossier.formation;
  const univ = dossier.universite;
  const candidatNomComplet = `${dossier.candidat.prenom} ${dossier.candidat.nom}`;
  const conseillerNomComplet = dossier.conseiller ? `${dossier.conseiller.prenom} ${dossier.conseiller.nom}` : "Non affecté";
  const etatLower = dossier.etat.toLowerCase();
  const kycNeedsVerso = dossier.candidat.kycType === "cni" || !dossier.candidat.kycType;
  const kycHasRecto = !!dossier.candidat.kycRectoPath;
  const kycHasVerso = !!dossier.candidat.kycVersoPath;
  const kycComplete = kycHasRecto && (!kycNeedsVerso || kycHasVerso);

  const latestDemandeCorrection = dossier.demandesCorrection[0] ?? null;

  const userRole = session?.user?.role;
  const isConseiller = userRole === "CONSEILLER";
  const isAssignedConseiller = isConseiller && dossier.conseiller?.id === session?.user?.id;
  const dossierAccepteParConseiller = !!dossier.conseiller && etatLower !== "soumis" && etatLower !== "brouillon";
  // Après acceptation par le conseiller (état au-delà de SOUMIS), l'Admin/SuperAdmin ne peut plus valider ni demander de corrections. Seul le conseiller affecté le peut.
  const canValidateOrCorrect = isConseiller ? isAssignedConseiller : !dossierAccepteParConseiller;

  const actions: ActionDef[] = [];
  if (etatLower === "soumis") {
    if (!isConseiller || isAssignedConseiller) {
      actions.push({ label: "Prendre en charge", icon: ShieldCheck, tone: "primary", toastLabel: "Vérification démarrée", toastDesc: "Dossier passé en « En vérification ».", workflowAction: "demarrer_verification" });
      actions.push({ label: "Demander correction", icon: AlertCircle, tone: "outline", toastLabel: "Correction demandée", toastDesc: "Le candidat, l'admin et le super admin ont été notifiés.", workflowAction: "correction", motifDialog: true });
    }
  }
  if (etatLower === "verification" && canValidateOrCorrect) {
    actions.push({ label: "Valider le dossier", icon: ShieldCheck, tone: "primary", toastLabel: "Dossier validé", toastDesc: "Transition vers « Paiement en attente ».", workflowAction: "valider_dossier" });
    actions.push({ label: "Demander correction", icon: AlertCircle, tone: "outline", toastLabel: "Correction demandée", toastDesc: "Le candidat, l'admin et le super admin ont été notifiés.", workflowAction: "correction", motifDialog: true });
  }
  if (etatLower === "correction" && canValidateOrCorrect) {
    const dejaResoumis = latestDemandeCorrection?.statut === "SOUMISE";
    actions.push({
      label: "Vérifier les corrections",
      icon: ShieldCheck,
      tone: "primary",
      toastLabel: "Corrections vérifiées",
      toastDesc: "Le dossier reprend son parcours.",
      workflowAction: "verifier_corrections",
      disabled: !dejaResoumis,
      disabledReason: "En attente de la resoumission du candidat",
    });
  }
  if (etatLower === "paiement_confirme" && canTransmettre) {
    const etablissementNonAffecte = dossier.procedure === "PUBLIQUE" && !!dossier.universite.estPlaceholder;
    actions.push({
      label: "Transmettre à l'université",
      icon: Send,
      tone: "primary",
      toastLabel: "Dossier transmis",
      toastDesc: etablissementNonAffecte
        ? "Dossier transmis. Passage en attente de réponse."
        : `${univ?.nom} a été notifié. Passage en attente de réponse.`,
      workflowAction: "transmettre",
      confirm: {
        title: "Transmettre le dossier ?",
        desc: etablissementNonAffecte
          ? "Le dossier sera transmis. Cette action est irréversible."
          : `Le dossier sera envoyé à ${univ?.nom}. Cette action est irréversible.`,
      },
    });
  }
  if (etatLower === "transmis") {
    actions.push({ label: "Passer en attente de réponse", icon: Send, tone: "primary", toastLabel: "En attente", toastDesc: "L'université examine le dossier.", workflowAction: "attendre_reponse" });
    actions.push({ label: "Marquer accepté", icon: CheckCircle2, tone: "outline", toastLabel: "Pré-admission accordée", toastDesc: "Attestation à émettre sous 48h.", workflowAction: "accepter", confirm: { title: "Marquer la candidature acceptée ?", desc: `L'université ${univ?.nom} a accordé la pré-admission.` } });
    actions.push({ label: "Marquer refusé", icon: XCircle, tone: "danger", toastLabel: "Candidature refusée", toastDesc: "Le candidat a été informé.", workflowAction: "refuser", confirm: { title: "Marquer la candidature refusée ?", desc: `Cette action notifiera ${dossier.candidat.prenom} du refus.` } });
  }
  if (etatLower === "attente_reponse") {
    actions.push({ label: "Marquer accepté", icon: CheckCircle2, tone: "primary", toastLabel: "Pré-admission accordée", toastDesc: "Attestation à émettre sous 48h.", workflowAction: "accepter", confirm: { title: "Marquer la candidature acceptée ?", desc: `L'université ${univ?.nom} a accordé la pré-admission. L'attestation pourra ensuite être émise.` } });
    actions.push({ label: "Marquer refusé", icon: XCircle, tone: "danger", toastLabel: "Candidature refusée", toastDesc: "Le candidat a été informé.", workflowAction: "refuser", confirm: { title: "Marquer la candidature refusée ?", desc: `Cette action notifiera ${dossier.candidat.prenom} du refus de ${univ?.nom}.` } });
  }
  if (etatLower === "pre_admission") {
    actions.push({ label: "Téléverser l'attestation", icon: Stamp, tone: "primary", toastLabel: "Attestation émise", toastDesc: "Le candidat a été félicité et notifié.", fileDialog: true });
  }
  if (etatLower === "attestation") {
    actions.push({ label: "Remplacer le document", icon: Stamp, tone: "outline", toastLabel: "Document remplacé", toastDesc: "Le nouveau document est disponible côté candidat.", fileDialog: true });
  }
  if (etatLower === "attestation" || etatLower === "refuse") {
    actions.push({ label: "Clôturer le dossier", icon: CheckCircle2, tone: "outline", toastLabel: "Dossier clôturé", toastDesc: "Archivage effectué.", workflowAction: "cloturer", confirm: { title: "Clôturer le dossier ?", desc: "Le dossier sera archivé et ne pourra plus être modifié." } });
  }

  const execAction = (a: ActionDef) => async () => {
    if (!a.workflowAction) {
      toast.success(a.toastLabel, { description: a.toastDesc });
      return;
    }
    const result = await apiJson(`/api/dossiers/${dossier.id}/workflow`, "POST", {
      action: a.workflowAction,
    });
    if (!result.ok) {
      toast.error("Action échouée", { description: result.error });
      return;
    }
    toast.success(a.toastLabel, { description: a.toastDesc });
    void loadDossier();
  };

  const openCorrectionDialog = () => {
    setMotif("");
    setCorrectionOpen(true);
  };

  const confirmCorrection = async () => {
    const trimmed = motif.trim();
    if (!trimmed) return;
    setSubmittingCorrection(true);
    const result = await apiJson(`/api/dossiers/${dossier.id}/workflow`, "POST", {
      action: "correction",
      note: trimmed,
    });
    setSubmittingCorrection(false);
    if (!result.ok) {
      toast.error("Demande de correction échouée", { description: result.error });
      return;
    }
    setCorrectionOpen(false);
    toast.success("Correction demandée", {
      description: "Le candidat, l'admin et le super admin ont été notifiés.",
    });
    void loadDossier();
  };

  const openAttestationDialog = () => {
    setAttestationFile(null);
    setAttestationOpen(true);
  };

  const confirmAttestationUpload = async () => {
    if (!attestationFile) return;
    setUploadingAttestation(true);
    const fd = new FormData();
    fd.append("file", attestationFile);
    const res = await fetch(`/api/dossiers/${dossier.id}/attestation/upload`, {
      method: "POST",
      body: fd,
    });
    const body = await res.json().catch(() => ({}));
    setUploadingAttestation(false);
    if (!res.ok) {
      toast.error("Téléversement échoué", { description: (body as { error?: string })?.error });
      return;
    }
    setAttestationOpen(false);
    toast.success(
      etatLower === "pre_admission" ? "Attestation émise" : "Document remplacé",
      {
        description:
          etatLower === "pre_admission"
            ? "Le candidat a été félicité et notifié."
            : "Le nouveau document est disponible côté candidat.",
      },
    );
    void loadDossier();
  };

  const assignDisabled = etatLower === "brouillon";
  // Une fois le dossier pris en charge (état au-delà de SOUMIS), affecter/réaffecter/désaffecter
  // disparaissent — seule la consultation du dossier reste possible.
  const showAssignActions = canAssign && (etatLower === "soumis" || etatLower === "brouillon");

  const canAssignEtablissement = hasPermission(session?.user?.role, "etablissement.assign");
  const etapeActuelleDossier = ETAPE_PAR_ETAT[dossier.etat as keyof typeof ETAPE_PAR_ETAT];
  const etablissementAssignable =
    etapeActuelleDossier >= ETAPE_PAR_ETAT.VERIFICATION && etapeActuelleDossier <= ETAPE_PAR_ETAT.PAIEMENT_CONFIRME;
  const etablissementNonAffecte = !!dossier.universite.estPlaceholder;
  const isAssignedToConseiller = Boolean(dossier.conseiller);
  const isCurrentConseiller = isAssignedToConseiller && session?.user?.id === dossier.conseiller?.id;
  const isRestrictedForConseiller = isConseiller && isAssignedToConseiller && !isCurrentConseiller;

  const openAssignDialog = () => {
    setSelectedConseillerId("");
    setAssignOpen(true);
    setConseillers((prev) => {
      if (prev) return prev;
      void apiFetch<Conseiller[]>("/api/admin/users").then((result) => {
        if (!result.ok) {
          toast.error("Impossible de charger les conseillers", { description: result.error });
          setConseillers([]);
          return;
        }
        setConseillers(result.data.filter((u) => u.role === "CONSEILLER" && u.actif));
      });
      return prev;
    });
  };

  const confirmAssign = async () => {
    const cons = conseillers?.find((c) => c.id === selectedConseillerId);
    if (!cons) return;
    setAssigning(true);
    const result = await apiJson(`/api/dossiers/${dossier.id}`, "PUT", { conseillerId: cons.id });
    setAssigning(false);
    if (!result.ok) {
      toast.error("Affectation échouée", { description: result.error });
      return;
    }
    setAssignOpen(false);
    toast.success("Conseiller affecté", { description: `${cons.prenom} ${cons.nom} → ${dossier.reference}` });
    void loadDossier();
  };

  const confirmUnassign = async () => {
    setUnassigning(true);
    const result = await apiJson(`/api/dossiers/${dossier.id}`, "PUT", { conseillerId: null });
    setUnassigning(false);
    if (!result.ok) {
      toast.error("Désaffectation impossible", { description: result.error });
      return;
    }
    toast.success("Conseiller désaffecté", { description: `${dossier.reference} n'a plus de conseiller affecté.` });
    void loadDossier();
  };

  const openEtablissementDialog = () => {
    setSelectedUniversitePubliqueId("");
    setSelectedFormationPubliqueId("");
    setEtablissementOpen(true);
    setEtablissementsPublics((prev) => {
      if (prev) return prev;
      void apiFetch<EtablissementPublic[]>("/api/universites").then((result) => {
        if (!result.ok) {
          toast.error("Impossible de charger les établissements publics", { description: result.error });
          setEtablissementsPublics([]);
          return;
        }
        setEtablissementsPublics(result.data.filter((u) => u.typeEtablissement === "PUBLIC"));
      });
      return prev;
    });
  };

  const confirmAssignEtablissement = async () => {
    if (!selectedFormationPubliqueId) return;
    setAssigningEtablissement(true);
    const result = await apiJson(`/api/dossiers/${dossier.id}`, "PUT", { formationId: selectedFormationPubliqueId });
    setAssigningEtablissement(false);
    if (!result.ok) {
      toast.error("Affectation échouée", { description: result.error });
      return;
    }
    setEtablissementOpen(false);
    const univ = etablissementsPublics?.find((u) => u.id === selectedUniversitePubliqueId);
    toast.success("Établissement affecté", { description: univ ? `${univ.nom} → ${dossier.reference}` : dossier.reference });
    void loadDossier();
  };

  const downloadAllPieces = async () => {
    setDownloadingPieces(true);
    try {
      const res = await fetch(`/api/dossiers/${dossier.id}/pieces/export`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error("Téléchargement impossible", {
          description: (body as { error?: string })?.error ?? "Le PDF n'a pas pu être généré.",
        });
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] ? decodeURIComponent(match[1]) : `Dossier_${dossier.reference}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Téléchargement impossible", { description: "Erreur réseau — réessayez." });
    } finally {
      setDownloadingPieces(false);
    }
  };

  const messages = dossier.conversation?.messages ?? [];

  const handleTabChange = (value: string) => {
    if (value === "messages" && (dossier.conversation?.nonLusConseiller ?? 0) > 0) {
      setDossier((prev) =>
        prev?.conversation ? { ...prev, conversation: { ...prev.conversation, nonLusConseiller: 0 } } : prev,
      );
      void apiJson(`/api/messages/read`, "PUT", { dossierId: dossier.id });
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/admin/dossiers" className="flex items-center gap-1 text-ardoise hover:text-or">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Dossiers
          </Link>
          <span className="text-ardoise/50">/</span>
          <span className="font-mono text-encre">{dossier.reference}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/dossiers/${dossier.id}/print`, "_blank")}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Imprimer la fiche
          </Button>
          {canDeleteDossier && (
            <Button
              variant="outline"
              size="sm"
              className="border-carmin/30 text-carmin hover:bg-carmin/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Supprimer le dossier
            </Button>
          )}
        </div>
      </div>

      {/* Boarding pass */}
      <BoardingPass
        variant="large"
        reference={dossier.reference}
        universiteNom={univ?.nom ?? ""}
        formationLabel={`${form?.niveau ?? ""} · ${form?.intitule ?? ""}`}
        etat={dossier.etat}
        etapeActuelle={dossier.etapeActuelle}
        etapeTotal={12}
        conseiller={conseillerNomComplet}
        fraisAgence={dossier.fraisAgence}
        mrz={dossier.mrz}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Main: tabs */}
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); handleTabChange(val); }}>
          <TabsList className="bg-porcelaine">
            <TabsTrigger value="profil"><User className="mr-1.5 h-3.5 w-3.5" /> Profil candidat</TabsTrigger>
            <TabsTrigger value="pieces"><FileText className="mr-1.5 h-3.5 w-3.5" /> Pièces</TabsTrigger>
            <TabsTrigger value="paiements"><Wallet className="mr-1.5 h-3.5 w-3.5" /> Paiements</TabsTrigger>
            <TabsTrigger value="historique"><History className="mr-1.5 h-3.5 w-3.5" /> Historique</TabsTrigger>
            <TabsTrigger value="messages"><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="profil">
            <Card className="border-ligne bg-card p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border border-ligne">
                  <AvatarFallback className="bg-lapis/10 font-mono text-base font-bold text-lapis">{dossier.candidat.nom.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-display text-lg font-bold text-encre">{candidatNomComplet}</h2>
                  <p className="text-sm text-ardoise">Nationalité : {dossier.candidat.nationalite || "—"}</p>
                </div>
              </div>
              <Separator className="my-4 bg-ligne" />
              <dl className="grid gap-3 sm:grid-cols-2">
                <Field label="E-mail" value={dossier.candidat.email || "—"} />
                <Field label="Téléphone" value={dossier.candidat.telephone || "—"} />
                <Field label="Université" value={univ?.nom ?? ""} />
                <Field label="Formation" value={form?.intitule ?? ""} />
                <Field label="Niveau" value={form?.niveau ?? ""} />
                <Field label="Domaine" value={form?.domaine ?? ""} />
                <Field
                  label="Type établissement"
                  value={univ?.typeEtablissement === "PUBLIC" ? "Public" : "Privé"}
                />
                <Field label="Frais d'agence" value={formatFCFA(dossier.fraisAgence)} mono />
                <Field label="Date de création" value={formatDate(dossier.createdAt)} />
              </dl>
              {dossier.candidat.profilAcademique && (
                <div className="mt-4 rounded-md border border-ligne bg-porcelaine p-3">
                  <p className="font-mono text-[10px] uppercase text-ardoise">Profil académique</p>
                  <p className="mt-1 text-sm text-encre">
                    {dossier.candidat.profilAcademique.statutCandidat === "LYCEEN" ? "Lycéen" : "Bachelier"}
                    {dossier.candidat.profilAcademique.statutCandidat === "BACHELIER"
                      ? ` · ${dossier.candidat.profilAcademique.niveauEtudesSuperieures}`
                      : dossier.candidat.profilAcademique.aObtenuBac
                        ? " · Bac obtenu"
                        : " · Bac non obtenu"}
                    {dossier.candidat.profilAcademique.formationEnCours ? " · Formation en cours" : ""}
                  </p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(() => {
                  const isAssigned = Boolean(dossier.conseiller);
                  const isCurrentConseiller = isAssigned && session?.user?.id === dossier.conseiller?.id;
                  const isRestrictedForKyc = isAssigned && !isCurrentConseiller;

                  return (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isRestrictedForKyc || !kycComplete || dossier.candidat.kycVerifie}
                        title={
                          isRestrictedForKyc
                            ? `Ce dossier est affecté au conseiller ${conseillerNomComplet}. Seul ce conseiller a la main pour valider la pièce KYC.`
                            : dossier.candidat.kycVerifie
                              ? "Le KYC de ce candidat est déjà vérifié."
                              : !kycComplete
                                ? `En attente du recto${kycNeedsVerso ? " et du verso" : ""}.`
                                : undefined
                        }
                        onClick={async () => {
                          if (isRestrictedForKyc) return;
                          const result = await apiJson("/api/profile/kyc", "PUT", {
                            userId: dossier.candidat.id,
                            verifie: true,
                          });
                          if (!result.ok) {
                            toast.error("Validation KYC échouée", { description: result.error });
                            return;
                          }
                          toast.success("KYC vérifié");
                          void loadDossier();
                        }}
                      >
                        <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        {dossier.candidat.kycVerifie ? "KYC vérifié" : "Valider le KYC"}
                      </Button>
                      {kycHasRecto && (
                        isRestrictedForKyc ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title={`Consultation de la pièce d'identité réservée au conseiller affecté (${conseillerNomComplet}).`}
                          >
                            <FileImage className="mr-1.5 h-3.5 w-3.5" /> Voir recto
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/api/profile/kyc?side=recto&userId=${dossier.candidat.id}`} target="_blank" rel="noreferrer">
                              <FileImage className="mr-1.5 h-3.5 w-3.5" /> Voir recto
                            </a>
                          </Button>
                        )
                      )}
                      {kycHasVerso && (
                        isRestrictedForKyc ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            title={`Consultation de la pièce d'identité réservée au conseiller affecté (${conseillerNomComplet}).`}
                          >
                            <FileImage className="mr-1.5 h-3.5 w-3.5" /> Voir verso
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/api/profile/kyc?side=verso&userId=${dossier.candidat.id}`} target="_blank" rel="noreferrer">
                              <FileImage className="mr-1.5 h-3.5 w-3.5" /> Voir verso
                            </a>
                          </Button>
                        )
                      )}
                    </>
                  );
                })()}
                {!kycHasRecto && !kycHasVerso && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-ligne px-2.5 py-1.5 text-xs text-ardoise">
                    <IdCard className="h-3.5 w-3.5" strokeWidth={1.5} /> Aucune pièce d&apos;identité téléversée
                  </span>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pieces">
            <Card className="border-ligne bg-card p-0 overflow-hidden">
              {(() => {
                const nonKycPieces = dossier.pieces.filter((p) => !isPiecePassportOrCni(p));
                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ligne px-6 py-4">
                      <div>
                        <h2 className="font-display text-base font-bold text-encre">Pièces du dossier</h2>
                        <p className="mt-0.5 text-xs text-ardoise">{nonKycPieces.length} document(s)</p>
                      </div>
                      {nonKycPieces.some((p) => (p as { cheminFichier?: string }).cheminFichier) && (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={`/api/dossiers/${dossier.id}/pieces/export/print`} target="_blank" rel="noreferrer">
                              <Printer className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Imprimer tout
                            </a>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={downloadingPieces}
                            onClick={() => void downloadAllPieces()}
                          >
                            {downloadingPieces ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                            )}
                            Télécharger tout (PDF)
                          </Button>
                        </div>
                      )}
                    </div>
                    {nonKycPieces.length === 0 ? (
                      <p className="px-6 py-10 text-center text-sm text-ardoise">Aucune pièce enregistrée.</p>
                    ) : (
                      <ul className="divide-y divide-ligne">
                        {nonKycPieces.map((p) => {
                          const cfg = {
                            manquante: { icon: AlertCircle, color: "text-carmin", bg: "bg-carmin/5", label: "Manquante" },
                            televersee: { icon: FileText, color: "text-lapis", bg: "bg-lapis/5", label: "Téléversée" },
                            a_corriger: { icon: AlertCircle, color: "text-ambre", bg: "bg-ambre/5", label: "À corriger" },
                            validee: { icon: CheckCircle2, color: "text-vert", bg: "bg-vert/5", label: "Validée" },
                          }[p.statut] ?? { icon: FileText, color: "text-ardoise", bg: "bg-porcelaine", label: p.statut };
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-6 py-3">
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md", cfg.bg, cfg.color)}>
                          <cfg.icon className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-encre">
                            {p.libelle}
                            {p.obligatoire === false ? (
                              <span className="ml-2 font-mono text-[10px] uppercase text-ardoise">(optionnel)</span>
                            ) : null}
                          </p>
                          <p className="font-mono text-[11px] text-ardoise">
                            {p.categorie ?? "academique"}
                            {p.taille ? ` · ${p.taille}` : ""}
                            {p.televerseeLe ? ` · ${formatDate(p.televerseeLe)}` : ""}
                          </p>
                        </div>
                        <Badge className={cn("font-mono text-[10px] uppercase", cfg.color, "border-current")}>{cfg.label}</Badge>
                        {(() => {
                          const hasFile = !!(p as { cheminFichier?: string }).cheminFichier;
                          return (
                            <div className="flex items-center">
                              <Button variant="ghost" size="icon" aria-label="Voir la pièce" disabled={!hasFile} asChild={hasFile}>
                                {hasFile ? (
                                  <a href={`/api/dossiers/${dossier.id}/pieces/${p.id}/download?disposition=inline`} target="_blank" rel="noreferrer">
                                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                                  </a>
                                ) : (
                                  <Eye className="h-4 w-4 opacity-40" strokeWidth={1.5} />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="Imprimer la pièce" disabled={!hasFile} asChild={hasFile}>
                                {hasFile ? (
                                  <a href={`/api/dossiers/${dossier.id}/pieces/${p.id}/print`} target="_blank" rel="noreferrer">
                                    <Printer className="h-4 w-4" strokeWidth={1.5} />
                                  </a>
                                ) : (
                                  <Printer className="h-4 w-4 opacity-40" strokeWidth={1.5} />
                                )}
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="Télécharger la pièce" disabled={!hasFile} asChild={hasFile}>
                                {hasFile ? (
                                  <a href={`/api/dossiers/${dossier.id}/pieces/${p.id}/download`}>
                                    <Download className="h-4 w-4" strokeWidth={1.5} />
                                  </a>
                                ) : (
                                  <Download className="h-4 w-4 opacity-40" strokeWidth={1.5} />
                                )}
                              </Button>
                            </div>
                          );
                        })()}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          );
        })()}
      </Card>
    </TabsContent>

          <TabsContent value="paiements">
            <Card className="border-ligne bg-card p-0 overflow-hidden">
              <div className="border-b border-ligne px-6 py-4">
                <h2 className="font-display text-base font-bold text-encre">Transactions</h2>
                <p className="mt-0.5 text-xs text-ardoise">{dossier.paiements.length} paiement(s)</p>
              </div>
              {dossier.paiements.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-ardoise">Aucun paiement enregistré pour ce dossier.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-mono text-[10px] uppercase text-ardoise">Référence</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase text-ardoise">Date</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase text-ardoise">Moyen</TableHead>
                      <TableHead className="text-right font-mono text-[10px] uppercase text-ardoise">Montant</TableHead>
                      <TableHead className="font-mono text-[10px] uppercase text-ardoise">Statut</TableHead>
                      <TableHead className="text-right font-mono text-[10px] uppercase text-ardoise">Reçu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossier.paiements.map((p) => {
                      const isReussi = p.statut === "reussi" || p.statut === "réussi";
                      return (
                      <TableRow key={p.id} className="border-ligne">
                        <TableCell className="font-mono text-xs text-encre">{p.reference}</TableCell>
                        <TableCell className="text-sm text-encre">{formatDate(p.date)}</TableCell>
                        <TableCell className="text-sm text-encre">{p.moyen}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-encre">{formatFCFA(p.montant)}</TableCell>
                        <TableCell><Badge className="bg-vert/10 font-mono text-[10px] uppercase text-vert">{p.statut}</Badge></TableCell>
                        <TableCell className="text-right">
                          {isReussi ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" aria-label="Voir le reçu" asChild>
                                <a href={`/api/recu/${p.id}`} target="_blank" rel="noreferrer">
                                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                                </a>
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="Télécharger le reçu (PDF)" asChild>
                                <a href={`/api/recu/${p.id}?format=pdf`} target="_blank" rel="noreferrer">
                                  <Download className="h-4 w-4" strokeWidth={1.5} />
                                </a>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-ardoise">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="historique">
            <Card className="border-ligne bg-card p-6">
              <h2 className="font-display text-base font-bold text-encre">Historique du dossier</h2>
              <ol className="mt-4 space-y-3">
                {dossier.historiques.slice().reverse().map((h) => {
                  const he = etatParCode(h.etat);
                  const hc = COULEUR_BADGE[he.couleur];
                  return (
                    <li key={h.id} className="flex gap-3">
                      <div className={cn("flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-mono font-semibold", hc.bg, hc.text)}>{he.ordre}</div>
                      <div className="flex-1 border-b border-ligne pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-encre">{he.libelle}</p>
                          <span className="font-mono text-[10px] text-ardoise">{formatDateTime(h.date)}</span>
                          <span className="text-xs text-ardoise">· {h.auteur}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-ardoise">{h.note}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="overflow-hidden border-ligne bg-card p-0 shadow-xs">
              <div className="border-b border-ligne px-6 py-4 bg-card">
                <h2 className="font-display text-base font-bold text-encre">Conversation avec {dossier.candidat.prenom}</h2>
              </div>
              {isRestrictedForConseiller ? (
                <div className="px-6 py-12 text-center space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-lapis/10 text-lapis">
                    <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <p className="font-medium text-encre text-sm">Échanges confidentiels</p>
                  <p className="mx-auto max-w-md text-xs text-ardoise">
                    Ce dossier est pris en charge par le conseiller <span className="font-semibold text-encre">{conseillerNomComplet}</span>. Les échanges de messages sont strictement privés et réservés au candidat et à son conseiller affecté.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-ardoise">Aucun message échangé pour le moment.</p>
              ) : (
                <div ref={adminChatScrollRef} className="h-[440px] max-h-[500px] space-y-3 overflow-y-auto chat-scroll bg-porcelaine/40 px-6 py-4">
                  {messages.map((m) => {
                    const isStaffMsg = m.auteurId !== dossier.candidat.id;
                    return (
                      <div key={m.id} className={cn("flex", isStaffMsg ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm shadow-xs", isStaffMsg ? "bg-lapis text-blanc" : "border border-ligne bg-card text-encre")}>
                          {m.pieceJointeNom && (
                            <MessageAttachment
                              nom={m.pieceJointeNom}
                              taille={m.pieceJointeTaille}
                              downloadUrl={`/api/messages/${m.id}/download`}
                              mine={isStaffMsg}
                            />
                          )}
                          {m.texte && <p className="leading-relaxed">{m.texte}</p>}
                          <p className={cn("mt-1 font-mono text-[10px]", isStaffMsg ? "text-blanc/60" : "text-ardoise")}>{formatDateTime(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isRestrictedForConseiller && (
                <div className="border-t border-ligne bg-card">
                  <MessageComposer
                    onSend={async (texte, fichier) => {
                      const form = new FormData();
                      form.set("dossierId", dossier.id);
                      form.set("texte", texte);
                      if (fichier) form.set("fichier", fichier);
                      const result = await apiFetch("/api/messages", { method: "POST", body: form });
                      if (!result.ok) {
                        toast.error("Envoi échoué", { description: result.error });
                        return;
                      }
                      toast.success("Message envoyé");
                      void loadDossier({ silent: true });
                    }}
                    placeholder="Écrire au candidat…"
                  />
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sidebar: workflow + statut */}
        <div className="space-y-4">
          <Card className="border-ligne bg-card p-5">
            <p className="text-xs font-medium text-ardoise">Statut courant</p>
            <Badge className={cn("mt-2 font-mono text-[10px] uppercase", c.text, c.border, c.bg)}>{e.libelle}</Badge>
            <p className="mt-2 text-xs text-ardoise">{e.description}</p>
            <div className="mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-ardoise">Progression</span>
                <span className="font-mono text-encre">{dossier.etapeActuelle}/12</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ligne">
                <div className="h-full bg-lapis" style={{ width: `${(dossier.etapeActuelle / 12) * 100}%` }} />
              </div>
            </div>
          </Card>

          <Card className="border-ligne bg-card p-5">
            <p className="text-xs font-medium text-ardoise">Conseiller affecté</p>
            <div className="mt-2 flex items-center gap-2.5">
              <Avatar className="h-8 w-8"><AvatarFallback className="bg-lapis/10 font-mono text-[10px] font-semibold text-lapis">{conseillerNomComplet.split(" ").map((w) => w[0]).join("").slice(0, 2)}</AvatarFallback></Avatar>
              <div>
                <p className="text-sm font-medium text-encre">{conseillerNomComplet}</p>
                <p className="text-xs text-ardoise">Conseiller(ère)</p>
              </div>
            </div>
            {showAssignActions && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={assignDisabled}
                title={assignDisabled ? "Le dossier doit être soumis avant d'être affecté à un conseiller." : undefined}
                onClick={openAssignDialog}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                {dossier.conseiller ? "Réaffecter" : "Affecter un conseiller"}
              </Button>
              {dossier.conseiller && etatLower === "soumis" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-carmin/40 text-carmin hover:bg-carmin/5">
                      <UserMinus className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} /> Désaffecter
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-carmin" strokeWidth={1.5} /> Désaffecter le conseiller ?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-sm text-ardoise">
                        {conseillerNomComplet} ne sera plus responsable du dossier {dossier.reference}.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-carmin text-blanc hover:bg-carmin/90"
                        disabled={unassigning}
                        onClick={() => void confirmUnassign()}
                      >
                        {unassigning && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
                        Désaffecter
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            )}
          </Card>

          {dossier.procedure === "PUBLIQUE" && (
            <Card className="border-ligne bg-card p-5">
              <p className="text-xs font-medium text-ardoise">Établissement public</p>
              <div className="mt-2 flex items-center gap-2.5">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-lapis/10 font-mono text-lapis"><Landmark className="h-4 w-4" strokeWidth={1.5} /></AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-encre">{univ?.nom}</p>
                  <p className="text-xs text-ardoise">
                    {etablissementNonAffecte ? "En attente d'affectation par l'agence" : form?.intitule}
                  </p>
                </div>
              </div>
              {canAssignEtablissement && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!etablissementAssignable}
                    title={
                      !etablissementAssignable
                        ? "L'affectation est possible entre la vérification et la confirmation du paiement."
                        : undefined
                    }
                    onClick={openEtablissementDialog}
                  >
                    <Landmark className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                    {etablissementNonAffecte ? "Affecter un établissement" : "Réaffecter"}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {etatLower === "paiement_attente" && (
            <Alert className="border-ambre/40 bg-ambre/5">
              <Wallet className="h-4 w-4 text-ambre" strokeWidth={1.5} />
              <AlertTitle className="font-display text-sm font-bold text-encre">
                En attente de règlement hors plateforme.
              </AlertTitle>
              <AlertDescription className="text-sm text-ardoise">
                Le candidat a été invité à convenir des modalités de paiement hors plateforme avec son conseiller.
                Le dossier passera automatiquement à l&apos;étape suivante dès que l&apos;encaissement de{" "}
                {formatFCFA(dossier.fraisAgence)} aura été enregistré depuis l&apos;onglet « Paiements » ou la section Finance.
              </AlertDescription>
            </Alert>
          )}

          {actions.length > 0 && (
            <Card className="border-lapis/30 bg-lapis/5 p-5">
              <p className="text-sm font-medium text-encre">Actions de workflow</p>
              <div className="mt-3 space-y-2">
                {actions.map((a) =>
                  a.motifDialog ? (
                    <Button
                      key={a.label}
                      variant="outline"
                      className="w-full justify-start"
                      size="sm"
                      onClick={openCorrectionDialog}
                    >
                      <a.icon className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {a.label}
                    </Button>
                  ) : a.fileDialog ? (
                    <Button
                      key={a.label}
                      variant={a.tone === "primary" ? "default" : "outline"}
                      className={cn("w-full justify-start", a.tone === "primary" && "bg-lapis text-blanc hover:bg-lapis/90")}
                      size="sm"
                      onClick={openAttestationDialog}
                    >
                      <a.icon className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {a.label}
                    </Button>
                  ) : a.confirm ? (
                    <AlertDialog key={a.label}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant={a.tone === "primary" ? "default" : a.tone === "danger" ? "outline" : "outline"}
                          className={cn("w-full justify-start", a.tone === "primary" && "bg-lapis text-blanc hover:bg-lapis/90", a.tone === "danger" && "border-carmin/40 text-carmin hover:bg-carmin/5")}
                          size="sm"
                        >
                          <a.icon className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {a.label}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-display text-lg flex items-center gap-2">
                            {a.tone === "danger" ? <AlertTriangle className="h-5 w-5 text-carmin" strokeWidth={1.5} /> : <Info className="h-5 w-5 text-lapis" strokeWidth={1.5} />}
                            {a.confirm.title}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm text-ardoise">{a.confirm.desc}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className={cn(a.tone === "danger" ? "bg-carmin text-blanc hover:bg-carmin/90" : "bg-lapis text-blanc hover:bg-lapis/90")}
                            onClick={execAction(a)}
                          >
                            Confirmer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      key={a.label}
                      variant={a.tone === "primary" ? "default" : "outline"}
                      className={cn("w-full justify-start", a.tone === "primary" && "bg-lapis text-blanc hover:bg-lapis/90")}
                      size="sm"
                      disabled={a.disabled}
                      title={a.disabled ? a.disabledReason : undefined}
                      onClick={execAction(a)}
                    >
                      <a.icon className="mr-1.5 h-4 w-4" strokeWidth={1.5} /> {a.label}
                    </Button>
                  )
                )}
              </div>
              {etatLower === "correction" && latestDemandeCorrection?.statut !== "SOUMISE" && (
                <p className="mt-2 text-xs text-ardoise">
                  Le candidat n&apos;a pas encore resoumis son dossier depuis la dernière demande de correction.
                </p>
              )}
            </Card>
          )}

          {dossier.demandesCorrection.length > 0 && (
            <Card className="border-ligne bg-card p-5">
              <p className="text-sm font-medium text-encre">Historique des corrections</p>
              <ol className="mt-3 space-y-3">
                {dossier.demandesCorrection.map((d) => {
                  const cfg = STATUT_DEMANDE_CORRECTION[d.statut];
                  return (
                    <li key={d.id} className="border-b border-ligne/60 pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("font-mono text-[10px] uppercase", cfg.color, cfg.bg, "border-transparent")}>{cfg.label}</Badge>
                        <span className="font-mono text-[10px] text-ardoise">{formatDateTime(d.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-encre">{d.motif}</p>
                      <p className="mt-0.5 text-xs text-ardoise">Par {d.conseiller.prenom} {d.conseiller.nom}</p>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          {etatLower === "refuse" && (
            <Alert className="border-carmin/40 bg-carmin/5">
              <XCircle className="h-4 w-4 text-carmin" strokeWidth={1.5} />
              <AlertTitle className="font-display text-sm font-bold text-carmin">Candidature refusée</AlertTitle>
              <AlertDescription className="text-sm text-ardoise">
                L'université a décliné cette candidature. Contactez le candidat pour l'accompagner vers une alternative.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander une correction</DialogTitle>
            <DialogDescription>
              Le motif sera envoyé à {dossier.candidat.prenom} (message + notification) et le dossier repassera en « À corriger ». L&apos;admin et le super admin seront notifiés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Décrivez précisément ce qui doit être corrigé…"
              rows={5}
              aria-label="Motif de la demande de correction"
            />
            {motif.trim().length === 0 && (
              <p className="text-xs text-carmin">Le motif est obligatoire.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={motif.trim().length === 0 || submittingCorrection}
              onClick={() => void confirmCorrection()}
            >
              {submittingCorrection && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attestationOpen} onOpenChange={setAttestationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dossier.attestation?.cheminFichier ? "Remplacer le document d'attestation" : "Téléverser l'attestation"}
            </DialogTitle>
            <DialogDescription>
              {dossier.attestation?.cheminFichier
                ? "Le nouveau fichier remplacera le document actuellement visible par le candidat."
                : `Téléversez le document de préinscription envoyé par ${univ?.nom}. ${dossier.candidat.prenom} sera notifié avec un message de félicitations et pourra le consulter dans son espace.`}
            </DialogDescription>
          </DialogHeader>

          {dossier.attestation?.cheminFichier && (
            <a
              href={`/api/dossiers/${dossier.id}/attestation/download?disposition=inline`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-lapis underline-offset-2 hover:underline"
            >
              Voir le document actuel ({dossier.attestation.nomFichier ?? "fichier"})
            </a>
          )}

          <div className="space-y-1.5">
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setAttestationFile(e.target.files?.[0] ?? null)}
              aria-label="Document d'attestation"
            />
            {!attestationFile && (
              <p className="text-xs text-ardoise">PDF, JPG, PNG ou WEBP — 10 Mo max.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAttestationOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={!attestationFile || uploadingAttestation}
              onClick={() => void confirmAttestationUpload()}
            >
              {uploadingAttestation && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              {dossier.attestation?.cheminFichier ? "Remplacer" : "Envoyer au candidat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dossier.conseiller ? "Réaffecter un conseiller" : "Affecter un conseiller"}</DialogTitle>
            <DialogDescription>Choisissez le conseiller responsable du dossier {dossier.reference}.</DialogDescription>
          </DialogHeader>

          {conseillers === null ? (
            <div className="flex items-center gap-2 py-2 text-sm text-ardoise">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Chargement des conseillers…
            </div>
          ) : conseillers.length === 0 ? (
            <p className="py-2 text-sm text-ardoise">Aucun conseiller actif disponible.</p>
          ) : (
            <Select value={selectedConseillerId} onValueChange={setSelectedConseillerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un conseiller" />
              </SelectTrigger>
              <SelectContent>
                {conseillers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={!selectedConseillerId || assigning}
              onClick={() => void confirmAssign()}
            >
              {assigning && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Affecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={etablissementOpen} onOpenChange={setEtablissementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{etablissementNonAffecte ? "Affecter un établissement" : "Réaffecter un établissement"}</DialogTitle>
            <DialogDescription>
              Choisissez l&apos;établissement public le plus adapté au profil de {dossier.candidat.prenom} {dossier.candidat.nom} pour le dossier {dossier.reference}.
            </DialogDescription>
          </DialogHeader>

          {etablissementsPublics === null ? (
            <div className="flex items-center gap-2 py-2 text-sm text-ardoise">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Chargement des établissements publics…
            </div>
          ) : etablissementsPublics.length === 0 ? (
            <p className="py-2 text-sm text-ardoise">Aucun établissement public disponible dans le catalogue.</p>
          ) : (
            <div className="space-y-3">
              <Select
                value={selectedUniversitePubliqueId}
                onValueChange={(id) => {
                  setSelectedUniversitePubliqueId(id);
                  const univPublique = etablissementsPublics.find((u) => u.id === id);
                  setSelectedFormationPubliqueId(univPublique?.formations[0]?.id ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une université publique" />
                </SelectTrigger>
                <SelectContent>
                  {etablissementsPublics.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nom} — {u.ville}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUniversitePubliqueId && (
                <Select value={selectedFormationPubliqueId} onValueChange={setSelectedFormationPubliqueId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {etablissementsPublics
                      .find((u) => u.id === selectedUniversitePubliqueId)
                      ?.formations.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.intitule} ({f.niveau})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEtablissementOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-lapis text-blanc hover:bg-lapis/90"
              disabled={!selectedFormationPubliqueId || assigningEtablissement}
              onClick={() => void confirmAssignEtablissement()}
            >
              {assigningEtablissement && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              Affecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmation suppression dossier */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-ligne bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-carmin">
              Supprimer définitivement le dossier ?
            </DialogTitle>
            <DialogDescription className="text-sm text-ardoise">
              Cette action est irréversible. Le dossier{" "}
              <span className="font-semibold text-encre">{dossier.reference}</span> ({candidatNomComplet}) sera
              définitivement supprimé avec l&apos;ensemble de ses pièces téléversées, messages, historiques et paiements
              associés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button
              className="bg-carmin text-blanc hover:bg-carmin/90"
              onClick={() => void confirmDeleteDossier()}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
              Confirmer la suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ligne/60 pb-2">
      <span className="text-xs text-ardoise">{label}</span>
      <span className={cn("text-sm font-medium text-encre text-right", mono && "font-mono")}>{value}</span>
    </div>
  );
}
