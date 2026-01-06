// Set Admin Role via Supabase Admin API
// This updates user_metadata for the authenticated user

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = '0de4c394-fb52-4242-80a7-47af4822eca8';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setAdminRole() {
  console.log('🔐 Setting ADMIN role for user...\n');
  console.log('User ID:', USER_ID);
  console.log('Email:   jameshorton2486@gmail.com\n');

  // Update user metadata via Admin API
  const { data, error } = await supabase.auth.admin.updateUserById(
    USER_ID,
    {
      user_metadata: {
        role: 'ADMIN',
        firstName: 'James',
        lastName: 'Horton',
        email_verified: true
      }
    }
  );

  if (error) {
    console.error('❌ Error updating user metadata:', error);
    process.exit(1);
  }

  console.log('✅ Successfully updated user metadata!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    jameshorton2486@gmail.com');
  console.log('👤 Role:     ADMIN');
  console.log('🆔 User ID:  ' + USER_ID);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔄 Next Steps:');
  console.log('   1. Clear browser cache/cookies (or use incognito)');
  console.log('   2. Go to: http://localhost:3000/login');
  console.log('   3. Login with your Supabase password');
  console.log('   4. Navigate to: http://localhost:3000/admin');
  console.log('   5. ✅ Admin dashboard should load!\n');

  // Verify the update
  console.log('🔍 Verifying update...');
  const { data: userData, error: fetchError } = await supabase.auth.admin.getUserById(USER_ID);

  if (fetchError) {
    console.error('⚠️  Could not verify:', fetchError.message);
  } else {
    const role = userData.user?.user_metadata?.role;
    if (role === 'ADMIN') {
      console.log('✅ Verified: role = "ADMIN"\n');
    } else {
      console.error('❌ Verification failed: role =', role, '\n');
    }
  }
}

setAdminRole().catch(console.error);
