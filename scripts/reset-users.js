const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function resetUsers() {
  console.log("Starting user reset...");

  const defaultPassword = await bcrypt.hash("admin123", 10);

  // 1. Upsert Maulana as Project Manager (Admin)
  // First check if old admin or maulana exists
  let maulana = await prisma.user.findFirst({
    where: {
      OR: [{ username: "maulana" }, { username: "admin" }],
    },
  });

  if (maulana) {
    maulana = await prisma.user.update({
      where: { id: maulana.id },
      data: {
        name: "Maulana",
        username: "maulana",
        email: "maulana@locomotion.agency",
        department: "Project Management",
        position: "Project Manager",
        role: "MANAGEMENT",
        isApproved: true,
        password: defaultPassword,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Maulana&backgroundColor=263bb8`,
      },
    });
    console.log("Updated Maulana:", maulana.username);
  } else {
    maulana = await prisma.user.create({
      data: {
        name: "Maulana",
        username: "maulana",
        email: "maulana@locomotion.agency",
        department: "Project Management",
        position: "Project Manager",
        role: "MANAGEMENT",
        isApproved: true,
        password: defaultPassword,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Maulana&backgroundColor=263bb8`,
      },
    });
    console.log("Created Maulana:", maulana.username);
  }

  // 2. Upsert Budi AV
  let budi = await prisma.user.findUnique({
    where: { username: "budi.av" },
  });

  if (budi) {
    budi = await prisma.user.update({
      where: { id: budi.id },
      data: {
        name: "Budi Santoso",
        username: "budi.av",
        email: "budi@locomotion.agency",
        department: "Creative",
        position: "Audio Visual",
        role: "STAFF",
        isApproved: true,
        password: defaultPassword,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Budi%20Santoso&backgroundColor=0284c7`,
      },
    });
    console.log("Updated Budi AV:", budi.username);
  } else {
    budi = await prisma.user.create({
      data: {
        name: "Budi Santoso",
        username: "budi.av",
        email: "budi@locomotion.agency",
        department: "Creative",
        position: "Audio Visual",
        role: "STAFF",
        isApproved: true,
        password: defaultPassword,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Budi%20Santoso&backgroundColor=0284c7`,
      },
    });
    console.log("Created Budi AV:", budi.username);
  }

  // 3. Reassign existing tasks to Budi and set createdById to Maulana
  await prisma.task.updateMany({
    where: {
      userId: { notIn: [maulana.id, budi.id] },
    },
    data: {
      userId: budi.id,
      createdById: maulana.id,
    },
  });

  // 4. Delete all other users
  const deleteResult = await prisma.user.deleteMany({
    where: {
      id: { notIn: [maulana.id, budi.id] },
    },
  });
  console.log(`Deleted ${deleteResult.count} other users.`);

  // 5. Verify remaining users
  const remaining = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      department: true,
      position: true,
      role: true,
      isApproved: true,
    },
  });
  console.log("Remaining users in database:");
  console.table(remaining);
}

resetUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
