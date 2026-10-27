const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log("🧹 Starting database cleanup...");

  // 1. Delete all revisions and tasks
  const delRevisions = await prisma.taskRevision.deleteMany({});
  console.log(`Deleted ${delRevisions.count} task revisions.`);

  const delTasks = await prisma.task.deleteMany({});
  console.log(`Deleted ${delTasks.count} tasks.`);

  // 2. Delete all deliverables and projects
  const delDeliverables = await prisma.projectDeliverable.deleteMany({});
  console.log(`Deleted ${delDeliverables.count} project deliverables.`);

  const delProjects = await prisma.project.deleteMany({});
  console.log(`Deleted ${delProjects.count} projects.`);

  // 3. Delete notifications and pending requests
  const delNotifications = await prisma.notification.deleteMany({});
  console.log(`Deleted ${delNotifications.count} notifications.`);

  const delProfileReqs = await prisma.profileUpdateRequest.deleteMany({});
  console.log(`Deleted ${delProfileReqs.count} profile update requests.`);

  const delPasswordReqs = await prisma.passwordResetRequest.deleteMany({});
  console.log(`Deleted ${delPasswordReqs.count} password reset requests.`);

  // 4. Ensure admin user exists and has ADMIN role
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      name: "Administrator",
      email: "admin@locomotion.agency",
      role: "ADMIN",
      department: "OPERATIONS",
      position: "HRGA",
      isApproved: true,
      isSuspended: false,
      password: passwordHash,
    },
    create: {
      name: "Administrator",
      username: "admin",
      email: "admin@locomotion.agency",
      role: "ADMIN",
      department: "OPERATIONS",
      position: "HRGA",
      isApproved: true,
      isSuspended: false,
      password: passwordHash,
    },
  });
  console.log(`Admin user preserved/updated: ${admin.username} (${admin.role})`);

  // 5. Delete all demo users except admin
  const delUsers = await prisma.user.deleteMany({
    where: {
      username: { not: "admin" },
    },
  });
  console.log(`Deleted ${delUsers.count} demo users.`);

  // 6. Verification
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, username: true, name: true, email: true, role: true, department: true, position: true, isApproved: true },
  });
  const taskCount = await prisma.task.count();
  const projectCount = await prisma.project.count();

  console.log("\n--- Verification Summary ---");
  console.log("Remaining Users:", remainingUsers);
  console.log("Total Tasks:", taskCount);
  console.log("Total Projects:", projectCount);
  console.log("✨ Database is now completely clean!");
}

cleanDatabase()
  .catch((e) => {
    console.error("Error during cleanup:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
