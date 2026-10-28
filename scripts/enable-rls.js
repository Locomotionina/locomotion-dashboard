const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Enforcing Row Level Security (RLS) on all public tables in Supabase...");

  const tables = [
    "User",
    "Project",
    "ProjectDeliverable",
    "Task",
    "TaskRevision",
    "Notification",
    "ProfileUpdateRequest",
    "PasswordResetRequest",
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ RLS enabled: "${table}"`);
    } catch (err) {
      console.error(`❌ Failed enabling RLS on "${table}":`, err.message);
    }
  }

  const result = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);

  console.log("\nCurrent Table Security Status:");
  console.table(result);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
