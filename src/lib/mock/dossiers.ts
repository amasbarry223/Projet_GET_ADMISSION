import { type EtatCode } from "./etats";

export type PieceDossier = {
  id: string;
  libelle: string;
  statut: "manquante" | "televersee" | "a_corriger" | "validee";
  type: "pdf" | "image" | "autre";
  taille?: string; // ex. "1,2 Mo"
  televerseeLe?: string; // ISO
};

export type EntreeHistorique = {
  id: string;
  date: string; // ISO
  etat: EtatCode;
  auteur: string;
  note: string;
};

export type PaiementRecu = {
  id: string;
  reference: string;
  date: string;
  montant: number;
  moyen: "Orange Money" | "Moov Money" | "Wave" | "Carte bancaire";
  statut: "réussi" | "en_attente" | "échoué";
  tranche?: string;
};

export type Dossier = {
  id: string;
  reference: string; // GETADM-2026-00XX
  candidatId: string;
  candidatNom: string;
  candidatPrenom: string;
  candidatNationalite: string;
  universiteId: string;
  formationId: string;
  etat: EtatCode;
  etapeActuelle: number; // 1..12
  conseillerId: string;
  conseillerNom: string;
  fraisAgence: number;
  paiementStatut: "aucun" | "partiel" | "complet";
  pieces: PieceDossier[];
  historique: EntreeHistorique[];
  paiements: PaiementRecu[];
  dateCreation: string;
  dateMaj: string;
  mrz: string;
};

