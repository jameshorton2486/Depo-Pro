const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function run() {
  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    const jobCount = await prisma.job.count();
    const data = {
      userCount,
      jobCount,
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(__dirname, '..', 'db-verification.json'), JSON.stringify(data, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
