import { prisma } from '../lib/db';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verify() {
  const [users, jobs] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, role: true } }),
    prisma.job.findMany({ select: { id: true, caseName: true, status: true } }),
  ]);

  const summary = {
    generatedAt: new Date().toISOString(),
    counts: {
      users: users.length,
      jobs: jobs.length,
    },
    users,
    jobs,
  };

  writeFileSync(resolve(__dirname, '../verify-seed-output.json'), JSON.stringify(summary, null, 2));

  console.log('=== SEED VERIFICATION ===');
  console.log(`Users: ${users.length}`);
  console.log(`Jobs: ${jobs.length}`);

  if (users.length === 0) {
    console.error('❌ No users found - seed may have failed');
  }

  if (jobs.length === 0) {
    console.warn('⚠️ No jobs found - consider adding sample jobs');
  }
}

verify()
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
