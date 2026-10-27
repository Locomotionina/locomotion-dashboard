const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  // 1. Admin (Superuser)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: 'Maulana (Director)',
      email: 'admin@locomotion.agency',
      department: 'Administration',
      position: 'High Management',
      role: 'MANAGEMENT',
      isApproved: true,
    },
    create: {
      name: 'Maulana (Director)',
      username: 'admin',
      email: 'admin@locomotion.agency',
      password: passwordHash,
      department: 'Administration',
      position: 'High Management',
      role: 'MANAGEMENT',
      isApproved: true,
    }
  });

  // 2. Creative Head
  await prisma.user.upsert({
    where: { username: 'stafftesting' },
    update: {
      name: 'Ahmad Creative',
      email: 'ahmad@locomotion.agency',
      department: 'Creative',
      position: 'Creative Head',
      role: 'STAFF',
      isApproved: true,
    },
    create: {
      name: 'Ahmad Creative',
      username: 'stafftesting',
      email: 'ahmad@locomotion.agency',
      password: passwordHash,
      department: 'Creative',
      position: 'Creative Head',
      role: 'STAFF',
      isApproved: true,
    }
  });

  // 3. Graphic Design
  await prisma.user.upsert({
    where: { username: 'rian.staff' },
    update: {
      name: 'Rian Pratama',
      email: 'rian@locomotion.agency',
      department: 'Creative',
      position: 'Graphic Design',
      role: 'STAFF',
      isApproved: true,
    },
    create: {
      name: 'Rian Pratama',
      username: 'rian.staff',
      email: 'rian@locomotion.agency',
      password: passwordHash,
      department: 'Creative',
      position: 'Graphic Design',
      role: 'STAFF',
      isApproved: true,
    }
  });

  // 4. Project Manager (Project Management)
  await prisma.user.upsert({
    where: { username: 'sarah.pm' },
    update: {
      name: 'Sarah Wijaya',
      email: 'sarah@locomotion.agency',
      department: 'Project Management',
      position: 'Project Manager',
      role: 'MANAGEMENT',
      isApproved: true,
    },
    create: {
      name: 'Sarah Wijaya',
      username: 'sarah.pm',
      email: 'sarah@locomotion.agency',
      password: passwordHash,
      department: 'Project Management',
      position: 'Project Manager',
      role: 'MANAGEMENT',
      isApproved: true,
    }
  });

  // 5. Business Development (Account Executive)
  await prisma.user.upsert({
    where: { username: 'kevin.biz' },
    update: {
      name: 'Kevin Hartanto',
      email: 'kevin@locomotion.agency',
      department: 'Business Development',
      position: 'Account Executive',
      role: 'STAFF',
      isApproved: true,
    },
    create: {
      name: 'Kevin Hartanto',
      username: 'kevin.biz',
      email: 'kevin@locomotion.agency',
      password: passwordHash,
      department: 'Business Development',
      position: 'Account Executive',
      role: 'STAFF',
      isApproved: true,
    }
  });

  // 6. Administration (Human Resource)
  await prisma.user.upsert({
    where: { username: 'dina.hr' },
    update: {
      name: 'Dina Larasati',
      email: 'dina@locomotion.agency',
      department: 'Administration',
      position: 'Human Resource',
      role: 'STAFF',
      isApproved: true,
    },
    create: {
      name: 'Dina Larasati',
      username: 'dina.hr',
      email: 'dina@locomotion.agency',
      password: passwordHash,
      department: 'Administration',
      position: 'Human Resource',
      role: 'STAFF',
      isApproved: true,
    }
  });

  // 7. Pending user (Audio Visual in Creative, waiting for approval)
  await prisma.user.upsert({
    where: { username: 'budi.av' },
    update: {
      name: 'Budi Santoso',
      email: 'budi@locomotion.agency',
      department: 'Creative',
      position: 'Audio Visual',
      role: 'STAFF',
      isApproved: false,
    },
    create: {
      name: 'Budi Santoso',
      username: 'budi.av',
      email: 'budi@locomotion.agency',
      password: passwordHash,
      department: 'Creative',
      position: 'Audio Visual',
      role: 'STAFF',
      isApproved: false,
    }
  });

  const all = await prisma.user.findMany({
    select: { username: true, name: true, email: true, department: true, position: true, isApproved: true }
  });
  console.log('Total users now:', all.length);
  all.forEach(u => console.log(u.username, '|', u.name, '|', u.email, '|', u.department, '|', u.position, '| approved:', u.isApproved));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
