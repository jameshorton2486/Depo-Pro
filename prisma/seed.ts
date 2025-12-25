import { PrismaClient, UserRole, JobStatus, FileType } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const passwordHash = await hash('password123', 10);

  // Create demo firm first (required for multi-tenant, needed for user firmId)
  const firm = await prisma.firm.upsert({
    where: { id: 'demo-firm-001' },
    update: {},
    create: {
      id: 'demo-firm-001',
      name: 'Demo Legal Services',
      address: '123 Main Street, Austin, TX 78701',
      phone: '512-555-0100',
      email: 'contact@demolegal.com',
    },
  });
  console.log('✅ Created firm:', firm.name);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@depo-pro.com' },
    update: {
      firmId: firm.id,
    },
    create: {
      email: 'admin@depo-pro.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      passwordHash,
      firmId: firm.id,
    },
  });

  console.log('✅ Created admin:', admin.email);

  // Create court reporter
  const reporter = await prisma.user.upsert({
    where: { email: 'reporter@depo-pro.com' },
    update: {
      firmId: firm.id,
    },
    create: {
      email: 'reporter@depo-pro.com',
      firstName: 'Court',
      lastName: 'Reporter',
      role: UserRole.REPORTER,
      passwordHash,
      firmId: firm.id,
    },
  });

  console.log('✅ Created court reporter:', reporter.email);

  // Create scopist
  const scopist = await prisma.user.upsert({
    where: { email: 'scopist@depo-pro.com' },
    update: {
      firmId: firm.id,
    },
    create: {
      email: 'scopist@depo-pro.com',
      firstName: 'Scopist',
      lastName: 'User',
      role: UserRole.SCOPIST,
      passwordHash,
      firmId: firm.id,
    },
  });

  console.log('✅ Created scopist:', scopist.email);


  // Create attorney user (required for Phase 3 attorney portal)
  const attorney = await prisma.user.upsert({
    where: { email: 'attorney@depo-pro.com' },
    update: {
      role: UserRole.ATTORNEY,
      firmId: firm.id,
    },
    create: {
      email: 'attorney@depo-pro.com',
      firstName: 'Attorney',
      lastName: 'User',
      role: UserRole.ATTORNEY,
      passwordHash,
      firmId: firm.id,
    },
  });
  console.log('✅ Created attorney:', attorney.email);

  // Create attorney profile for onboarding completion
  await prisma.attorneyProfile.upsert({
    where: { userId: attorney.id },
    update: {},
    create: {
      userId: attorney.id,
      barNumber: 'TX-12345',
      barState: 'Texas',
      firmName: 'Demo Legal Services',
      practiceAreas: ['Civil Litigation', 'Personal Injury'],
    },
  });
  console.log('✅ Created attorney profile for:', attorney.email);

  // Create a sample case with attorney membership
  const sampleCase = await prisma.case.upsert({
    where: { id: 'case-001' },
    update: {},
    create: {
      id: 'case-001',
      caseNumber: 'CV-2024-001234',
      caseStyle: 'Smith vs. Johnson',
      status: 'ACTIVE',
      firmId: firm.id,
      createdById: attorney.id,
      memberships: {
        create: {
          userId: attorney.id,
          roleInCase: 'ATTORNEY',
        },
      },
    },
  });
  console.log('✅ Created sample case:', sampleCase.caseStyle);

  // Sample jobs for reporter (different lifecycle stages)
  const jobs = [
    {
      id: 'job-001',
      title: 'Smith vs. Johnson Deposition',
      caseName: 'Smith vs. Johnson Deposition',
      caseNumber: 'CV-2024-001234',
      depositionDate: new Date('2024-12-15T15:00:00Z'),
      status: JobStatus.CREATED,
      createdById: reporter.id,
      location: 'Austin, TX',
      notes: 'Awaiting witness confirmation.',
    },
    {
      id: 'job-002',
      title: 'Williams Estate Hearing',
      caseName: 'Williams Estate Hearing',
      caseNumber: 'PR-2024-005678',
      depositionDate: new Date('2024-12-10T18:00:00Z'),
      status: JobStatus.TRANSCRIBING,
      createdById: reporter.id,
      location: 'Virtual / Zoom',
      zoomLink: 'https://zoom.us/j/8675309',
      notes: 'Audio uploaded, transcription in progress.',
    },
    {
      id: 'job-003',
      title: 'Tech Corp Patent Dispute',
      caseName: 'Tech Corp Patent Dispute',
      caseNumber: 'IP-2024-009012',
      depositionDate: new Date('2024-11-20T20:00:00Z'),
      status: JobStatus.COMPLETED,
      createdById: reporter.id,
      location: 'San Francisco, CA',
      notes: 'Transcript delivered to client.',
      completedAt: new Date('2024-11-22T17:30:00Z'),
    },
  ];

  for (const jobData of jobs) {
    const job = await prisma.job.upsert({
      where: { id: jobData.id },
      update: {},
      create: {
        ...jobData,
        firmId: firm.id,
        files: {
          create: [
            {
              id: `${jobData.id}-audio`,
              type: FileType.AUDIO,
              fileName: `${jobData.id}.wav`,
              fileSize: 4_200_000,
              mimeType: 'audio/wav',
              storageUrl: `https://storage.depo-pro.com/${jobData.id}/audio.wav`,
              storagePath: `${jobData.id}/audio.wav`,
            },
          ],
        },
      },
      include: {
        files: true,
      },
    });

    console.log(`✅ Created job: ${job.caseName} (${job.status})`);
  }

  console.log('\n🎉 Seeding complete!\n');
  console.log('Demo credentials (password: password123):');
  console.log('  Admin: admin@depo-pro.com');
  console.log('  Reporter: reporter@depo-pro.com');
  console.log('  Scopist: scopist@depo-pro.com');
  console.log('  Attorney: attorney@depo-pro.com');
  console.log('\n💡 All users are assigned to firm:', firm.name);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
