import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/storage";

// GET /api/visa — Récupérer la demande de visa du candidat connecté
export async function GET() {
  const session = await getSession("candidat");
  if (!session?.user || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Non authentifié ou non autorisé" }, { status: 401 });
  }

  const visa = await db.demandeVisa.findUnique({
    where: { candidatId: session.user.id },
  }).catch(() => null);

  return NextResponse.json({ visa });
}

// POST /api/visa — Soumettre ou mettre à jour un visa (accepté ou refusé)
export async function POST(request: Request) {
  const session = await getSession("candidat");
  if (!session?.user || session.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Non authentifié ou non autorisé" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const statut = formData.get("statut") as string;
    const motifRefus = (formData.get("motifRefus") as string)?.trim();
    const fichier = formData.get("fichier") as File | null;

    if (statut !== "ACCORDE" && statut !== "REFUSE") {
      return NextResponse.json({ error: "Statut de visa invalide (ACCORDE ou REFUSE requis)." }, { status: 400 });
    }

    if (statut === "REFUSE" && !motifRefus) {
      return NextResponse.json(
        { error: "Veuillez fournir le motif explicite du refus de votre visa." },
        { status: 400 },
      );
    }

    let fichierVisaUrl: string | undefined = undefined;

    if (statut === "ACCORDE") {
      if (!fichier || fichier.size === 0) {
        // Si c'est un nouveau dépôt sans fichier existant
        const existing = await db.demandeVisa.findUnique({ where: { candidatId: session.user.id } });
        if (!existing?.fichierVisaUrl) {
          return NextResponse.json(
            { error: "Veuillez téléverser le scanné de votre visa." },
            { status: 400 },
          );
        }
      } else {
        const upload = await saveUpload(fichier, `visas/${session.user.id}`, { visibility: "private" });
        fichierVisaUrl = upload.cheminRelatif;
      }
    }

    const existing = await db.demandeVisa.findUnique({ where: { candidatId: session.user.id } });

    const visa = await db.demandeVisa.upsert({
      where: { candidatId: session.user.id },
      create: {
        candidatId: session.user.id,
        statut,
        fichierVisaUrl: statut === "ACCORDE" ? (fichierVisaUrl ?? existing?.fichierVisaUrl ?? null) : null,
        motifRefus: statut === "REFUSE" ? motifRefus : null,
      },
      update: {
        statut,
        fichierVisaUrl: statut === "ACCORDE" ? (fichierVisaUrl ?? existing?.fichierVisaUrl ?? null) : null,
        motifRefus: statut === "REFUSE" ? motifRefus : null,
      },
    });

    return NextResponse.json({ success: true, visa });
  } catch (error: unknown) {
    console.error("Erreur soumission visa:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement de votre visa." },
      { status: 500 },
    );
  }
}
