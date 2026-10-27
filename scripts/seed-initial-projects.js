const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample projects and initial tasks in Supabase...");

  const ahmad = await prisma.user.findUnique({ where: { username: "stafftesting" } });
  const rian = await prisma.user.findUnique({ where: { username: "rian.staff" } });
  const sarah = await prisma.user.findUnique({ where: { username: "sarah.pm" } });
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });

  // 1. Project Nike
  const p1 = await prisma.project.upsert({
    where: { code: "LOCO-NK-01" },
    update: {},
    create: {
      code: "LOCO-NK-01",
      name: "Air Max Day 360 Campaign",
      clientName: "Nike Indonesia",
      status: "ACTIVE",
      priority: "HIGH",
      category: "Digital Campaign",
      brief: "Meluncurkan kampanye 360 terintegrasi untuk aktivasi Air Max Day di media sosial dan OOH.",
      goals: "Meningkatkan engagement gen-Z sebesar 40% dan mengarahkan foot traffic ke flagship stores.",
      description: "Kampanye multi-channel mencakup key visual design, 3D motion graphic, filter AR TikTok, dan influencer drops.",
      startDate: new Date("2026-10-01"),
      deadline: new Date("2026-11-20"),
      budget: "Rp 350.000.000",
      previewUrl: "https://figma.com",
      pitchDeckUrl: "https://drive.google.com",
      creativeDeckUrl: "https://drive.google.com",
      createdById: admin?.id,
    },
  });

  // Deliverables Nike
  await prisma.projectDeliverable.createMany({
    data: [
      { projectId: p1.id, title: "Master Creative Deck & Moodboard", url: "https://drive.google.com", type: "CREATIVE_DECK" },
      { projectId: p1.id, title: "Figma Key Visual & UI Banner Assets", url: "https://figma.com", type: "PREVIEW" },
      { projectId: p1.id, title: "Final Render Master Assets (4K)", url: "https://drive.google.com", type: "FINAL_ASSET" },
    ],
    skipDuplicates: true,
  });

  // 2. Project Telkomsel
  const p2 = await prisma.project.upsert({
    where: { code: "LOCO-TC-02" },
    update: {},
    create: {
      code: "LOCO-TC-02",
      name: "Ecosystem Rebranding & Brand Guidelines",
      clientName: "Telkomsel Digital",
      status: "IN_REVIEW",
      priority: "MEDIUM",
      category: "Branding & Identity",
      brief: "Penyegaran identitas visual untuk sub-brand digital lifestyle.",
      goals: "Standarisasi desain visual lintas 12 divisi produk digital.",
      description: "Penyusunan brand book lengkap, motion logo idents, dan template media sosial.",
      startDate: new Date("2026-09-15"),
      deadline: new Date("2026-11-10"),
      budget: "Rp 275.000.000",
      previewUrl: "https://figma.com",
      pitchDeckUrl: "https://drive.google.com",
      createdById: sarah?.id,
    },
  });

  // 3. Initial Tasks for Ahmad Creative
  if (ahmad) {
    await prisma.task.create({
      data: {
        title: "Key Visual & 3D Sneaker Mockup Render",
        description: "Bikin 3 variasi key visual utama dengan lighting neon cyberpunk sesuai moodboard client.",
        status: "On Progress",
        priority: "HIGH",
        dueDate: new Date("2026-11-02"),
        estimatedHours: 8.0,
        initialSeconds: 7200, // 2 hours
        totalSeconds: 7200,
        userId: ahmad.id,
        createdById: sarah?.id || admin?.id,
        reviewerId: sarah?.id || admin?.id,
        projectId: p1.id,
        currentPhase: "INITIAL",
      },
    });

    await prisma.task.create({
      data: {
        title: "Review Storyboard TikTok Influencer Drops",
        description: "Kurasi konsep unboxing 8 creator dan sesuaikan dengan panduan warna kampanye.",
        status: "To Do",
        priority: "MEDIUM",
        dueDate: new Date("2026-11-06"),
        estimatedHours: 4.0,
        userId: ahmad.id,
        createdById: sarah?.id || admin?.id,
        projectId: p1.id,
      },
    });
  }

  // 4. Initial Tasks for Rian
  if (rian) {
    await prisma.task.create({
      data: {
        title: "Social Media Carousel Templates (Feed & Stories)",
        description: "Format 9 grid carousel Instagram dengan tipografi tegas dan palet warna Telkomsel.",
        status: "On Progress",
        priority: "MEDIUM",
        dueDate: new Date("2026-11-04"),
        estimatedHours: 6.0,
        initialSeconds: 3600, // 1 hour
        totalSeconds: 3600,
        userId: rian.id,
        createdById: sarah?.id || admin?.id,
        reviewerId: sarah?.id || admin?.id,
        projectId: p2.id,
        currentPhase: "INITIAL",
      },
    });
  }

  console.log("✅ Seed completed: 2 projects and starter tasks created in Supabase!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
