import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Pre-seeding special management accounts (KOMISARIS & CEO)...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // 1. Pre-seeded Special Management Account: KOMISARIS (No department)
  const komisaris = await prisma.user.upsert({
    where: { username: "komisaris" },
    update: {
      name: "KOMISARIS",
      role: "MANAGEMENT",
      position: "KOMISARIS",
      department: "N/A",
      isApproved: true,
      isSuspended: false,
    },
    create: {
      name: "KOMISARIS",
      username: "komisaris",
      email: "komisaris@locomotion.agency",
      password: hashedPassword,
      role: "MANAGEMENT",
      position: "KOMISARIS",
      department: "N/A",
      isApproved: true,
      isSuspended: false,
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=KOMISARIS&backgroundColor=7c3aed",
      bio: "Dewan Komisaris Locomotion Agency",
    },
  });

  // 2. Pre-seeded Special Management Account: CEO (No department)
  const ceo = await prisma.user.upsert({
    where: { username: "ceo" },
    update: {
      name: "CEO",
      role: "MANAGEMENT",
      position: "CEO",
      department: "N/A",
      isApproved: true,
      isSuspended: false,
    },
    create: {
      name: "CEO",
      username: "ceo",
      email: "ceo@locomotion.agency",
      password: hashedPassword,
      role: "MANAGEMENT",
      position: "CEO",
      department: "N/A",
      isApproved: true,
      isSuspended: false,
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=CEO&backgroundColor=6366f1",
      bio: "Chief Executive Officer Locomotion Agency",
    },
  });

  console.log(`✅ Pre-seeded special management accounts complete:`);
  console.log(`   - MANAGEMENT (KOMISARIS): @${komisaris.username} (${komisaris.position}, Dept: ${komisaris.department})`);
  console.log(`   - MANAGEMENT (CEO): @${ceo.username} (${ceo.position}, Dept: ${ceo.department})`);
  console.log(`   - Default Password: admin123`);
  console.log(`ℹ️ Note: HRGA account was NOT overwritten/re-created per instructions.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
