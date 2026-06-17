export type RoleInterne = "Conseiller" | "Financier" | "Admin" | "Super Admin";

export type UtilisateurInterne = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: RoleInterne;
  initiales: string;
  actif: boolean;
  dossiersAssignes: number;
  dateCreation: string;
};

export const UTILISATEURS_INTERNES: UtilisateurInterne[] = [
  { id: "u-cons-1", nom: "Diallo", prenom: "Aïssatou", email: "a.diallo@getadm.com", role: "Conseiller", initiales: "AD", actif: true, dossiersAssignes: 4, dateCreation: "2024-03-12" },
  { id: "u-cons-2", nom: "Nguema", prenom: "Olivier", email: "o.nguema@getadm.com", role: "Conseiller", initiales: "ON", actif: true, dossiersAssignes: 3, dateCreation: "2024-06-01" },
  { id: "u-fin-1", nom: "Kouassi", prenom: "Marc", email: "m.kouassi@getadm.com", role: "Financier", initiales: "MK", actif: true, dossiersAssignes: 0, dateCreation: "2024-01-15" },
  { id: "u-adm-1", nom: "Bensaid", prenom: "Yasmine", email: "y.bensaid@getadm.com", role: "Admin", initiales: "YB", actif: true, dossiersAssignes: 0, dateCreation: "2023-11-08" },
  { id: "u-sadm-1", nom: "Touré", prenom: "Ousmane", email: "o.toure@getadm.com", role: "Super Admin", initiales: "OT", actif: true, dossiersAssignes: 0, dateCreation: "2023-09-20" },
  { id: "u-cons-3", nom: "Cissé", prenom: "Mariam", email: "m.cisse@getadm.com", role: "Conseiller", initiales: "MC", actif: false, dossiersAssignes: 0, dateCreation: "2024-08-22" },
];

export const KPI_ADMIN = {
  nouveauxDossiers: 3,
  enCours: 5,
  tauxAcceptation: 75,
  encaissementsMois: 1390000,
  deltaNouveaux: 12,
  deltaEnCours: -8,
  deltaAcceptation: 4,
  deltaEncaissements: 22,
};
