import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import path from "path";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function stripHtml(html: string | undefined | null): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, "").trim() || null;
}

function parseGstRate(tax: string | undefined | null): number {
  if (!tax) return 18;
  const match = tax.match(/(\d+)/);
  return match ? parseInt(match[1]) : 18;
}

async function main() {
  console.log("Seeding database...");

  // --- Users ---
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@decibels.audio" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@decibels.audio",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Created admin user:", admin.email);

  const staffPassword = await bcrypt.hash("staff123", 12);
  const staff = await prisma.user.upsert({
    where: { email: "staff@decibels.audio" },
    update: {},
    create: {
      name: "Rajesh Kumar",
      email: "staff@decibels.audio",
      password: staffPassword,
      role: "STAFF",
    },
  });
  console.log("Created staff user:", staff.email);

  // --- Parse Excel ---
  const filePath = path.join(__dirname, "../resources/Products list.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);
  console.log(`Parsed ${rows.length} rows from Excel`);

  // --- Categories ---
  const categoryNames = [...new Set(rows.map((r) => r["CATEGORY"] as string).filter(Boolean))];
  const categoryMap = new Map<string, string>();
  let order = 1;
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, order: order++ },
    });
    categoryMap.set(name, cat.id);
  }
  console.log(`Created ${categoryMap.size} categories`);

  // --- SubCategories ---
  const subCatPairs = new Set<string>();
  const subCatMap = new Map<string, string>();
  for (const row of rows) {
    const cat = row["CATEGORY"] as string;
    const sub = row["SUB-CATEGORY"] != null ? String(row["SUB-CATEGORY"]) : null;
    if (cat && sub) {
      const key = `${cat}|||${sub}`;
      if (!subCatPairs.has(key)) {
        subCatPairs.add(key);
        const categoryId = categoryMap.get(cat)!;
        const subCat = await prisma.subCategory.create({
          data: { name: sub, categoryId },
        });
        subCatMap.set(key, subCat.id);
      }
    }
  }
  console.log(`Created ${subCatMap.size} sub-categories`);

  // --- Items ---
  let created = 0;
  for (const row of rows) {
    const categoryName = row["CATEGORY"] as string;
    if (!categoryName) continue;

    const categoryId = categoryMap.get(categoryName);
    if (!categoryId) continue;

    const subCatName = row["SUB-CATEGORY"] != null ? String(row["SUB-CATEGORY"]) : null;
    const subCategoryId = subCatName ? subCatMap.get(`${categoryName}|||${subCatName}`) ?? null : null;

    const sku = row["SKU (Leave blank to auto generate sku)"] as string;
    if (!sku) continue;

    const code = String(sku).padStart(4, "0");

    await prisma.item.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: (row["NAME"] as string) || "Unnamed",
        brand: (row["BRAND"] as string) || null,
        unit: (row["UNIT"] as string) || "Pc(s)",
        description: stripHtml(row["PRODUCT DESCRIPTION"] as string),
        imageUrl: (row["IMAGE"] as string) || null,
        gstRate: parseGstRate(row["APPLICABLE TAX"] as string),
        taxType: ((row["Selling Price Tax Type (inclusive or exclusive)"] as string) || "exclusive").toLowerCase(),
        unitPrice: (row["SELLING PRICE"] as number) || 0,
        purchasePrice: (row["PURCHASE PRICE (Excluding tax)"] as number) || null,
        purchasePriceInclTax: (row["PURCHASE PRICE (Including tax)"] as number) || null,
        profitMargin: (row["PROFIT MARGIN"] as number) ?? null,
        manageStock: row["MANAGE STOCK (1=yes 0=No)"] === 1,
        alertQuantity: (row["ALERT QUANTITY"] as number) || 0,
        categoryId,
        subCategoryId,
      },
    });
    created++;
  }
  console.log(`Created ${created} items`);

  // --- Sample Customers ---
  const customer1 = await prisma.customer.upsert({
    where: { id: "sample-customer-1" },
    update: {},
    create: {
      id: "sample-customer-1",
      name: "Vikram Sharma",
      mobile: "+91 98765 43210",
      email: "vikram.sharma@gmail.com",
      address: "42, JP Nagar 7th Phase, Mysuru 570006",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "sample-customer-2" },
    update: {},
    create: {
      id: "sample-customer-2",
      name: "Priya Reddy",
      mobile: "+91 87654 32109",
      email: "priya.reddy@outlook.com",
      address: "15, Vijayanagar 2nd Stage, Mysuru 570017",
    },
  });
  console.log("Created sample customers:", customer1.name, ",", customer2.name);

  console.log("\nSeed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin: admin@decibels.audio / admin123");
  console.log("  Staff: staff@decibels.audio / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
