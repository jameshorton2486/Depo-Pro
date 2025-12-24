/**
 * Smoke test for Depo-Pro
 * Verifies basic system functionality
 */

import { PrismaClient } from '@prisma/client';
import { transcriptionQueue } from '../src/queue/index.js';

const prisma = new PrismaClient();

async function smokeTest() {
  console.log('🧪 Running smoke test...\n');
  
  try {
    // 1. Check database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    const firmCount = await prisma.firm.count();
    console.log(`   ✅ Connected. Found ${firmCount} firms.\n`);
    
    // 2. Check Redis/Queue connection
    console.log('2️⃣ Testing Redis/Queue connection...');
    const queueHealth = await transcriptionQueue.getJobCounts();
    console.log('   ✅ Queue connected.');
    console.log(`      Jobs: ${JSON.stringify(queueHealth)}\n`);
    
    // 3. Create test job
    console.log('3️⃣ Creating test job...');
    const testFirm = await prisma.firm.findFirst();
    const testUser = await prisma.user.findFirst();
    
    if (!testFirm || !testUser) {
      throw new Error('No demo data found. Run: npm run db:seed');
    }
    
    const job = await prisma.job.create({
      data: {
        firmId: testFirm.id,
        createdById: testUser.id,
        status: 'PENDING',
        caseNumber: 'TEST-SMOKE-001',
      }
    });
    console.log(`   ✅ Job created: ${job.id}\n`);
    
    // 4. Clean up test job
    console.log('4️⃣ Cleaning up...');
    await prisma.job.delete({ where: { id: job.id } });
    console.log('   ✅ Test job deleted\n');
    
    console.log('✅ SMOKE TEST PASSED\n');
    console.log('All basic systems are operational.');
    
  } catch (error) {
    console.error('❌ SMOKE TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

smokeTest();
