const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resetTasksExceptCultureRun() {
  console.log("🚀 Memulai proses reset data task all user (kecuali project CULTURE RUN)...\n");

  // 1. Dapatkan project CULTURE RUN
  const cultureRunProjects = await prisma.project.findMany({
    where: {
      name: {
        contains: "CULTURE RUN",
        mode: "insensitive",
      },
    },
  });

  const cultureRunProjectIds = cultureRunProjects.map((p) => p.id);
  console.log(
    `📌 Ditemukan ${cultureRunProjects.length} project CULTURE RUN:`,
    cultureRunProjects.map((p) => `${p.name} (ID: ${p.id})`)
  );

  // 2. Cari semua task yang TIDAK terkait dengan CULTURE RUN
  const tasksToDelete = await prisma.task.findMany({
    where: {
      OR: [
        { projectId: null },
        { projectId: { notIn: cultureRunProjectIds } },
      ],
    },
    select: {
      id: true,
      title: true,
      userId: true,
      projectId: true,
      user: {
        select: {
          name: true,
          username: true,
        },
      },
    },
  });

  const tasksToKeep = await prisma.task.findMany({
    where: {
      projectId: { in: cultureRunProjectIds },
    },
    select: {
      id: true,
      title: true,
      userId: true,
      projectId: true,
    },
  });

  console.log(`\n📋 Rencana Penghapusan:`);
  console.log(`- Task yang akan dihapus: ${tasksToDelete.length}`);
  tasksToDelete.forEach((t) => {
    console.log(
      `  • [${t.id}] "${t.title}" (User: ${t.user?.name || t.userId}, ProjectId: ${t.projectId})`
    );
  });
  console.log(`- Task project CULTURE RUN yang dipertahankan: ${tasksToKeep.length}`);
  tasksToKeep.forEach((t) => {
    console.log(`  • [${t.id}] "${t.title}"`);
  });

  const taskIdsToDelete = tasksToDelete.map((t) => t.id);

  if (taskIdsToDelete.length === 0) {
    console.log("\n⚠️ Tidak ada task yang perlu dihapus.");
    return;
  }

  // 3. Eksekusi reset dalam transaction
  const result = await prisma.$transaction(async (tx) => {
    // Hapus revisi untuk task-task yang akan dihapus
    const delRevisions = await tx.taskRevision.deleteMany({
      where: {
        taskId: { in: taskIdsToDelete },
      },
    });

    // Hapus notifikasi yang berhubungan dengan task-task yang dihapus
    const delNotifications = await tx.notification.deleteMany({
      where: {
        taskId: { in: taskIdsToDelete },
      },
    });

    // Hapus task
    const delTasks = await tx.task.deleteMany({
      where: {
        id: { in: taskIdsToDelete },
      },
    });

    return {
      deletedRevisions: delRevisions.count,
      deletedNotifications: delNotifications.count,
      deletedTasks: delTasks.count,
    };
  });

  console.log("\n✨ Hasil Reset:");
  console.log(`- Task berhasil dihapus: ${result.deletedTasks}`);
  console.log(`- Revisi terkait dihapus: ${result.deletedRevisions}`);
  console.log(`- Notifikasi terkait dibersihkan: ${result.deletedNotifications}`);

  // 4. Verifikasi sisa data di database
  console.log("\n📊 Verifikasi Database Saat Ini:");
  const remainingTasks = await prisma.task.count();
  const cultureRunTasks = await prisma.task.count({
    where: { projectId: { in: cultureRunProjectIds } },
  });
  const projectCount = await prisma.project.count();
  const cultureRunCheck = await prisma.project.findMany({
    where: { name: { contains: "CULTURE RUN", mode: "insensitive" } },
  });
  const userCount = await prisma.user.count();

  console.log(`- Total User tetap: ${userCount}`);
  console.log(`- Total Project tetap: ${projectCount}`);
  console.log(`- Status project CULTURE RUN: ${cultureRunCheck.length > 0 ? "ADA & AMAN" : "TIDAK DITEMUKAN"}`);
  console.log(`- Total Task tersisa: ${remainingTasks}`);
  console.log(`- Task project CULTURE RUN tersisa: ${cultureRunTasks}`);

  console.log("\n✅ Reset data task selesai dan project CULTURE RUN aman.");
}

resetTasksExceptCultureRun()
  .catch((e) => {
    console.error("❌ Error during task reset:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
