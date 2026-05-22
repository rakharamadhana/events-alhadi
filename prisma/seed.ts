// =============================================================================
// prisma/seed.ts — Database Seed Script
// =============================================================================
// Creates an initial admin user and a sample event with seats.
// Run with: npm run db:seed
// =============================================================================

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient({});

async function main() {
  console.log("🌱 Seeding database...\n");

  // -------------------------------------------------------------------------
  // 1. Create Admin User
  // -------------------------------------------------------------------------
  const adminPassword = await hash("123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash: adminPassword,
      status: "APPROVED",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // -------------------------------------------------------------------------
  // 2. Create a Sample Approved User
  // -------------------------------------------------------------------------
  const userPassword = await hash("123456", 12);
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      name: "Test User",
      email: "user@example.com",
      passwordHash: userPassword,
      status: "APPROVED",
      role: "USER",
    },
  });
  console.log(`✅ Test user created: ${user.email}`);

  // -------------------------------------------------------------------------
  // 3. Create a Sample Event
  // -------------------------------------------------------------------------
  const event = await prisma.event.upsert({
    where: { id: "sample-event-001" },
    update: {
      titleZhTw: "Al-Hadi 2026 慈善晚宴",
      descriptionZhTw:
        "誠邀您參加一場凝聚社群、共享喜悅與善行的夜晚。這場年度活動將邀請家庭與支持者一同參與晚宴、節目與募款，支持 Al-Hadi 的教育與社群服務。",
      venueZhTw: "城市會議中心大宴會廳",
    },
    create: {
      id: "sample-event-001",
      title: "Al-Hadi Grand Charity Gala 2026",
      titleZhTw: "Al-Hadi 2026 慈善晚宴",
      description:
        "Join us for an evening of community, celebration, and generosity. " +
        "This flagship event brings together families and supporters for an " +
        "unforgettable night of entertainment, fine dining, and fundraising.",
      descriptionZhTw:
        "誠邀您參加一場凝聚社群、共享喜悅與善行的夜晚。這場年度活動將邀請家庭與支持者一同參與晚宴、節目與募款，支持 Al-Hadi 的教育與社群服務。",
      venue: "Grand Ballroom, City Convention Center",
      venueZhTw: "城市會議中心大宴會廳",
      date: new Date("2026-07-15T19:00:00Z"),
      isActive: true,
      currency: "NTD",
    },
  });
  console.log(`✅ Event created: ${event.title}`);

  // -------------------------------------------------------------------------
  // 4. Generate Curved Theater Seats from Blueprint
  // -------------------------------------------------------------------------
  const THEATER_BLUEPRINT = `1: _ _ _ _ _ _ _ _ _ [1-22,300] [1-20,300] [1-18,300] _ [♿-1-14,400] _ _ [1-10,400] [1-8,400] [1-6,400] [1-4,400] [1-2,400] [1-1,400] [1-3,400] [1-5,400] [1-7,400] [1-9,400] _ [♿-1-28,400] _ _ [1-17,300] [1-19,300] [1-21,300] _ _ _ _ _ _ _ _ _
2: _ _ _ _ _ _ _ _ [2-20,300] [2-18,300] [2-16,300] [2-14,300] _ _ _ [2-12,400] [2-10,400] [2-8,400] [2-6,400] [2-4,400] [2-2,400] [2-1,400] [2-3,400] [2-5,400] [2-7,400] [2-9,400] [2-11,400] _ _ _ [2-13,300] [2-15,300] [2-17,300] [2-19,300] _ _ _ _ _ _ _ _
3: _ _ _ [3-28,300] [3-26,300] [3-24,300] [3-22,300] [3-20,300] [3-18,300] [3-16,300] [3-14,300] [3-12,300] _ _ _ _ [3-10,400] [3-8,400] [3-6,400] [3-4,400] [3-2,400] [3-1,400] [3-3,400] [3-5,400] [3-7,400] [3-9,400] [3-11,400] _ _ _ [3-13,300] [3-15,300] [3-17,300] [3-19,300] [3-21,300] [3-23,300] [3-25,300] [3-27,300] [3-29,300] _ _ _
4: _ _ _ [4-30,300] [4-28,300] [4-26,300] [4-24,300] [4-22,300] [4-20,300] [4-18,300] [4-16,300] [4-14,300] _ _ _ [4-12,400] [4-10,400] [4-8,400] [4-6,400] [4-4,400] [4-2,400] [4-1,400] [4-3,400] [4-5,400] [4-7,400] [4-9,400] [4-11,400] _ _ _ [4-13,300] [4-15,300] [4-17,300] [4-19,300] [4-21,300] [4-23,300] [4-25,300] [4-27,300] [4-29,300] _ _ _
5: _ _ [5-30,300] [5-28,300] [5-26,300] [5-24,300] [5-22,300] [5-20,300] [5-18,300] [5-16,300] [5-14,300] [5-12,300] _ _ _ _ [5-10,400] [5-8,400] [5-6,400] [5-4,400] [5-2,400] [5-1,400] [5-3,405] [5-5,400] [5-7,400] [5-9,400] [5-11,400] _ _ _ [5-13,300] [5-15,300] [5-17,300] [5-19,300] [5-21,300] [5-23,300] [5-25,300] [5-27,300] [5-29,300] [5-31,300] [5-33,300] _
6: _ _ [6-32,300] [6-30,300] [6-28,300] [6-26,300] [6-24,300] [6-22,300] [6-20,300] [6-18,300] [6-16,300] [6-14,300] _ _ _ [6-12,400] [6-10,400] [6-8,400] [6-6,400] [6-4,400] [6-2,400] [6-1,400] [6-3,400] [6-5,400] [6-7,400] [6-9,400] [6-11,400] _ _ _ [6-13,300] [6-15,300] [6-17,300] [6-19,300] [6-21,300] [6-23,300] [6-25,300] [6-27,300] [6-29,300] [6-31,300] _ _
7: _ _ [7-30,300] [7-28,300] [7-26,300] [7-24,300] [7-22,300] [7-20,300] [7-18,300] [7-16,300] [7-14,300] [7-12,300] _ _ _ _ [7-10,400] [7-8,400] [7-6,400] [7-4,400] [7-2,400] [7-1,400] [7-3,400] [7-5,400] [7-7,400] [7-9,400] [7-11,400] _ _ _ [7-13,300] [7-15,300] [7-17,300] [7-19,300] [7-21,300] [7-23,300] [7-25,300] [7-27,300] [7-29,300] [7-31,300] _ _
8: _ _ [8-32,300] [8-30,300] [8-28,300] [8-26,300] [8-24,300] [8-22,300] [8-20,300] [8-18,300] [8-16,300] [8-14,300] _ _ _ [8-12,400] [8-10,400] [8-8,400] [8-6,400] [8-4,400] [8-2,400] [8-1,400] [8-3,400] [8-5,400] [8-7,400] [8-9,400] [8-11,400] _ _ _ [8-13,300] [8-15,300] [8-17,300] [8-19,300] [8-21,300] [8-23,300] [8-25,300] [8-27,300] [8-29,300] [8-31,300] _ _
9: _ [9-32,300] [9-30,300] [9-28,300] [9-26,300] [9-24,300] [9-22,300] [9-20,300] [9-18,300] [9-16,300] [9-14,300] [9-12,300] _ _ _ _ [9-10,400] [9-8,400] [9-6,400] [9-4,400] [9-2,400] [9-1,400] [9-3,400] [9-5,400] [9-7,400] [9-9,400] [9-11,400] _ _ _ [9-13,300] [9-15,300] [9-17,300] [9-19,300] [9-21,300] [9-23,300] [9-25,300] [9-27,300] [9-29,300] [9-31,300] [9-33,300] [9-35,300]
10: [10-28,300] [10-26,300] [10-24,300] [10-22,300] [10-20,300] [10-18,300] [10-16,300] [10-14,300] [10-12,300] [10-10,300] [10-8,300] [10-6,300] _ _ _ _ _ [10-4,400] [10-2,400] _ _ _ _ [10-1,400] [10-3,400] _ _ _ _ _ [10-5,300] [10-7,300] [10-9,300] [10-11,300] [10-13,300] [10-15,300] [10-17,300] [10-19,300] [10-21,300] [10-23,300] [10-25,300] [10-27,300]
11: _ _ [11-20,300] [11-18,300] [11-16,300] [11-14,300] [11-12,300] [11-10,300] [11-8,300] [11-6,300] [11-4,300] [11-2,300] _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ [11-1,300] [11-3,300] [11-5,300] [11-7,300] [11-9,300] [11-11,300] [11-13,300] [11-15,300] [11-17,300] [11-19,300] _ _`;

  const lines = THEATER_BLUEPRINT.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const seatsToCreate: Array<{
    eventId: string;
    label: string;
    row: string;
    number: number;
    price: number;
    status: "AVAILABLE";
  }> = [];

  lines.forEach((line, rowIndex) => {
    let rowLabel = "";
    let tokensString = line;
    const colonIndex = line.indexOf(":");

    if (colonIndex !== -1) {
      rowLabel = line.substring(0, colonIndex).trim();
      tokensString = line.substring(colonIndex + 1).trim();
    } else {
      rowLabel = String(rowIndex + 1);
    }

    const tokenRegex = /\[([^\]]+)\]|(_)|(♿)/g;
    let match;
    let colIndex = 1;

    while ((match = tokenRegex.exec(tokensString)) !== null) {
      if (match[2] === "_") {
        colIndex++;
      } else if (match[3] === "♿") {
        seatsToCreate.push({
          eventId: event.id,
          label: `♿-${rowLabel}-${colIndex}`,
          row: rowLabel,
          number: colIndex,
          price: 400, // Wheelchair price is center-tier: 400 NTD
          status: "AVAILABLE",
        });
        colIndex++;
      } else if (match[1]) {
        const parts = match[1].split(",");
        const seatLabel = parts[0].trim();
        const price = parts[1] ? parseFloat(parts[1]) : 300;

        seatsToCreate.push({
          eventId: event.id,
          label: seatLabel,
          row: rowLabel,
          number: colIndex,
          price,
          status: "AVAILABLE",
        });
        colIndex++;
      }
    }
  });

  // Delete any existing seats for this event before bulk seeding
  await prisma.seat.deleteMany({
    where: { eventId: event.id },
  });

  // Create the seats inside a transaction
  await prisma.seat.createMany({
    data: seatsToCreate,
  });

  let seatCount = seatsToCreate.length;
  console.log(`✅ ${seatCount} seats generated for event "${event.title}"`);

  console.log("\n🎉 Seed complete!");
  console.log("   Admin login: admin@example.com / 123456");
  console.log("   User login:  user@example.com / 123456");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
