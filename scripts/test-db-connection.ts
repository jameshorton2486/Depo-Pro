import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

// Explicitly load .env.local
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

console.log(`📁 Loaded environment from: .env.local`);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set');
console.log(
  '   Connection:',
  process.env.DATABASE_URL.replace(/:.+@/, ':****@'),
);

async function test() {
  const dbUrl = process.env.DATABASE_URL!;
  
  // Remove sslmode from connection string and configure SSL explicitly
  // The ?sslmode=require in the URL can conflict with SSL object config
  const cleanUrl = dbUrl.replace(/\?sslmode=[^&]*/, '');
  
  const clientConfig: any = {
    connectionString: cleanUrl,
  };

  // For Supabase, configure SSL to accept certificate chain
  if (dbUrl.includes('supabase.co')) {
    clientConfig.ssl = {
      rejectUnauthorized: false, // Supabase uses valid certs, but Node.js may need this
    };
  }

  const client = new Client(clientConfig);

  try {
    console.log('🔌 Attempting database connection...');
    await client.connect();

    const res = await client.query(
      'SELECT 1 AS ok, current_database() AS db_name',
    );
    console.log('✅ Query successful:', res.rows[0]);

    const version = await client.query('SHOW server_version');
    console.log('✅ PostgreSQL version:', version.rows[0].server_version);

    console.log('\n🎉 All connection tests passed!');
    console.log('📝 Next steps:');
    console.log('   1. npx prisma generate');
    console.log('   2. npx prisma db push');
  } catch (err: any) {
    console.error('❌ Database connection failed:');
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

test();
