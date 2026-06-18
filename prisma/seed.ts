import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

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

  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: "Speakers" }, update: {}, create: { name: "Speakers", order: 1 } }),
    prisma.category.upsert({ where: { name: "Subwoofers" }, update: {}, create: { name: "Subwoofers", order: 2 } }),
    prisma.category.upsert({ where: { name: "Projectors" }, update: {}, create: { name: "Projectors", order: 3 } }),
    prisma.category.upsert({ where: { name: "Screens" }, update: {}, create: { name: "Screens", order: 4 } }),
    prisma.category.upsert({ where: { name: "AV Receivers" }, update: {}, create: { name: "AV Receivers", order: 5 } }),
    prisma.category.upsert({ where: { name: "Acoustics" }, update: {}, create: { name: "Acoustics", order: 6 } }),
    prisma.category.upsert({ where: { name: "Seating" }, update: {}, create: { name: "Seating", order: 7 } }),
    prisma.category.upsert({ where: { name: "Automation" }, update: {}, create: { name: "Automation", order: 8 } }),
    prisma.category.upsert({ where: { name: "Wiring & Cables" }, update: {}, create: { name: "Wiring & Cables", order: 9 } }),
    prisma.category.upsert({ where: { name: "Labor & Installation" }, update: {}, create: { name: "Labor & Installation", order: 10 } }),
  ]);
  console.log("Created", categories.length, "categories");

  const items = [
    { code: "SPK-001", name: "JBL Synthesis SCL-3", unitPrice: 85000, categoryName: "Speakers", supplier: "Harman International", description: "In-wall LCR speaker with 2x 8\" woofers" },
    { code: "SPK-002", name: "JBL Synthesis SCL-2", unitPrice: 65000, categoryName: "Speakers", supplier: "Harman International", description: "In-wall surround speaker" },
    { code: "SPK-003", name: "KEF Ci160ER", unitPrice: 35000, categoryName: "Speakers", supplier: "KEF Audio", description: "In-ceiling Atmos speaker" },
    { code: "SPK-004", name: "Sonance VP66R", unitPrice: 28000, categoryName: "Speakers", supplier: "Sonance", description: "In-ceiling round speaker pair" },
    { code: "SPK-005", name: "Bowers & Wilkins CWM7.3 S2", unitPrice: 120000, categoryName: "Speakers", supplier: "B&W Group", description: "Premium in-wall speaker" },
    { code: "SUB-001", name: "JBL Synthesis SSW-1", unitPrice: 250000, categoryName: "Subwoofers", supplier: "Harman International", description: "Dual 15\" in-wall subwoofer" },
    { code: "SUB-002", name: "SVS SB-4000", unitPrice: 145000, categoryName: "Subwoofers", supplier: "SVS Audio", description: "13.5\" sealed subwoofer" },
    { code: "SUB-003", name: "REL S/510", unitPrice: 180000, categoryName: "Subwoofers", supplier: "REL Acoustics", description: "10\" reference subwoofer" },
    { code: "PRJ-001", name: "Sony VPL-XW7000ES", unitPrice: 1500000, categoryName: "Projectors", supplier: "Sony India", description: "Native 4K SXRD laser projector" },
    { code: "PRJ-002", name: "JVC DLA-NZ8", unitPrice: 850000, categoryName: "Projectors", supplier: "JVC India", description: "8K e-Shift D-ILA projector" },
    { code: "PRJ-003", name: "Epson EH-LS12000B", unitPrice: 450000, categoryName: "Projectors", supplier: "Epson India", description: "4K laser projector" },
    { code: "SCR-001", name: "Stewart Filmscreen 120\" AT", unitPrice: 350000, categoryName: "Screens", supplier: "Stewart Filmscreen", description: "120\" acoustically transparent fixed frame" },
    { code: "SCR-002", name: "Screen Innovations 110\" AT", unitPrice: 250000, categoryName: "Screens", supplier: "Screen Innovations", description: "110\" acoustically transparent" },
    { code: "SCR-003", name: "Elite Screens 100\" Fixed", unitPrice: 45000, categoryName: "Screens", supplier: "Elite Screens India", description: "100\" fixed frame screen" },
    { code: "AVR-001", name: "Denon AVC-X8500HA", unitPrice: 600000, categoryName: "AV Receivers", supplier: "Denon India", description: "13.2ch 8K AV Amplifier" },
    { code: "AVR-002", name: "Marantz SR8015", unitPrice: 350000, categoryName: "AV Receivers", supplier: "Marantz", description: "11.2ch 8K AV Receiver" },
    { code: "AVR-003", name: "Denon AVR-X3800H", unitPrice: 180000, categoryName: "AV Receivers", supplier: "Denon India", description: "9.4ch 8K AV Receiver" },
    { code: "ACU-001", name: "Acoustic Panel Set (Room)", unitPrice: 85000, categoryName: "Acoustics", supplier: "Decibels Audio", description: "Custom acoustic treatment package per room" },
    { code: "ACU-002", name: "Bass Trap Set (4 corners)", unitPrice: 35000, categoryName: "Acoustics", supplier: "Decibels Audio", description: "Corner bass traps set of 4" },
    { code: "ACU-003", name: "Acoustic Fabric Walls", unitPrice: 120000, categoryName: "Acoustics", supplier: "Decibels Audio", description: "Full room fabric wall treatment" },
    { code: "ACU-004", name: "Star Ceiling Panel", unitPrice: 75000, categoryName: "Acoustics", supplier: "Decibels Audio", description: "Fiber optic star ceiling with acoustic backing" },
    { code: "SET-001", name: "Recliner Seat (Premium)", unitPrice: 95000, categoryName: "Seating", supplier: "Fortress Seating", description: "Premium leather power recliner with cup holders" },
    { code: "SET-002", name: "Recliner Seat (Standard)", unitPrice: 55000, categoryName: "Seating", supplier: "Octane Seating", description: "Standard theater recliner" },
    { code: "AUT-001", name: "Control4 EA-3 System", unitPrice: 180000, categoryName: "Automation", supplier: "Control4 India", description: "Home automation controller" },
    { code: "AUT-002", name: "Lutron Caseta Lighting Kit", unitPrice: 45000, categoryName: "Automation", supplier: "Lutron India", description: "Smart lighting control package" },
    { code: "AUT-003", name: "Universal Remote MX-990", unitPrice: 85000, categoryName: "Automation", supplier: "URC", description: "Premium universal remote" },
    { code: "WIR-001", name: "Speaker Cable Package", unitPrice: 25000, categoryName: "Wiring & Cables", supplier: "AudioQuest", description: "Complete speaker wiring for standard room" },
    { code: "WIR-002", name: "HDMI 2.1 Cable Set", unitPrice: 15000, categoryName: "Wiring & Cables", supplier: "AudioQuest", description: "Set of 3 certified HDMI 2.1 cables" },
    { code: "WIR-003", name: "Conduit & Cable Management", unitPrice: 18000, categoryName: "Wiring & Cables", supplier: "Decibels Audio", description: "Complete conduit and cable routing" },
    { code: "LAB-001", name: "Basic Installation", unitPrice: 50000, categoryName: "Labor & Installation", supplier: "Decibels Audio", description: "Standard room installation labor" },
    { code: "LAB-002", name: "Premium Installation", unitPrice: 120000, categoryName: "Labor & Installation", supplier: "Decibels Audio", description: "Premium installation with custom work" },
    { code: "LAB-003", name: "Acoustic Design & Calibration", unitPrice: 35000, categoryName: "Labor & Installation", supplier: "Decibels Audio", description: "Room acoustic design and system calibration" },
  ];

  for (const item of items) {
    const cat = categories.find((c) => c.name === item.categoryName);
    if (!cat) continue;
    await prisma.item.upsert({
      where: { code: item.code },
      update: {},
      create: {
        code: item.code,
        name: item.name,
        unitPrice: item.unitPrice,
        categoryId: cat.id,
        supplier: item.supplier,
        description: item.description,
      },
    });
  }
  console.log("Created", items.length, "items");

  const allItems = await prisma.item.findMany();
  const getItem = (code: string) => allItems.find((i) => i.code === code);

  const basic51 = await prisma.template.upsert({
    where: { name: "Basic 5.1 Home Theater" },
    update: {},
    create: {
      name: "Basic 5.1 Home Theater",
      description: "Entry-level 5.1 surround sound home theater setup with quality equipment",
      items: {
        create: [
          { itemId: getItem("SPK-004")!.id, quantity: 3 },
          { itemId: getItem("SPK-002")!.id, quantity: 2 },
          { itemId: getItem("SUB-002")!.id, quantity: 1 },
          { itemId: getItem("PRJ-003")!.id, quantity: 1 },
          { itemId: getItem("SCR-003")!.id, quantity: 1 },
          { itemId: getItem("AVR-003")!.id, quantity: 1 },
          { itemId: getItem("ACU-001")!.id, quantity: 1 },
          { itemId: getItem("WIR-001")!.id, quantity: 1 },
          { itemId: getItem("WIR-002")!.id, quantity: 1 },
          { itemId: getItem("LAB-001")!.id, quantity: 1 },
        ],
      },
    },
  });

  const premium724 = await prisma.template.upsert({
    where: { name: "Premium 7.2.4 Dolby Atmos Setup" },
    update: {},
    create: {
      name: "Premium 7.2.4 Dolby Atmos Setup",
      description: "Full Dolby Atmos experience with premium equipment and acoustic treatment",
      items: {
        create: [
          { itemId: getItem("SPK-001")!.id, quantity: 3 },
          { itemId: getItem("SPK-002")!.id, quantity: 4 },
          { itemId: getItem("SPK-003")!.id, quantity: 4 },
          { itemId: getItem("SUB-001")!.id, quantity: 2 },
          { itemId: getItem("PRJ-002")!.id, quantity: 1 },
          { itemId: getItem("SCR-001")!.id, quantity: 1 },
          { itemId: getItem("AVR-001")!.id, quantity: 1 },
          { itemId: getItem("ACU-001")!.id, quantity: 1 },
          { itemId: getItem("ACU-002")!.id, quantity: 1 },
          { itemId: getItem("ACU-003")!.id, quantity: 1 },
          { itemId: getItem("ACU-004")!.id, quantity: 1 },
          { itemId: getItem("SET-001")!.id, quantity: 6 },
          { itemId: getItem("AUT-001")!.id, quantity: 1 },
          { itemId: getItem("AUT-002")!.id, quantity: 1 },
          { itemId: getItem("WIR-001")!.id, quantity: 2 },
          { itemId: getItem("WIR-002")!.id, quantity: 1 },
          { itemId: getItem("WIR-003")!.id, quantity: 1 },
          { itemId: getItem("LAB-002")!.id, quantity: 1 },
          { itemId: getItem("LAB-003")!.id, quantity: 1 },
        ],
      },
    },
  });

  const mediaRoom = await prisma.template.upsert({
    where: { name: "Media Room with Acoustics" },
    update: {},
    create: {
      name: "Media Room with Acoustics",
      description: "Multi-purpose media room with proper acoustic treatment and automation",
      items: {
        create: [
          { itemId: getItem("SPK-005")!.id, quantity: 3 },
          { itemId: getItem("SPK-002")!.id, quantity: 2 },
          { itemId: getItem("SPK-003")!.id, quantity: 2 },
          { itemId: getItem("SUB-003")!.id, quantity: 1 },
          { itemId: getItem("PRJ-001")!.id, quantity: 1 },
          { itemId: getItem("SCR-002")!.id, quantity: 1 },
          { itemId: getItem("AVR-002")!.id, quantity: 1 },
          { itemId: getItem("ACU-001")!.id, quantity: 1 },
          { itemId: getItem("ACU-004")!.id, quantity: 1 },
          { itemId: getItem("SET-002")!.id, quantity: 4 },
          { itemId: getItem("AUT-002")!.id, quantity: 1 },
          { itemId: getItem("AUT-003")!.id, quantity: 1 },
          { itemId: getItem("WIR-001")!.id, quantity: 1 },
          { itemId: getItem("WIR-002")!.id, quantity: 1 },
          { itemId: getItem("LAB-002")!.id, quantity: 1 },
          { itemId: getItem("LAB-003")!.id, quantity: 1 },
        ],
      },
    },
  });

  console.log("Created templates:", basic51.name, ",", premium724.name, ",", mediaRoom.name);

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
