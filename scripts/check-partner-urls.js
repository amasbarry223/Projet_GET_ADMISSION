const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
async function main() {
  const u = await db.universite.findFirst({ where: { slug: "pstm" } });
  console.log(JSON.stringify({ coverUrl: u?.coverUrl, logoUrl: u?.logoUrl, galleryUrls: u?.galleryUrls }, null, 2));
  const sample = await db.universite.findMany({ take: 3, select: { slug: true, coverUrl: true } });
  console.log(sample);
}
main()
  .finally(() => db.$disconnect());
