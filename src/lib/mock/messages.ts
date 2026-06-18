export type Message = {
  id: string;
  auteur: "candidat" | "conseiller";
  texte: string;
  date: string; // ISO
  pieceJointe?: { nom: string; taille: string };
};

export type Conversation = {
  dossierId: string;
  candidatNom: string;
  candidatPrenom: string;
  conseillerNom: string;
  messages: Message[];
  nonLusCandidat: number;
};

export const CONVERSATIONS: Conversation[] = [
  {
    dossierId: "d-0048",
    candidatNom: "DIALLO",
    candidatPrenom: "Fatou",
    conseillerNom: "Aïssatou Diallo",
    nonLusCandidat: 2,
    messages: [
      { id: "m1", auteur: "conseiller", texte: "Bonjour Fatou, votre dossier a bien été reçu. Je démarre la vérification.", date: "2026-01-14T14:30:00" },
      { id: "m2", auteur: "candidat", texte: "Bonjour Madame Diallo, merci beaucoup. Faut-il fournir une copie certifiée du diplôme ?", date: "2026-01-14T15:02:00" },
      { id: "m3", auteur: "conseiller", texte: "Oui, une copie certifiée conforme sera demandée par la Sorbonne. Je vous l'indiquerai en pièce requise dès que la vérification sera finalisée.", date: "2026-01-14T15:18:00" },
      { id: "m4", auteur: "conseiller", texte: "Bonne nouvelle : votre paiement Orange Money a bien été reçu. Je transmets votre dossier à l'université dans la journée.", date: "2026-01-18T17:00:00" },
      { id: "m5", auteur: "conseiller", texte: "Votre pré-admission a été accordée par la Sorbonne Université 🎉. L'attestation sera disponible sous 48h.", date: "2026-02-03T12:30:00", pieceJointe: { nom: "pre_admission_su.pdf", taille: "0,8 Mo" } },
    ],
  },
  {
    dossierId: "d-0049",
    candidatNom: "KOUASSI",
    candidatPrenom: "Marc",
    conseillerNom: "Aïssatou Diallo",
    nonLusCandidat: 1,
    messages: [
      { id: "m1", auteur: "candidat", texte: "Bonjour, j'ai soumis mon dossier hier. À quand la suite ?", date: "2026-02-02T08:00:00" },
      { id: "m2", auteur: "conseiller", texte: "Bonjour Marc, je viens de prendre en charge votre dossier. Votre CV doit être mis à jour (format et expériences). Je vous laisse le corriger. Le test IELTS est également manquant.", date: "2026-02-02T11:10:00" },
    ],
  },
];

export function conversationParDossier(dossierId: string): Conversation | undefined {
  return CONVERSATIONS.find((c) => c.dossierId === dossierId);
}
