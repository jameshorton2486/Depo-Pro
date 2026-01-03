/**
 * Smoke test for Depo-Pro
 * Verifies basic system functionality
 */

import { PrismaClient } from '@prisma/client';
import { transcriptionQueue } from '@/lib/queue/transcription-queue';
import { db } from '@/lib/db';

const prisma = new PrismaClient();

async function smokeTest() {
  console.log('🧪 Running smoke test...\n');
  
  try {
    // 1. Check database connection
    console.log('1️⃣ Testing database connection...');
    await db.$connect();
    const firmCount = await db.firm.count();
    console.log(`   ✅ Connected. Found ${firmCount} firms.\n`);
    
    // 2. Check Redis/Queue connection
    console.log('2️⃣ Testing Redis/Queue connection...');
    const queueHealth = await transcriptionQueue.getJobCounts();
    console.log('   ✅ Queue connected.');
    console.log(`      Jobs: ${JSON.stringify(queueHealth)}\n`);
    
    // 3. Create test job
    console.log('3️⃣ Creating test job...');
    const testFirm = await db.firm.findFirst();
    const testUser = await db.user.findFirst();
    
    if (!testFirm || !testUser) {
      throw new Error('No demo data found. Run: npm run db:seed');
    }
    
    const job = await db.job.create({
      data: {
        firmId: testFirm.id,
        createdById: testUser.id,
        status: 'CREATED',
        title: 'Smoke Test Job',
        caseName: 'TEST-SMOKE-001',
        depositionDate: new Date(),
      }
    });
    console.log(`   ✅ Job created: ${job.id}\n`);
    
    // 4. Clean up test job
    console.log('4️⃣ Cleaning up...');
    await db.job.delete({ where: { id: job.id } });
    console.log('   ✅ Test job deleted\n');
    
    console.log('✅ SMOKE TEST PASSED\n');
    console.log('All basic systems are operational.');
    
  } catch (error) {
    console.error('❌ SMOKE TEST FAILED:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

smokeTest();
