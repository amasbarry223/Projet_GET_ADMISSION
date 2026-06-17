import { type PaiementRecu } from "./dossiers";

export type Transaction = PaiementRecu & {
  dossierReference: string;
  candidatNom: string;
  universiteId: string;
  methode: string;
};

// Transactions consolidées (vue finance back-office)
export const TRANSACTIONS: Transaction[] = [
  { id: "t1", reference: "REC-2026-0566", date: "2025-09-12T15:00:00", montant: 980000, moyen: "Carte bancaire", statut: "réussi", dossierReference: "GETADM-2026-0056", candidatNom: "FAYE Marième", universiteId: "u-uhasselt", methode: "Carte bancaire", tranche: "Solde" },
  { id: "t2", reference: "REC-2026-0533", date: "2025-10-24T15:00:00", montant: 540000, moyen: "Orange Money", statut: "réussi", dossierReference: "GETADM-2026-0053", candidatNom: "DIABATE Moussa", universiteId: "u-tunis", methode: "Orange Money", tranche: "Solde" },
  { id: "t3", reference: "REC-2026-0522", date: "2025-11-10T16:00:00", montant: 540000, moyen: "Moov Money", statut: "réussi", dossierReference: "GETADM-2026-0052", candidatNom: "TRAORE Awa", universiteId: "u-um5", methode: "Moov Money", tranche: "Solde" },
  { id: "t4", reference: "REC-2026-0511", date: "2025-12-21T15:00:00", montant: 1620000, moyen: "Wave", statut: "réussi", dossierReference: "GETADM-2026-0051", candidatNom: "NGUEMA Paul", universiteId: "u-uct", methode: "Wave", tranche: "Solde" },
  { id: "t5", reference: "REC-2026-0481", date: "2026-01-18T16:42:00", montant: 850000, moyen: "Orange Money", statut: "réussi", dossierReference: "GETADM-2026-0048", candidatNom: "DIALLO Fatou", universiteId: "u-sorbonne", methode: "Orange Money", tranche: "Solde" },
  { id: "t6", reference: "REC-2026-0580", date: "2026-02-04T11:20:00", montant: 425000, moyen: "Wave", statut: "en_attente", dossierReference: "GETADM-2026-0050", candidatNom: "BENSAID Yasmine", universiteId: "u-umontreal", methode: "Wave", tranche: "Tranche 1/2" },
  { id: "t7", reference: "REC-2026-0581", date: "2026-02-05T09:10:00", montant: 320000, moyen: "Carte bancaire", statut: "échoué", dossierReference: "GETADM-2026-0049", candidatNom: "KOUASSI Marc", universiteId: "u-umontreal", methode: "Carte bancaire", tranche: "Solde" },
];

// Agrégats finance
export const FINANCE_KPIS = {
  encaisseMois: 850000 + 540000, // Janvier 2026 encaissé
  enAttente: 425000,
  impayes: 320000,
  remboursements: 0,
  totalEncaisse: 980000 + 540000 + 540000 + 1620000 + 850000,
};

export const TRANSACTIONS_PAR_MOIS = [
  { mois: "Sep", montant: 980000 },
  { mois: "Oct", montant: 540000 },
  { mois: "Nov", montant: 540000 },
  { mois: "Déc", montant: 1620000 },
  { mois: "Jan", montant: 850000 },
  { mois: "Fév", montant: 0 },
];

export const REPARTITION_STATUTS = [
  { name: "Brouillon", value: 2, couleur: "#5A6781" },
  { name: "En cours", value: 5, couleur: "#C77A12" },
  { name: "Validés", value: 3, couleur: "#1F8A5B" },
  { name: "Refusés", value: 1, couleur: "#C0392B" },
];

export const TOP_UNIVERSITES = [
  { universite: "Sorbonne Univ.", dossiers: 1 },
  { universite: "U. Montréal", dossiers: 2 },
  { universite: "U. Cape Town", dossiers: 1 },
  { universite: "Mohammed V", dossiers: 1 },
  { universite: "Tunis El Manar", dossiers: 1 },
  { universite: "U. Hasselt", dossiers: 1 },
  { universite: "U. Nantes", dossiers: 1 },
  { universite: "LAU Beyrouth", dossiers: 1 },
];

export const DOSSIERS_PAR_PERIODE = [
  { periode: "S1", dossiers: 1, acceptes: 0 },
  { periode: "S2", dossiers: 2, acceptes: 1 },
  { periode: "S3", dossiers: 1, acceptes: 1 },
  { periode: "S4", dossiers: 1, acceptes: 0 },
  { periode: "S5", dossiers: 3, acceptes: 1 },
  { periode: "S6", dossiers: 2, acceptes: 1 },
];
