import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FolderKanban, Share2, Cloud } from 'lucide-react';

const AppInfoPanel = () => (
  <div className="hidden bg-gray-100 lg:flex lg:flex-col p-12 relative">
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg mb-6">
        <span className="text-white font-bold text-2xl">EB</span>
      </div>
      <h1 className="text-4xl font-bold text-gray-900">Welcome to Easy Bookmark</h1>
      <p className="mt-4 text-lg text-gray-600">
        The simplest way to organize, share, and access your bookmarks.
      </p>
      <div className="mt-12 space-y-8 text-left max-w-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Organize with Boards & Folders</h3>
            <p className="mt-1 text-gray-500">
              Structure your bookmarks into intuitive boards and folders. No more endless lists.
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Share with a Click</h3>
            <p className="mt-1 text-gray-500">
              Generate shareable links for boards, folders, or individual bookmarks instantly.
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <Cloud className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Access Anywhere</h3>
            <p className="mt-1 text-gray-500">
              Your bookmarks are synced to the cloud, available on any device, anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
    <div className="flex-shrink-0 text-center">
      <p className="text-sm text-gray-500">
        © {new Date().getFullYear()} Easy Bookmark. All rights reserved.
      </p>
    </div>
  </div>
);

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const { error } = await updatePassword(password);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Your password has been updated successfully! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }

    setLoading(false);
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <AppInfoPanel />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Choose a new password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter and confirm your new password below.
            </p>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" name="password" type="password" placeholder="Enter your new password" required disabled={loading || !!success} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm your new password" required disabled={loading || !!success} />
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert><AlertDescription className="text-green-600">{success}</AlertDescription></Alert>}

            <Button type="submit" className="w-full" disabled={loading || !!success}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
