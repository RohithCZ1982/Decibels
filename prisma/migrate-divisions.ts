import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Migrating divisions...");

  const htDiv = await prisma.division.upsert({
    where: { slug: "HOME_THEATER" },
    update: {},
    create: { name: "Home Theater", slug: "HOME_THEATER", order: 1 },
  });
  console.log(`Division: ${htDiv.name} (${htDiv.id})`);

  const acDiv = await prisma.division.upsert({
    where: { slug: "ACOUSTICS" },
    update: {},
    create: { name: "Acoustics", slug: "ACOUSTICS", order: 2 },
  });
  console.log(`Division: ${acDiv.name} (${acDiv.id})`);

  const slugToId = new Map<string, string>();
  slugToId.set("HOME_THEATER", htDiv.id);
  slugToId.set("ACOUSTICS", acDiv.id);

  // Migrate Categories
  for (const [slug, divId] of slugToId) {
    const result = await prisma.category.updateMany({
      where: { division: slug, divisionId: null },
      data: { divisionId: divId },
    });
    console.log(`Categories: ${result.count} rows updated for ${slug}`);
  }

  // Migrate Items
  for (const [slug, divId] of slugToId) {
    const result = await prisma.item.updateMany({
      where: { division: slug, divisionId: null },
      data: { divisionId: divId },
    });
    console.log(`Items: ${result.count} rows updated for ${slug}`);
  }

  // Migrate QuotationItems
  for (const [slug, divId] of slugToId) {
    const result = await prisma.quotationItem.updateMany({
      where: { division: slug, divisionId: null },
      data: { divisionId: divId },
    });
    console.log(`QuotationItems: ${result.count} rows updated for ${slug}`);
  }

  // Verify no NULLs remain
  const nullCats = await prisma.category.count({ where: { divisionId: null } });
  const nullItems = await prisma.item.count({ where: { divisionId: null } });
  const nullQItems = await prisma.quotationItem.count({ where: { divisionId: null } });

  console.log(`\nVerification — NULL divisionId counts:`);
  console.log(`  Categories: ${nullCats}`);
  console.log(`  Items: ${nullItems}`);
  console.log(`  QuotationItems: ${nullQItems}`);

  if (nullCats + nullItems + nullQItems > 0) {
    console.error("WARNING: Some rows still have NULL divisionId!");
  } else {
    console.log("All rows migrated successfully. Safe to make divisionId required.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
