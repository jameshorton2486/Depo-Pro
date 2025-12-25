import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Reset Password
          </CardTitle>
          <CardDescription className="text-center">
            Set a new password for your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800 mb-1">
                  Password Reset Disabled
                </h3>
                <p className="text-sm text-amber-700">
                  Password reset functionality is currently disabled for the MVP version of Depo-Pro.
                  Please contact your administrator if you need to reset your password.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button asChild className="w-full" variant="outline">
              <Link href="/login">
                Return to Sign In
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
