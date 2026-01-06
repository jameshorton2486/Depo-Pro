import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const USER_EMAIL = 'jameshorton2486@gmail.com';
const NEW_PASSWORD = 'Admin123!'; // Temporary password - change after login

async function resetPassword() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔄 Resetting password for:', USER_EMAIL);

    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const user = users.users.find(u => u.email === USER_EMAIL);

    if (!user) {
      throw new Error('User not found');
    }

    console.log('✓ Found user ID:', user.id);

    // Update user password
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD
    });

    if (error) {
      throw error;
    }

    console.log('\n✅ Password reset successful!');
    console.log('📧 Email:', USER_EMAIL);
    console.log('🔑 New Password:', NEW_PASSWORD);
    console.log('\n⚠️  IMPORTANT: Change this password after logging in!');
    console.log('\n🔗 Login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
