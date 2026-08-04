import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formationSchema } from "@/lib/validations";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { resolveFraisAgenceAsync } from "@/lib/dossier/frais-agence-server";

/** POST /api/formations — crée une formation (catalogue.write) */
export async function POST(request: Request) {
  const auth = await requireApiPermission("catalogue.write");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const universiteId = String(body.universiteId || "");
  if (!universiteId) {
    return NextResponse.json({ error: "universiteId requis" }, { status: 400 });
  }

  const parsed = parseOrRespond(formationSchema, body);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const univ = await db.universite.findUnique({ where: { id: universiteId } });
  if (!univ) {
    return NextResponse.json({ error: "Université introuvable" }, { status: 404 });
  }

  const frais =
    data.fraisAgence ?? (await resolveFraisAgenceAsync(univ.typeEtablissement));

  const formation = await db.formation.create({
    data: {
      universiteId,
      intitule: data.intitule,
      niveau: data.niveau,
      domaine: data.domaine,
      duree: data.duree,
      fraisAgence: frais,
      prerequis: JSON.stringify(data.prerequis ?? []),
      piecesRequises: JSON.stringify(data.piecesRequises ?? []),
    },
  });

  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "universite",
    resourceId: formation.id,
    details: `Formation créée : ${formation.intitule} (${univ.nom})`,
  });

  return NextResponse.json(
    {
      ...formation,
      prerequis: data.prerequis,
      piecesRequises: data.piecesRequises,
    },
    { status: 201 },
  );
}
