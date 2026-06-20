import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding HSN code entries...\n");

  // Create categories
  const avEquipment = await prisma.category.upsert({
    where: { name: "AV Equipment" },
    update: {},
    create: { name: "AV Equipment", order: 11 },
  });
  console.log("Category:", avEquipment.name);

  const acousticProducts = await prisma.category.upsert({
    where: { name: "Acoustic Products" },
    update: {},
    create: { name: "Acoustic Products", order: 12 },
  });
  console.log("Category:", acousticProducts.name);

  const plywoodEnclosures = await prisma.category.upsert({
    where: { name: "Plywood & Enclosures" },
    update: {},
    create: { name: "Plywood & Enclosures", order: 13 },
  });
  console.log("Category:", plywoodEnclosures.name);

  const items = [
    // AV Equipment
    { code: "AV-001", name: "Raw Loudspeaker Drivers (without enclosures)", hsnCode: "85182900", gstRate: 18, categoryId: avEquipment.id, unitPrice: 0 },
    { code: "AV-002", name: "Single loudspeakers (mounted in enclosures)", hsnCode: "85182100", gstRate: 18, categoryId: avEquipment.id, unitPrice: 0 },
    { code: "AV-003", name: "Multiple loudspeakers (mounted in the same enclosure)", hsnCode: "85182200", gstRate: 18, categoryId: avEquipment.id, unitPrice: 0 },
    { code: "AV-004", name: "Audio-frequency electric amplifiers (Power amps, AVRs)", hsnCode: "85184000", gstRate: 18, categoryId: avEquipment.id, unitPrice: 0 },
    { code: "AV-005", name: "Parts of audio equipment (Crossover networks, terminals)", hsnCode: "85189000", gstRate: 18, categoryId: avEquipment.id, unitPrice: 0 },
    { code: "AV-006", name: "Video media players and reproducing apparatus", hsnCode: "85219090", gstRate: 18, categoryId: avEquipment.id, unitPrice: 0 },
    { code: "AV-007", name: "Home Cinema Projectors", hsnCode: "85286900", gstRate: 28, categoryId: avEquipment.id, unitPrice: 0 },
    { code: "AV-008", name: "Speaker wire, interconnects, and HDMI cables (< 1000V)", hsnCode: "85444299", gstRate: 18, categoryId: avEquipment.id, unitPrice: 0 },

    // Acoustic Products
    { code: "ACP-001", name: "Fiberglass / Glasswool Acoustic Panels (Fabric wrapped)", hsnCode: "70199090", gstRate: 18, categoryId: acousticProducts.id, unitPrice: 0 },
    { code: "ACP-002", name: "Polyurethane (PU) Acoustic Foam Panels / Melamine foam", hsnCode: "39211310", gstRate: 18, categoryId: acousticProducts.id, unitPrice: 0 },
    { code: "ACP-003", name: "Polyester Fiber (PET) Acoustic Panels", hsnCode: "56039490", gstRate: 18, categoryId: acousticProducts.id, unitPrice: 0 },
    { code: "ACP-004", name: "Mass Loaded Vinyl (MLV) / Sound isolation mats", hsnCode: "39269099", gstRate: 18, categoryId: acousticProducts.id, unitPrice: 0 },
    { code: "ACP-005", name: "Grooved/Perforated MDF Acoustic Panels & Wood Diffusers", hsnCode: "44101190", gstRate: 18, categoryId: acousticProducts.id, unitPrice: 0 },

    // Plywood & Enclosures
    { code: "PLY-001", name: "Standard Plywood (used for risers, theater framing)", hsnCode: "44123990", gstRate: 18, categoryId: plywoodEnclosures.id, unitPrice: 0 },
    { code: "PLY-002", name: "Marine Grade Plywood", hsnCode: "44123330", gstRate: 18, categoryId: plywoodEnclosures.id, unitPrice: 0 },
    { code: "PLY-003", name: "Medium Density Fibreboard (MDF) (for speaker cabinets)", hsnCode: "44101130", gstRate: 18, categoryId: plywoodEnclosures.id, unitPrice: 0 },
    { code: "PLY-004", name: "Blockboard and Flush Doors (Theater isolation doors)", hsnCode: "44129990", gstRate: 18, categoryId: plywoodEnclosures.id, unitPrice: 0 },
    { code: "PLY-005", name: "Wood Veneer Sheets (for finishing speaker enclosures)", hsnCode: "44089090", gstRate: 18, categoryId: plywoodEnclosures.id, unitPrice: 0 },
  ];

  let created = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = await prisma.item.findUnique({ where: { code: item.code } });
    if (existing) {
      // Update HSN code and GST rate on existing item
      await prisma.item.update({
        where: { code: item.code },
        data: { hsnCode: item.hsnCode, gstRate: item.gstRate },
      });
      skipped++;
      continue;
    }
    await prisma.item.create({ data: item });
    created++;
  }

  console.log(`\nDone! Created ${created} items, updated ${skipped} existing items.`);
  console.log("Categories: AV Equipment, Acoustic Products, Plywood & Enclosures");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
