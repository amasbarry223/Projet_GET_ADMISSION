/**
 * Renvoie l'e-mail de vérification aux candidats non vérifiés (token frais).
 * Usage: npx tsx --env-file=.env scripts/resend-pending-verifications.ts
 * Prérequis: RESEND_API_KEY + MAIL_FROM + DATABASE_URL
 */
import { PrismaClient } from "@prisma/client";
import { sendMail, verificationEmailHtml } from "../src/lib/mail";
import { createVerifyToken } from "../src/lib/verify-token";

const db = new PrismaClient();

async function main() {
  const pending = await db.user.findMany({
    where: {
      role: "CANDIDAT",
      emailVerified: null,
      email: { not: { contains: "@example.com" } },
      NOT: { email: { endsWith: "@demo.getadm" } },
    },
    select: { id: true, email: true, prenom: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  console.log(`Candidats non vérifiés (hors tests): ${pending.length}`);
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY absent — les envois échoueront en production / seront journalisés en dev.");
  }

  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let sent = 0;
  let failed = 0;

  for (const u of pending) {
    if (u.email.includes("test.") || u.email.includes("ratelimit")) {
      console.log(`skip ${u.email}`);
      continue;
    }
    const verifyToken = createVerifyToken();
    await db.user.update({ where: { id: u.id }, data: { verifyToken } });
    const verifyUrl = `${base}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;
    const mail = await sendMail({
      to: u.email,
      subject: "Vérifiez votre e-mail — GET Admission",
      html: verificationEmailHtml(u.prenom, verifyUrl),
      text: `Bonjour ${u.prenom}, confirmez votre e-mail : ${verifyUrl}`,
    });
    if (mail.ok) {
      sent++;
      console.log(`OK  ${u.email}`);
    } else {
      failed++;
      console.error(`FAIL ${u.email}: ${mail.error}`);
    }
  }

  console.log(`Terminé — envoyés: ${sent}, échecs: ${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
