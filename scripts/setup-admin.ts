// Setup Admin User by Email
// Finds user by email and sets ADMIN role via Supabase Admin API

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL = process.argv[2] || 'jameshorton2486@gmail.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupAdmin() {
  console.log('🔐 Setting up ADMIN user...\n');
  console.log('📧 Email:', USER_EMAIL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Find user by email
  console.log('🔍 Searching for user by email...');
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Error listing users:', listError);
    process.exit(1);
  }

  const user = users.users.find((u) => u.email?.toLowerCase() === USER_EMAIL.toLowerCase());

  if (!user) {
    console.error(`❌ User not found with email: ${USER_EMAIL}`);
    console.log('\n💡 Available users:');
    users.users.slice(0, 10).forEach((u) => {
      console.log(`   - ${u.email} (${u.id})`);
    });
    if (users.users.length > 10) {
      console.log(`   ... and ${users.users.length - 10} more`);
    }
    process.exit(1);
  }

  console.log('✅ User found!');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('   Current role:', user.user_metadata?.role || 'Not set');
  console.log('');

  // Step 2: Update user metadata to ADMIN
  console.log('🔧 Updating user role to ADMIN...');
  const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...user.user_metadata,
        role: 'ADMIN',
        firstName: user.user_metadata?.firstName || 'James',
        lastName: user.user_metadata?.lastName || 'Horton',
        email_verified: true,
      },
    },
  );

  if (updateError) {
    console.error('❌ Error updating user:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated user to ADMIN!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    ', updatedUser.user.email);
  console.log('👤 Role:     ', updatedUser.user.user_metadata?.role);
  console.log('🆔 User ID:  ', updatedUser.user.id);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 3: Verify the update
  console.log('🔍 Verifying update...');
  const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(user.id);

  if (verifyError) {
    console.error('⚠️  Could not verify:', verifyError.message);
  } else {
    const role = verifyData.user?.user_metadata?.role;
    if (role === 'ADMIN') {
      console.log('✅ Verified: role = "ADMIN"\n');
    } else {
      console.error('❌ Verification failed: role =', role, '\n');
      process.exit(1);
    }
  }

  // Step 4: Next steps
  console.log('🔄 Next Steps:');
  console.log('   1. Clear browser cache/cookies (or use incognito)');
  console.log('   2. Go to: http://localhost:3000/login');
  console.log('   3. Login with your Supabase password');
  console.log('   4. Navigate to: http://localhost:3000/admin');
  console.log('   5. ✅ Admin dashboard should load!\n');
}

setupAdmin().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
