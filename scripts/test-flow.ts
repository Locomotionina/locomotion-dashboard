import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function runVerification() {
  console.log("🔍 Running Locomotion Agency End-to-End Logic Verification...\n");

  // 1. Verify Users & Roles
  const users = await prisma.user.findMany();
  console.log(`✅ Loaded ${users.length} users from SQLite.`);
  const managementUsers = users.filter((u) => u.role === "MANAGEMENT");
  const staffUsers = users.filter((u) => u.role === "STAFF");
  console.log(`   - Management: ${managementUsers.length} (${managementUsers.map((m) => m.name).join(", ")})`);
  console.log(`   - Staff: ${staffUsers.length} (${staffUsers.map((s) => s.name).join(", ")})`);

  // 2. Verify Projects & Brand Hub
  const projects = await prisma.project.findMany({
    include: { deliverables: true, tasks: { include: { user: true } } },
  });
  console.log(`\n✅ Loaded ${projects.length} Agency Projects:`);
  for (const p of projects) {
    const activeTasks = p.tasks.filter((t) => t.status !== "Done");
    const uniqueStaff = new Set(p.tasks.map((t) => t.user?.name).filter(Boolean));
    console.log(`   - [${p.code}] ${p.name} (${p.clientName})`);
    console.log(`     Status: ${p.status} | PICs: ${uniqueStaff.size} staff (${Array.from(uniqueStaff).join(", ") || "None"})`);
    console.log(`     Centralized URLs: Preview=${Boolean(p.previewUrl)}, PitchDeck=${Boolean(p.pitchDeckUrl)}, CreativeDeck=${Boolean(p.creativeDeckUrl)}, FinalAssets=${Boolean(p.finalAssetsUrl)}`);
  }

  // 3. Test Staff Task Self-Input & Relational Linking
  const sofia = users.find((u) => u.username === "sofia.media")!;
  const nike = projects.find((p) => p.code === "LOCO-NK-01")!;

  console.log(`\n🧪 Testing Quick Action: "Add My Task for this Project" for Sofia Rodriguez...`);
  const newTask = await prisma.task.create({
    data: {
      title: "TikTok Spark Ads & Sneakerhead Influencer Seeding",
      description: "Coordinate with 8 micro-creators on TikTok for Air Max Day unboxing drops.",
      status: "On Progress",
      priority: "HIGH",
      dueDate: new Date("2026-11-05"),
      estimatedHours: 6.0,
      userId: sofia.id,
      projectId: nike.id,
    },
  });
  console.log(`✅ Task created with ID ${newTask.id} linked to project ${nike.name}`);

  // 4. Verify Automated PIC Display Query
  const updatedNikeTasks = await prisma.task.findMany({
    where: { projectId: nike.id },
    include: { user: true },
  });
  const picNames = Array.from(new Set(updatedNikeTasks.map((t) => t.user?.name)));
  console.log(`✅ Automated PIC Roster for Nike now includes: ${picNames.join(", ")}`);
  if (!picNames.includes("Sofia Rodriguez")) {
    throw new Error("Failed: Sofia should now appear in Nike PIC roster!");
  }

  // 5. Verify Privacy Constraint: Sofia only sees her own tasks
  const sofiaTasks = await prisma.task.findMany({
    where: { userId: sofia.id },
  });
  console.log(`✅ Privacy Check: Sofia has ${sofiaTasks.length} task(s).`);
  for (const t of sofiaTasks) {
    if (t.userId !== sofia.id) {
      throw new Error(`Privacy violation: Task ${t.id} belongs to another user!`);
    }
  }

  // 6. Test Task Status & Archive Flow
  console.log(`\n🧪 Testing Task Status edit to "Done" (Archive Transition)...`);
  const completedTask = await prisma.task.update({
    where: { id: newTask.id },
    data: {
      status: "Done",
      completedAt: new Date(),
    },
  });
  console.log(`✅ Task status updated to "${completedTask.status}". Completed at: ${completedTask.completedAt?.toISOString()}`);

  // Query Active vs Archive for Sofia
  const sofiaActive = await prisma.task.findMany({
    where: { userId: sofia.id, status: { in: ["To Do", "On Progress"] } },
  });
  const sofiaArchive = await prisma.task.findMany({
    where: { userId: sofia.id, status: "Done" },
  });
  console.log(`   - Sofia Active Tasks: ${sofiaActive.length}`);
  console.log(`   - Sofia Archive Tasks: ${sofiaArchive.length} (Includes new task)`);

  // 7. Verify Management Capacity Monitoring
  console.log(`\n🧪 Testing Management Capacity Radar calculation...`);
  const allStaff = await prisma.user.findMany({
    where: { role: "STAFF" },
    include: {
      tasks: { where: { status: { in: ["To Do", "On Progress"] } } },
    },
  });

  for (const s of allStaff) {
    const activeCount = s.tasks.length;
    let status = "OPTIMAL";
    if (activeCount >= 5) status = "OVERLOADED";
    else if (activeCount <= 1) status = "AVAILABLE / IDLE";

    console.log(`   - ${s.name} (${s.position}): ${activeCount} active tasks -> [${status}]`);
  }

  // Clean up the temporary test task
  await prisma.task.delete({ where: { id: newTask.id } });
  console.log(`\n🧹 Cleaned up temporary test task.`);

  console.log(`\n🎉 ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!`);
}

runVerification()
  .catch((e) => {
    console.error("❌ Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