export const DOSSIERS: Dossier[] = [
  {
    id: "d-0048",
    reference: "GETADM-2026-0048",
    candidatId: "u-cand-1",
    candidatNom: "DIALLO",
    candidatPrenom: "Fatou",
    candidatNationalite: "Sénégalaise",
    universiteId: "u-sorbonne",
    formationId: "f-su-m1-droit",
    etat: "pre_admission",
    etapeActuelle: 9,
    conseillerId: "u-cons-1",
    conseillerNom: "Aïssatou Diallo",
    fraisAgence: 850000,
    paiementStatut: "complet",
    pieces: [
      { id: "p1", libelle: "Diplôme de licence", statut: "validee", type: "pdf", taille: "1,2 Mo", televerseeLe: "2026-01-12T10:24:00" },
      { id: "p2", libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,9 Mo", televerseeLe: "2026-01-12T10:25:00" },
      { id: "p3", libelle: "Test TCF", statut: "validee", type: "pdf", taille: "0,6 Mo", televerseeLe: "2026-01-13T09:02:00" },
      { id: "p4", libelle: "Lettre de motivation", statut: "validee", type: "pdf", taille: "0,4 Mo", televerseeLe: "2026-01-12T10:30:00" },
      { id: "p5", libelle: "CV", statut: "validee", type: "pdf", taille: "0,5 Mo", televerseeLe: "2026-01-12T10:31:00" },
    ],
    historique: [
      { id: "h1", date: "2026-01-10T08:12:00", etat: "brouillon", auteur: "Fatou Diallo", note: "Dossier créé." },
      { id: "h2", date: "2026-01-12T10:31:00", etat: "soumis", auteur: "Fatou Diallo", note: "Dossier soumis avec 5 pièces." },
      { id: "h3", date: "2026-01-14T14:20:00", etat: "verification", auteur: "Aïssatou Diallo", note: "Prise en charge, début de vérification." },
      { id: "h4", date: "2026-01-16T11:00:00", etat: "paiement_attente", auteur: "Aïssatou Diallo", note: "Frais d'agence à régler : 850 000 FCFA." },
      { id: "h5", date: "2026-01-18T16:42:00", etat: "paiement_confirme", auteur: "Système", note: "Paiement Orange Money confirmé." },
      { id: "h6", date: "2026-01-19T09:15:00", etat: "transmis", auteur: "Aïssatou Diallo", note: "Dossier transmis à la Sorbonne Université." },
      { id: "h7", date: "2026-01-19T09:16:00", etat: "attente_reponse", auteur: "Système", note: "En attente de décision de l'université." },
      { id: "h8", date: "2026-02-03T12:00:00", etat: "pre_admission", auteur: "Sorbonne Université", note: "Pré-admission accordée pour le Master 1." },
    ],
    paiements: [
      { id: "pa1", reference: "REC-2026-0481", date: "2026-01-18T16:42:00", montant: 850000, moyen: "Orange Money", statut: "réussi" },
    ],
    dateCreation: "2026-01-10T08:12:00",
    dateMaj: "2026-02-03T12:00:00",
    mrz: "GETADM<<DIALLO<<FATOU<<<<<<<<<<2026\nSU<<M1<<<<<<048<<<<<<<<<<<<<<<<<<\nGETADM-2026-0048<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0049",
    reference: "GETADM-2026-0049",
    candidatId: "u-cand-2",
    candidatNom: "KOUASSI",
    candidatPrenom: "Marc",
    candidatNationalite: "Ivoirienne",
    universiteId: "u-umontreal",
    formationId: "f-udem-m-ia",
    etat: "verification",
    etapeActuelle: 3,
    conseillerId: "u-cons-1",
    conseillerNom: "Aïssatou Diallo",
    fraisAgence: 1450000,
    paiementStatut: "aucun",
    pieces: [
      { id: "p1", libelle: "Diplôme de bac", statut: "televersee", type: "pdf", taille: "1,5 Mo", televerseeLe: "2026-02-01T09:12:00" },
      { id: "p2", libelle: "Relevé de notes", statut: "televersee", type: "pdf", taille: "1,1 Mo", televerseeLe: "2026-02-01T09:14:00" },
      { id: "p3", libelle: "Test IELTS", statut: "manquante", type: "pdf" },
      { id: "p4", libelle: "CV", statut: "a_corriger", type: "pdf", taille: "0,8 Mo", televerseeLe: "2026-02-01T09:18:00" },
      { id: "p5", libelle: "Lettre de motivation", statut: "televersee", type: "pdf", taille: "0,5 Mo", televerseeLe: "2026-02-01T09:20:00" },
    ],
    historique: [
      { id: "h1", date: "2026-01-28T10:00:00", etat: "brouillon", auteur: "Marc Kouassi", note: "Dossier créé." },
      { id: "h2", date: "2026-02-01T09:21:00", etat: "soumis", auteur: "Marc Kouassi", note: "Dossier soumis (4 pièces, 1 manquante)." },
      { id: "h3", date: "2026-02-02T11:00:00", etat: "verification", auteur: "Aïssatou Diallo", note: "Début de vérification. CV à corriger." },
    ],
    paiements: [],
    dateCreation: "2026-01-28T10:00:00",
    dateMaj: "2026-02-02T11:00:00",
    mrz: "GETADM<<KOUASSI<<MARC<<<<<<<<<2026\nUM<<M2<<<<<<049<<<<<<<<<<<<<<<<<<\nGETADM-2026-0049<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0050",
    reference: "GETADM-2026-0050",
    candidatId: "u-cand-3",
    candidatNom: "BENSAID",
    candidatPrenom: "Yasmine",
    candidatNationalite: "Marocaine",
    universiteId: "u-umontreal",
    formationId: "f-udem-m-management",
    etat: "paiement_attente",
    etapeActuelle: 5,
    conseillerId: "u-cons-2",
    conseillerNom: "Olivier Nguema",
    fraisAgence: 1180000,
    paiementStatut: "aucun",
    pieces: [
      { id: "p1", libelle: "Diplôme de bac+3", statut: "validee", type: "pdf", taille: "1,0 Mo", televerseeLe: "2026-01-22T08:00:00" },
      { id: "p2", libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,9 Mo", televerseeLe: "2026-01-22T08:05:00" },
      { id: "p3", libelle: "CV", statut: "validee", type: "pdf", taille: "0,6 Mo", televerseeLe: "2026-01-22T08:10:00" },
      { id: "p4", libelle: "Test d'anglais", statut: "validee", type: "pdf", taille: "0,7 Mo", televerseeLe: "2026-01-22T08:15:00" },
    ],
    historique: [
      { id: "h1", date: "2026-01-20T14:00:00", etat: "brouillon", auteur: "Yasmine Bensaid", note: "Dossier créé." },
      { id: "h2", date: "2026-01-22T08:20:00", etat: "soumis", auteur: "Yasmine Bensaid", note: "Dossier soumis." },
      { id: "h3", date: "2026-01-23T10:30:00", etat: "verification", auteur: "Olivier Nguema", note: "Vérification en cours." },
      { id: "h4", date: "2026-01-25T09:00:00", etat: "paiement_attente", auteur: "Olivier Nguema", note: "Frais d'agence à régler : 1 180 000 FCFA." },
    ],
    paiements: [],
    dateCreation: "2026-01-20T14:00:00",
    dateMaj: "2026-01-25T09:00:00",
    mrz: "GETADM<<BENSAID<<YASMINE<<<<<<<2026\nUM<<M2<<<<<<050<<<<<<<<<<<<<<<<<<\nGETADM-2026-0050<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0051",
    reference: "GETADM-2026-0051",
    candidatId: "u-cand-4",
    candidatNom: "NGUEMA",
    candidatPrenom: "Paul",
    candidatNationalite: "Gabonaise",
    universiteId: "u-uct",
    formationId: "f-uct-m-commerce",
    etat: "attente_reponse",
    etapeActuelle: 8,
    conseillerId: "u-cons-2",
    conseillerNom: "Olivier Nguema",
    fraisAgence: 1620000,
    paiementStatut: "complet",
    pieces: [
      { id: "p1", libelle: "Diplôme de bac+3", statut: "validee", type: "pdf", taille: "1,1 Mo" },
      { id: "p2", libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,9 Mo" },
      { id: "p3", libelle: "CV", statut: "validee", type: "pdf", taille: "0,7 Mo" },
      { id: "p4", libelle: "Test d'anglais", statut: "validee", type: "pdf", taille: "0,8 Mo" },
      { id: "p5", libelle: "Lettre de motivation", statut: "validee", type: "pdf", taille: "0,4 Mo" },
    ],
    historique: [
      { id: "h1", date: "2025-12-10T10:00:00", etat: "brouillon", auteur: "Paul Nguema", note: "Dossier créé." },
      { id: "h2", date: "2025-12-15T14:00:00", etat: "soumis", auteur: "Paul Nguema", note: "Dossier soumis." },
      { id: "h3", date: "2025-12-17T09:00:00", etat: "verification", auteur: "Olivier Nguema", note: "Vérification." },
      { id: "h4", date: "2025-12-19T11:00:00", etat: "paiement_attente", auteur: "Olivier Nguema", note: "Frais à régler." },
      { id: "h5", date: "2025-12-21T15:00:00", etat: "paiement_confirme", auteur: "Système", note: "Paiement Wave confirmé." },
      { id: "h6", date: "2025-12-22T10:00:00", etat: "transmis", auteur: "Olivier Nguema", note: "Transmis à UCT." },
      { id: "h7", date: "2025-12-22T10:01:00", etat: "attente_reponse", auteur: "Système", note: "En attente de réponse." },
    ],
    paiements: [
      { id: "pa1", reference: "REC-2026-0511", date: "2025-12-21T15:00:00", montant: 1620000, moyen: "Wave", statut: "réussi" },
    ],
    dateCreation: "2025-12-10T10:00:00",
    dateMaj: "2025-12-22T10:01:00",
    mrz: "GETADM<<NGUEMA<<PAUL<<<<<<<<<<<2026\nUCT<M2<<<<<<051<<<<<<<<<<<<<<<<<<\nGETADM-2026-0051<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0052",
    reference: "GETADM-2026-0052",
    candidatId: "u-cand-5",
    candidatNom: "TRAORE",
    candidatPrenom: "Awa",
    candidatNationalite: "Burkinabè",
    universiteId: "u-um5",
    formationId: "f-um5-m-droit",
    etat: "attestation",
    etapeActuelle: 11,
    conseillerId: "u-cons-1",
    conseillerNom: "Aïssatou Diallo",
    fraisAgence: 540000,
    paiementStatut: "complet",
    pieces: [
      { id: "p1", libelle: "Diplôme de licence", statut: "validee", type: "pdf", taille: "1,2 Mo" },
      { id: "p2", libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,8 Mo" },
      { id: "p3", libelle: "CV", statut: "validee", type: "pdf", taille: "0,5 Mo" },
      { id: "p4", libelle: "Lettre de motivation", statut: "validee", type: "pdf", taille: "0,4 Mo" },
    ],
    historique: [
      { id: "h1", date: "2025-11-01T10:00:00", etat: "brouillon", auteur: "Awa Traoré", note: "Dossier créé." },
      { id: "h2", date: "2025-11-05T12:00:00", etat: "soumis", auteur: "Awa Traoré", note: "Dossier soumis." },
      { id: "h3", date: "2025-11-06T09:00:00", etat: "verification", auteur: "Aïssatou Diallo", note: "Vérification." },
      { id: "h4", date: "2025-11-08T11:00:00", etat: "paiement_attente", auteur: "Aïssatou Diallo", note: "Frais à régler." },
      { id: "h5", date: "2025-11-10T16:00:00", etat: "paiement_confirme", auteur: "Système", note: "Paiement Moov confirmé." },
      { id: "h6", date: "2025-11-11T09:30:00", etat: "transmis", auteur: "Aïssatou Diallo", note: "Transmis à Mohammed V." },
      { id: "h7", date: "2025-11-11T09:31:00", etat: "attente_reponse", auteur: "Système", note: "En attente." },
      { id: "h8", date: "2025-12-01T10:00:00", etat: "pre_admission", auteur: "Université Mohammed V", note: "Pré-admission accordée." },
      { id: "h9", date: "2025-12-05T14:00:00", etat: "attestation", auteur: "Yasmine Bensaid", note: "Attestation émise, disponible au téléchargement." },
    ],
    paiements: [
      { id: "pa1", reference: "REC-2026-0522", date: "2025-11-10T16:00:00", montant: 540000, moyen: "Moov Money", statut: "réussi" },
    ],
    dateCreation: "2025-11-01T10:00:00",
    dateMaj: "2025-12-05T14:00:00",
    mrz: "GETADM<<TRAORE<<AWA<<<<<<<<<<<<2026\nUM5<M2<<<<<<052<<<<<<<<<<<<<<<<<<\nGETADM-2026-0052<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0053",
    reference: "GETADM-2026-0053",
    candidatId: "u-cand-6",
    candidatNom: "DIABATE",
    candidatPrenom: "Moussa",
    candidatNationalite: "Malienne",
    universiteId: "u-tunis",
    formationId: "f-utm-l3-ingenierie",
    etat: "refuse",
    etapeActuelle: 10,
    conseillerId: "u-cons-2",
    conseillerNom: "Olivier Nguema",
    fraisAgence: 540000,
    paiementStatut: "complet",
    pieces: [
      { id: "p1", libelle: "Diplôme Bac+2", statut: "validee", type: "pdf", taille: "1,0 Mo" },
      { id: "p2", libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,8 Mo" },
      { id: "p3", libelle: "CV", statut: "validee", type: "pdf", taille: "0,5 Mo" },
    ],
    historique: [
      { id: "h1", date: "2025-10-15T10:00:00", etat: "brouillon", auteur: "Moussa Diabaté", note: "Dossier créé." },
      { id: "h2", date: "2025-10-18T14:00:00", etat: "soumis", auteur: "Moussa Diabaté", note: "Dossier soumis." },
      { id: "h3", date: "2025-10-20T09:00:00", etat: "verification", auteur: "Olivier Nguema", note: "Vérification." },
      { id: "h4", date: "2025-10-22T11:00:00", etat: "paiement_attente", auteur: "Olivier Nguema", note: "Frais à régler." },
      { id: "h5", date: "2025-10-24T15:00:00", etat: "paiement_confirme", auteur: "Système", note: "Paiement Orange Money confirmé." },
      { id: "h6", date: "2025-10-25T09:30:00", etat: "transmis", auteur: "Olivier Nguema", note: "Transmis à Tunis El Manar." },
      { id: "h7", date: "2025-10-25T09:31:00", etat: "attente_reponse", auteur: "Système", note: "En attente." },
      { id: "h8", date: "2025-11-15T10:00:00", etat: "refuse", auteur: "Université de Tunis El Manar", note: "Candidature déclinée — niveau académique insuffisant en mathématiques." },
    ],
    paiements: [
      { id: "pa1", reference: "REC-2026-0533", date: "2025-10-24T15:00:00", montant: 540000, moyen: "Orange Money", statut: "réussi" },
    ],
    dateCreation: "2025-10-15T10:00:00",
    dateMaj: "2025-11-15T10:00:00",
    mrz: "GETADM<<DIABATE<<MOUSSA<<<<<<<<<2026\nUTM<L3<<<<<<053<<<<<<<<<<<<<<<<<<\nGETADM-2026-0053<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0054",
    reference: "GETADM-2026-0054",
    candidatId: "u-cand-7",
    candidatNom: "KONE",
    candidatPrenom: "Aminata",
    candidatNationalite: "Guinéenne",
    universiteId: "u-ugb",
    formationId: "f-ugb-m-economie",
    etat: "brouillon",
    etapeActuelle: 1,
    conseillerId: "",
    conseillerNom: "Non affecté",
    fraisAgence: 480000,
    paiementStatut: "aucun",
    pieces: [
      { id: "p1", libelle: "Diplôme de licence", statut: "manquante", type: "pdf" },
      { id: "p2", libelle: "Relevé de notes", statut: "manquante", type: "pdf" },
      { id: "p3", libelle: "CV", statut: "manquante", type: "pdf" },
      { id: "p4", libelle: "Lettre de motivation", statut: "manquante", type: "pdf" },
    ],
    historique: [
      { id: "h1", date: "2026-02-04T08:00:00", etat: "brouillon", auteur: "Aminata Koné", note: "Dossier créé." },
    ],
    paiements: [],
    dateCreation: "2026-02-04T08:00:00",
    dateMaj: "2026-02-04T08:00:00",
    mrz: "GETADM<<KONE<<AMINATA<<<<<<<<<<<2026\nUGB<M2<<<<<<054<<<<<<<<<<<<<<<<<<\nGETADM-2026-0054<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0055",
    reference: "GETADM-2026-0055",
    candidatId: "u-cand-8",
    candidatNom: "OUEDRAOGO",
    candidatPrenom: "Salif",
    candidatNationalite: "Burkinabè",
    universiteId: "u-nantes",
    formationId: "f-nantes-m-staps",
    etat: "soumis",
    etapeActuelle: 2,
    conseillerId: "",
    conseillerNom: "Non affecté",
    fraisAgence: 780000,
    paiementStatut: "aucun",
    pieces: [
      { id: "p1", libelle: "Diplôme de licence", statut: "televersee", type: "pdf", taille: "1,1 Mo", televerseeLe: "2026-02-03T10:00:00" },
      { id: "p2", libelle: "Relevé de notes", statut: "televersee", type: "pdf", taille: "0,9 Mo", televerseeLe: "2026-02-03T10:05:00" },
      { id: "p3", libelle: "CV", statut: "televersee", type: "pdf", taille: "0,6 Mo", televerseeLe: "2026-02-03T10:10:00" },
      { id: "p4", libelle: "Lettre de motivation", statut: "televersee", type: "pdf", taille: "0,4 Mo", televerseeLe: "2026-02-03T10:12:00" },
    ],
    historique: [
      { id: "h1", date: "2026-02-01T09:00:00", etat: "brouillon", auteur: "Salif Ouédraogo", note: "Dossier créé." },
      { id: "h2", date: "2026-02-03T10:13:00", etat: "soumis", auteur: "Salif Ouédraogo", note: "Dossier soumis." },
    ],
    paiements: [],
    dateCreation: "2026-02-01T09:00:00",
    dateMaj: "2026-02-03T10:13:00",
    mrz: "GETADM<<OUEDRAOGO<<SALIF<<<<<<<<2026\nUN<<M2<<<<<<055<<<<<<<<<<<<<<<<<<\nGETADM-2026-0055<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0056",
    reference: "GETADM-2026-0056",
    candidatId: "u-cand-9",
    candidatNom: "FAYE",
    candidatPrenom: "Marième",
    candidatNationalite: "Sénégalaise",
    universiteId: "u-uhasselt",
    formationId: "f-uh-m-transport",
    etat: "cloture",
    etapeActuelle: 12,
    conseillerId: "u-cons-1",
    conseillerNom: "Aïssatou Diallo",
    fraisAgence: 980000,
    paiementStatut: "complet",
    pieces: [
      { id: "p1", libelle: "Diplôme de bac+3", statut: "validee", type: "pdf", taille: "1,0 Mo" },
      { id: "p2", libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,9 Mo" },
      { id: "p3", libelle: "CV", statut: "validee", type: "pdf", taille: "0,5 Mo" },
      { id: "p4", libelle: "Test d'anglais", statut: "validee", type: "pdf", taille: "0,7 Mo" },
    ],
    historique: [
      { id: "h1", date: "2025-09-01T10:00:00", etat: "brouillon", auteur: "Marième Faye", note: "Dossier créé." },
      { id: "h2", date: "2025-09-05T12:00:00", etat: "soumis", auteur: "Marième Faye", note: "Dossier soumis." },
      { id: "h3", date: "2025-09-07T09:00:00", etat: "verification", auteur: "Aïssatou Diallo", note: "Vérification." },
      { id: "h4", date: "2025-09-09T11:00:00", etat: "paiement_attente", auteur: "Aïssatou Diallo", note: "Frais à régler." },
      { id: "h5", date: "2025-09-12T15:00:00", etat: "paiement_confirme", auteur: "Système", note: "Paiement carte confirmé." },
      { id: "h6", date: "2025-09-13T09:30:00", etat: "transmis", auteur: "Aïssatou Diallo", note: "Transmis à Hasselt." },
      { id: "h7", date: "2025-09-13T09:31:00", etat: "attente_reponse", auteur: "Système", note: "En attente." },
      { id: "h8", date: "2025-10-01T10:00:00", etat: "pre_admission", auteur: "Université de Hasselt", note: "Pré-admission accordée." },
      { id: "h9", date: "2025-10-05T14:00:00", etat: "attestation", auteur: "Yasmine Bensaid", note: "Attestation émise." },
      { id: "h10", date: "2025-10-20T10:00:00", etat: "cloture", auteur: "Yasmine Bensaid", note: "Attestation récupérée à l'agence. Dossier clôturé." },
    ],
    paiements: [
      { id: "pa1", reference: "REC-2026-0566", date: "2025-09-12T15:00:00", montant: 980000, moyen: "Carte bancaire", statut: "réussi" },
    ],
    dateCreation: "2025-09-01T10:00:00",
    dateMaj: "2025-10-20T10:00:00",
    mrz: "GETADM<<FAYE<<MARIEME<<<<<<<<<<<2026\nUH<<M2<<<<<<056<<<<<<<<<<<<<<<<<<\nGETADM-2026-0056<<<<<<<<<<<<<<<<",
  },
  {
    id: "d-0057",
    reference: "GETADM-2026-0057",
    candidatId: "u-cand-10",
    candidatNom: "ZERBO",
    candidatPrenom: "Adama",
    candidatNationalite: "Burkinabè",
    universiteId: "u-lau",
    formationId: "f-lau-m-architecture",
    etat: "correction",
    etapeActuelle: 4,
    conseillerId: "u-cons-2",
    conseillerNom: "Olivier Nguema",
    fraisAgence: 1750000,
    paiementStatut: "aucun",
    pieces: [
      { id: "p1", libelle: "Diplôme de bac+3", statut: "validee", type: "pdf", taille: "1,0 Mo" },
      { id: "p2", libelle: "Relevé de notes", statut: "validee", type: "pdf", taille: "0,9 Mo" },
      { id: "p3", libelle: "Portfolio", statut: "a_corriger", type: "pdf", taille: "8,2 Mo", televerseeLe: "2026-01-30T14:00:00" },
      { id: "p4", libelle: "Test d'anglais", statut: "manquante", type: "pdf" },
    ],
    historique: [
      { id: "h1", date: "2026-01-25T10:00:00", etat: "brouillon", auteur: "Adama Zerbo", note: "Dossier créé." },
      { id: "h2", date: "2026-01-30T15:00:00", etat: "soumis", auteur: "Adama Zerbo", note: "Dossier soumis." },
      { id: "h3", date: "2026-02-01T09:00:00", etat: "verification", auteur: "Olivier Nguema", note: "Vérification." },
      { id: "h4", date: "2026-02-02T11:00:00", etat: "correction", auteur: "Olivier Nguema", note: "Portfolio à retravailler (format trop lourd, projet principal manquant). Test d'anglais manquant." },
    ],
    paiements: [],
    dateCreation: "2026-01-25T10:00:00",
    dateMaj: "2026-02-02T11:00:00",
    mrz: "GETADM<<ZERBO<<ADAMA<<<<<<<<<<<<2026\nLAU<M2<<<<<<057<<<<<<<<<<<<<<<<<<\nGETADM-2026-0057<<<<<<<<<<<<<<<<",
  },
];

export function dossierParId(id: string): Dossier | undefined {
  return DOSSIERS.find((d) => d.id === id);
}

export function dossierParReference(reference: string): Dossier | undefined {
  return DOSSIERS.find((d) => d.reference === reference);
}

export function dossiersParCandidat(candidatId: string): Dossier[] {
  return DOSSIERS.filter((d) => d.candidatId === candidatId);
}

// Dossier « principal » du candidat de démo (Fatou Diallo)
export const DOSSIER_DEMO_CANDIDAT = DOSSIERS[0];
