import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding categories and items...\n");

  const avEquipment = await prisma.category.upsert({
    where: { name: "AV Equipment" },
    update: {},
    create: { name: "AV Equipment", order: 1 },
  });

  const acousticProducts = await prisma.category.upsert({
    where: { name: "Acoustic Products" },
    update: {},
    create: { name: "Acoustic Products", order: 2 },
  });

  const plywoodEnclosures = await prisma.category.upsert({
    where: { name: "Plywood & Enclosures" },
    update: {},
    create: { name: "Plywood & Enclosures", order: 3 },
  });

  console.log("Categories:", avEquipment.name, "|", acousticProducts.name, "|", plywoodEnclosures.name);

  const items = [
    // AV Equipment
    { code: "AV-001", name: "Raw Loudspeaker Drivers (without enclosures)", hsnCode: "85182900", gstRate: 18, unitPrice: 15000, categoryId: avEquipment.id },
    { code: "AV-002", name: "Single loudspeakers (mounted in enclosures)", hsnCode: "85182100", gstRate: 18, unitPrice: 45000, categoryId: avEquipment.id },
    { code: "AV-003", name: "Multiple loudspeakers (mounted in the same enclosure)", hsnCode: "85182200", gstRate: 18, unitPrice: 120000, categoryId: avEquipment.id },
    { code: "AV-004", name: "Audio-frequency electric amplifiers (Power amps, AVRs)", hsnCode: "85184000", gstRate: 18, unitPrice: 150000, categoryId: avEquipment.id },
    { code: "AV-005", name: "Parts of audio equipment (Crossover networks, terminals)", hsnCode: "85189000", gstRate: 18, unitPrice: 5000, categoryId: avEquipment.id },
    { code: "AV-006", name: "Video media players and reproducing apparatus", hsnCode: "85219090", gstRate: 18, unitPrice: 20000, categoryId: avEquipment.id },
    { code: "AV-007", name: "Home Cinema Projectors", hsnCode: "85286900", gstRate: 28, unitPrice: 250000, categoryId: avEquipment.id },
    { code: "AV-008", name: "Speaker wire, interconnects, and HDMI cables (<1000V)", hsnCode: "85444299", gstRate: 18, unitPrice: 2500, categoryId: avEquipment.id },

    // Acoustic Products
    { code: "ACP-001", name: "Fiberglass / Glasswool Acoustic Panels (Fabric wrapped)", hsnCode: "70199090", gstRate: 18, unitPrice: 4000, categoryId: acousticProducts.id },
    { code: "ACP-002", name: "PU Acoustic Foam Panels / Melamine Foam", hsnCode: "39211310", gstRate: 18, unitPrice: 95, categoryId: acousticProducts.id },
    { code: "ACP-003", name: "Polyester Fiber (PET) Acoustic Panels", hsnCode: "56039490", gstRate: 18, unitPrice: 275, categoryId: acousticProducts.id },
    { code: "ACP-004", name: "Mass Loaded Vinyl (MLV) / Sound Isolation Mats", hsnCode: "39269099", gstRate: 18, unitPrice: 200, categoryId: acousticProducts.id },
    { code: "ACP-005", name: "Grooved/Perforated MDF Acoustic Panels & Wood Diffusers", hsnCode: "44101190", gstRate: 18, unitPrice: 475, categoryId: acousticProducts.id },

    // Plywood & Enclosures
    { code: "PLY-001", name: "Standard Plywood (theater framing, risers)", hsnCode: "44123990", gstRate: 18, unitPrice: 2500, categoryId: plywoodEnclosures.id },
    { code: "PLY-002", name: "Marine Grade Plywood", hsnCode: "44123330", gstRate: 18, unitPrice: 5250, categoryId: plywoodEnclosures.id },
    { code: "PLY-003", name: "MDF (speaker cabinets)", hsnCode: "44101130", gstRate: 18, unitPrice: 1850, categoryId: plywoodEnclosures.id },
    { code: "PLY-004", name: "Blockboard and Flush Doors", hsnCode: "44129990", gstRate: 18, unitPrice: 5000, categoryId: plywoodEnclosures.id },
    { code: "PLY-005", name: "Wood Veneer Sheets", hsnCode: "44089090", gstRate: 18, unitPrice: 175, categoryId: plywoodEnclosures.id },
  ];

  let created = 0;
  for (const item of items) {
    const existing = await prisma.item.findUnique({ where: { code: item.code } });
    if (existing) {
      await prisma.item.update({ where: { code: item.code }, data: { hsnCode: item.hsnCode, gstRate: item.gstRate, unitPrice: item.unitPrice, name: item.name } });
      console.log("  Updated:", item.code, item.name);
    } else {
      await prisma.item.create({ data: item });
      console.log("  Created:", item.code, item.name);
      created++;
    }
  }

  console.log(`\nDone! ${created} items created, ${items.length - created} updated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
