// ═══════════════════════════════════════════════════════════════
// DATABASE SEED SCRIPT
// ═══════════════════════════════════════════════════════════════
// Creates test data for development and testing

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (in development only!)
  console.log('🗑️  Cleaning existing data...');
  await prisma.jobDictionaryTerm.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.jobFile.deleteMany();
  await prisma.jobAssignment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();
  console.log('✅ Cleaned\n');

  // Hash password once for all users
  const passwordHash = await hash('password123', 10);

  // Create Firms
  console.log('🏢 Creating firms...');
  const firm1 = await prisma.firm.create({
    data: {
      name: 'Smith & Associates Court Reporting',
      type: 'AGENCY',
      contactEmail: 'contact@smithreporting.com',
      contactPhone: '(555) 123-4567',
      address: '123 Legal Ave, Suite 500, New York, NY 10001',
      settings: JSON.stringify({
        timezone: 'America/New_York',
        defaultRate: 150,
      }),
    },
  });

  const firm2 = await prisma.firm.create({
    data: {
      name: 'West Coast Deposition Services',
      type: 'AGENCY',
      contactEmail: 'info@westcoastdepo.com',
      contactPhone: '(555) 987-6543',
      address: '456 Pacific Blvd, Los Angeles, CA 90012',
      settings: JSON.stringify({
        timezone: 'America/Los_Angeles',
        defaultRate: 175,
      }),
    },
  });

  const firm3 = await prisma.firm.create({
    data: {
      name: 'Independent Reporter LLC',
      type: 'INDEPENDENT',
      contactEmail: 'john@independentreporter.com',
      contactPhone: '(555) 555-5555',
      settings: JSON.stringify({
        timezone: 'America/Chicago',
      }),
    },
  });
  console.log(`✅ Created ${3} firms\n`);

  // Create Users
  console.log('👥 Creating users...');
  
  // Admin
  await prisma.user.create({
    data: {
      email: 'admin@depo-pro.com',
      name: 'Admin User',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  // Court Reporters
  const reporter1 = await prisma.user.create({
    data: {
      email: 'reporter@depo-pro.com',
      name: 'Sarah Johnson',
      passwordHash,
      role: 'COURT_REPORTER',
      firmId: firm1.id,
      isActive: true,
    },
  });

  const reporter2 = await prisma.user.create({
    data: {
      email: 'reporter2@depo-pro.com',
      name: 'Michael Chen',
      passwordHash,
      role: 'COURT_REPORTER',
      firmId: firm2.id,
      isActive: true,
    },
  });

  const reporter3 = await prisma.user.create({
    data: {
      email: 'john@independentreporter.com',
      name: 'John Williams',
      passwordHash,
      role: 'COURT_REPORTER',
      firmId: firm3.id,
      isActive: true,
    },
  });

  // Scopists
  const scopist1 = await prisma.user.create({
    data: {
      email: 'scopist@depo-pro.com',
      name: 'Emily Davis',
      passwordHash,
      role: 'SCOPIST',
      firmId: firm1.id,
      isActive: true,
    },
  });

  const scopist2 = await prisma.user.create({
    data: {
      email: 'scopist2@depo-pro.com',
      name: 'David Martinez',
      passwordHash,
      role: 'SCOPIST',
      firmId: firm2.id,
      isActive: true,
    },
  });

  const scopist3 = await prisma.user.create({
    data: {
      email: 'scopist3@depo-pro.com',
      name: 'Lisa Anderson',
      passwordHash,
      role: 'SCOPIST',
      firmId: firm1.id,
      isActive: true,
    },
  });

  console.log(`✅ Created ${7} users\n`);

  // Create Jobs
  console.log('📋 Creating jobs...');

  // Firm 1 Jobs
  const job1 = await prisma.job.create({
    data: {
      title: 'Deposition of John Doe',
      caseName: 'Smith v. Johnson Industries',
      caseNumber: 'CV-2024-12345',
      court: 'Superior Court of New York',
      depoDate: new Date('2024-12-15T10:00:00Z'),
      location: 'Law Office of Smith & Partners, 789 Broadway, NY',
      reporterId: reporter1.id,
      firmId: firm1.id,
      status: 'IN_PROGRESS',
      totalPages: 150,
      rushOrder: false,
      difficulty: 3,
      clientName: 'Smith Law Firm',
      clientContact: 'partner@smithlaw.com',
      notes: 'Medical malpractice case. Expect technical medical terminology.',
    },
  });

  const job2 = await prisma.job.create({
    data: {
      title: 'Expert Witness Deposition - Dr. Anderson',
      caseName: 'Tech Corp v. Innovate LLC',
      caseNumber: 'CV-2024-54321',
      court: 'Federal District Court, Southern District of NY',
      depoDate: new Date('2024-11-20T14:00:00Z'),
      location: 'Federal Courthouse, 500 Pearl St, NY',
      reporterId: reporter1.id,
      firmId: firm1.id,
      status: 'ASSIGNED',
      totalPages: null,
      rushOrder: true,
      difficulty: 5,
      clientName: 'Tech Corp Legal',
      clientContact: 'litigation@techcorp.com',
      notes: 'High-profile patent case. Rush delivery needed within 3 days.',
    },
  });

  const job3 = await prisma.job.create({
    data: {
      title: 'Plaintiff Deposition - Jane Smith',
      caseName: 'Smith v. Auto Insurance Co.',
      caseNumber: 'CV-2024-99999',
      court: 'Kings County Supreme Court',
      depoDate: new Date('2024-10-05T09:00:00Z'),
      location: 'Smith & Associates Office',
      reporterId: reporter1.id,
      firmId: firm1.id,
      status: 'COMPLETED',
      totalPages: 89,
      rushOrder: false,
      difficulty: 2,
      clientName: 'Auto Insurance Defense',
      clientContact: 'claims@autoinsurance.com',
      notes: 'Personal injury case. Standard turnaround.',
      completedAt: new Date('2024-10-15T18:00:00Z'),
    },
  });

  // Firm 2 Jobs
  await prisma.job.create({
    data: {
      title: 'Corporate Deposition - CEO Thompson',
      caseName: 'Shareholders v. MegaCorp Inc.',
      caseNumber: 'BC-2024-77777',
      court: 'Los Angeles Superior Court',
      depoDate: new Date('2024-12-01T10:00:00Z'),
      location: 'Downtown LA Convention Center',
      reporterId: reporter2.id,
      firmId: firm2.id,
      status: 'DRAFT',
      totalPages: null,
      rushOrder: false,
      difficulty: 4,
      clientName: 'Corporate Defense Attorneys',
      clientContact: 'partners@corpdefense.com',
      notes: 'Securities litigation. Multiple exhibits expected.',
    },
  });

  const job5 = await prisma.job.create({
    data: {
      title: 'Witness Deposition - Officer Rodriguez',
      caseName: 'People v. Martinez',
      caseNumber: 'CR-2024-11111',
      court: 'Los Angeles County Criminal Court',
      depoDate: new Date('2024-11-30T13:00:00Z'),
      location: 'LAPD Central Station',
      reporterId: reporter2.id,
      firmId: firm2.id,
      status: 'IN_PROGRESS',
      totalPages: 45,
      rushOrder: true,
      difficulty: 3,
      clientName: 'District Attorney Office',
      clientContact: 'prosecutions@lada.gov',
      notes: 'Criminal case. Expedited transcript required.',
    },
  });

  // Firm 3 Jobs
  const job6 = await prisma.job.create({
    data: {
      title: 'Employment Dispute Deposition',
      caseName: 'Employee v. Big Box Retailer',
      caseNumber: 'CV-2024-22222',
      court: 'Cook County Circuit Court',
      depoDate: new Date('2024-11-25T11:00:00Z'),
      location: 'Mediator Office, Chicago',
      reporterId: reporter3.id,
      firmId: firm3.id,
      status: 'ASSIGNED',
      totalPages: null,
      rushOrder: false,
      difficulty: 2,
      clientName: 'Employment Law Group',
      clientContact: 'intake@employmentlaw.com',
      notes: 'Standard employment case.',
    },
  });

  console.log(`✅ Created ${6} jobs\n`);

  // Create Job Assignments
  console.log('🔗 Creating job assignments...');

  await prisma.jobAssignment.create({
    data: {
      jobId: job1.id,
      scopistId: scopist1.id,
      status: 'IN_PROGRESS',
      assignedAt: new Date('2024-12-16T08:00:00Z'),
      notes: 'Working on pages 1-75',
    },
  });

  await prisma.jobAssignment.create({
    data: {
      jobId: job2.id,
      scopistId: scopist3.id,
      status: 'PENDING',
      assignedAt: new Date('2024-11-21T09:00:00Z'),
      notes: 'Rush job - please prioritize',
    },
  });

  await prisma.jobAssignment.create({
    data: {
      jobId: job3.id,
      scopistId: scopist1.id,
      status: 'COMPLETED',
      assignedAt: new Date('2024-10-06T10:00:00Z'),
      completedAt: new Date('2024-10-12T16:00:00Z'),
      notes: 'Completed ahead of schedule',
    },
  });

  await prisma.jobAssignment.create({
    data: {
      jobId: job5.id,
      scopistId: scopist2.id,
      status: 'IN_PROGRESS',
      assignedAt: new Date('2024-11-30T14:00:00Z'),
      notes: 'First 20 pages completed',
    },
  });

  await prisma.jobAssignment.create({
    data: {
      jobId: job6.id,
      scopistId: scopist2.id,
      status: 'ACCEPTED',
      assignedAt: new Date('2024-11-25T12:00:00Z'),
      notes: 'Will start after current job',
    },
  });

  console.log(`✅ Created ${5} job assignments\n`);

  // Create Job Files
  console.log('📁 Creating job files...');

  await prisma.jobFile.create({
    data: {
      jobId: job1.id,
      filename: 'john_doe_deposition_audio.m4a',
      originalName: 'john_doe_deposition_audio.m4a',
      mimeType: 'audio/m4a',
      size: 145000000, // 145 MB
      storageKey: '/uploads/firm1/job1/audio.m4a',
      fileType: 'AUDIO',
      uploadedById: reporter1.id,
      metadata: JSON.stringify({
        duration: 7200, // 2 hours
        format: 'm4a',
        bitrate: '128kbps',
      }),
    },
  });

  await prisma.jobFile.create({
    data: {
      jobId: job1.id,
      filename: 'exhibit_a_medical_records.pdf',
      originalName: 'exhibit_a_medical_records.pdf',
      mimeType: 'application/pdf',
      size: 2500000, // 2.5 MB
      storageKey: '/uploads/firm1/job1/exhibit_a.pdf',
      fileType: 'EXHIBIT',
      uploadedById: reporter1.id,
      metadata: JSON.stringify({
        pages: 15,
      }),
    },
  });

  await prisma.jobFile.create({
    data: {
      jobId: job3.id,
      filename: 'jane_smith_final_transcript.pdf',
      originalName: 'jane_smith_final_transcript.pdf',
      mimeType: 'application/pdf',
      size: 1800000,
      storageKey: '/uploads/firm1/job3/final_transcript.pdf',
      fileType: 'TRANSCRIPT',
      uploadedById: scopist1.id,
      metadata: JSON.stringify({
        pages: 89,
        certified: true,
      }),
    },
  });

  await prisma.jobFile.create({
    data: {
      jobId: job5.id,
      filename: 'rodriguez_deposition_video.mp4',
      originalName: 'rodriguez_deposition_video.mp4',
      mimeType: 'video/mp4',
      size: 850000000, // 850 MB
      storageKey: '/uploads/firm2/job5/video.mp4',
      fileType: 'VIDEO',
      uploadedById: reporter2.id,
      metadata: JSON.stringify({
        duration: 2700, // 45 minutes
        resolution: '1080p',
      }),
    },
  });

  console.log(`✅ Created ${4} job files\n`);

  // Create Transcripts
  console.log('📄 Creating transcripts...');

  await prisma.transcript.create({
    data: {
      jobId: job3.id,
      createdById: scopist1.id,
      status: 'FINAL',
      source: 'MANUAL',
      rawText: 'Q: Please state your name for the record.\nA: Jane Smith.\n...',
      formattedText: '<p><b>Q:</b> Please state your name for the record.</p><p><b>A:</b> Jane Smith.</p>...',
    },
  });

  await prisma.transcript.create({
    data: {
      jobId: job1.id,
      createdById: scopist1.id,
      status: 'REVIEW',
      source: 'MANUAL',
      rawText: 'Q: Dr. Anderson, can you explain...\nA: Yes, the plaintiff suffered from...',
      formattedText: '<p><b>Q:</b> Dr. Anderson, can you explain...</p><p><b>A:</b> Yes, the plaintiff suffered from...</p>',
    },
  });

  console.log(`✅ Created ${2} transcripts\n`);

  // Create Dictionary Terms
  console.log('📖 Creating dictionary terms...');

  await prisma.jobDictionaryTerm.create({
    data: {
      jobId: job1.id,
      term: 'myocardial infarction',
      notes: 'Heart attack; occurs when blood flow to part of the heart is blocked',
      category: 'MEDICAL',
      addedById: scopist1.id,
      phonetic: 'my-oh-KAR-dee-ul in-FARK-shun',
    },
  });

  await prisma.jobDictionaryTerm.create({
    data: {
      jobId: job1.id,
      term: 'electrocardiogram',
      notes: 'ECG or EKG; test that measures electrical activity of the heart',
      category: 'MEDICAL',
      addedById: scopist1.id,
      phonetic: 'ee-lek-tro-KAR-dee-oh-gram',
    },
  });

  await prisma.jobDictionaryTerm.create({
    data: {
      jobId: job2.id,
      term: 'patent infringement',
      notes: 'Unauthorized use of a patented invention',
      category: 'LEGAL',
      addedById: reporter1.id,
    },
  });

  await prisma.jobDictionaryTerm.create({
    data: {
      jobId: job2.id,
      term: 'prior art',
      notes: 'Existing knowledge or technology before a patent application',
      category: 'LEGAL',
      addedById: reporter1.id,
    },
  });

  console.log(`✅ Created ${4} dictionary terms\n`);

  console.log('✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - ${3} Firms`);
  console.log(`   - ${7} Users (1 admin, 3 reporters, 3 scopists)`);
  console.log(`   - ${6} Jobs (various statuses)`);
  console.log(`   - ${5} Assignments`);
  console.log(`   - ${4} Files`);
  console.log(`   - ${2} Transcripts`);
  console.log(`   - ${4} Dictionary terms\n`);
  
  console.log('🔐 Test Credentials:');
  console.log('   Admin:    admin@depo-pro.com / password123');
  console.log('   Reporter: reporter@depo-pro.com / password123');
  console.log('   Scopist:  scopist@depo-pro.com / password123\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
