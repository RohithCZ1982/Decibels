import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const notes = await prisma.projectNote.deleteMany({});
  console.log("Deleted", notes.count, "project notes");

  const payments = await prisma.payment.deleteMany({});
  console.log("Deleted", payments.count, "payments");

  const qItems = await prisma.quotationItem.deleteMany({});
  console.log("Deleted", qItems.count, "quotation items");

  const quotations = await prisma.quotation.deleteMany({});
  console.log("Deleted", quotations.count, "quotations");

  const tItems = await prisma.templateItem.deleteMany({});
  console.log("Deleted", tItems.count, "template items");

  const templates = await prisma.template.deleteMany({});
  console.log("Deleted", templates.count, "templates");

  const items = await prisma.item.deleteMany({});
  console.log("Deleted", items.count, "items");

  const subCategories = await prisma.subCategory.deleteMany({});
  console.log("Deleted", subCategories.count, "sub-categories");

  const categories = await prisma.category.deleteMany({});
  console.log("Deleted", categories.count, "categories");

  console.log("\nAll cleared!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
