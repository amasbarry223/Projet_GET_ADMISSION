// Utilitaires de formatage — français, FCFA, euros, dates
export function formatFCFA(montant: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(montant)} FCFA`;
}

/** Montant entier en euros (frais de formation / scolarité). */
export function formatEUR(montant: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(montant)}\u00a0€`;
}

export function formatFCFACompact(montant: number): string {
  if (montant >= 1_000_000) {
    return `${(montant / 1_000_000).toFixed(montant % 1_000_000 === 0 ? 0 : 1)} M FCFA`;
  }
  if (montant >= 1000) {
    return `${Math.round(montant / 1000)} k FCFA`;
  }
  return `${montant} FCFA`;
}

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateCourte(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()} à ${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatHeure(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Génération d'une bande MRZ (zone lisible machine, façon passeport)
// Format compact inspiré du TD1 : 3 lignes de 30 caractères.
export function mrzPour({
  nom,
  prenom,
  reference,
  annee,
  universite,
  niveau,
}: {
  nom: string;
  prenom: string;
  reference: string;
  annee: string;
  universite: string;
  niveau: string;
}): string {
  const pad = (s: string, n: number) => s.toUpperCase().replace(/\s+/g, "<").padEnd(n, "<").slice(0, n);
  const ref = reference.replace(/-/g, "<").toUpperCase();
  const ligne1 = `GETADM<<${pad(nom, 13)}<<${pad(prenom, 10)}`.slice(0, 30);
  const ligne2 = `${pad(ref, 14)}${annee.slice(-2)}<<${pad(universite, 6)}<<${niveau.toUpperCase().slice(0, 2)}`.slice(0, 30);
  const ligne3 = `${pad(reference, 30)}`.slice(0, 30);
  return `${ligne1}\n${ligne2}\n${ligne3}`;
}

export function formatReference(ref: string): string {
  return ref;
}
