const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resetProjectsAndTasks() {
  console.log("🚀 Starting reset of all projects and tasks across all users...\n");

  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete all revisions
    const delRevisions = await tx.taskRevision.deleteMany({});
    console.log(`✓ Deleted ${delRevisions.count} task revisions.`);

    // 2. Delete all tasks
    const delTasks = await tx.task.deleteMany({});
    console.log(`✓ Deleted ${delTasks.count} tasks.`);

    // 3. Delete all task folders
    const delFolders = await tx.taskFolder.deleteMany({});
    console.log(`✓ Deleted ${delFolders.count} task folders.`);

    // 4. Delete all project deliverables
    const delDeliverables = await tx.projectDeliverable.deleteMany({});
    console.log(`✓ Deleted ${delDeliverables.count} project deliverables.`);

    // 5. Delete all projects
    const delProjects = await tx.project.deleteMany({});
    console.log(`✓ Deleted ${delProjects.count} projects.`);

    // 6. Delete all notifications
    const delNotifications = await tx.notification.deleteMany({});
    console.log(`✓ Deleted ${delNotifications.count} notifications.`);

    // 7. Delete all pending profile & password requests
    const delProfileRequests = await tx.profileUpdateRequest.deleteMany({});
    const delPasswordRequests = await tx.passwordResetRequest.deleteMany({});
    console.log(`✓ Deleted ${delProfileRequests.count} profile update requests and ${delPasswordRequests.count} password requests.`);

    return {
      delRevisions: delRevisions.count,
      delTasks: delTasks.count,
      delFolders: delFolders.count,
      delDeliverables: delDeliverables.count,
      delProjects: delProjects.count,
      delNotifications: delNotifications.count,
      delProfileRequests: delProfileRequests.count,
      delPasswordRequests: delPasswordRequests.count,
    };
  });

  console.log("\n📊 Verification Summary:");
  const userCount = await prisma.user.count();
  const projectCount = await prisma.project.count();
  const taskCount = await prisma.task.count();
  const revisionCount = await prisma.taskRevision.count();
  const folderCount = await prisma.taskFolder.count();
  const deliverableCount = await prisma.projectDeliverable.count();
  const notificationCount = await prisma.notification.count();

  console.log(`- Users preserved: ${userCount}`);
  console.log(`- Projects remaining: ${projectCount}`);
  console.log(`- Tasks remaining: ${taskCount}`);
  console.log(`- Task revisions remaining: ${revisionCount}`);
  console.log(`- Task folders remaining: ${folderCount}`);
  console.log(`- Project deliverables remaining: ${deliverableCount}`);
  console.log(`- Remaining notifications (system/user only): ${notificationCount}`);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      department: true,
      position: true,
    },
  });
  console.log("\n👥 Intact Users:");
  console.table(users);

  console.log("\n✅ Reset completed successfully!");
}

resetProjectsAndTasks()
  .catch((e) => {
    console.error("❌ Error during reset:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
