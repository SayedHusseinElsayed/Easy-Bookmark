import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, KeyRound, FolderKanban, Share2, Cloud } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AppInfoPanel = () => (
  <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
    <div className="absolute inset-0 bg-grid-white/[0.07] [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)]"></div>
    <div className="relative z-10 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-8 ring-4 ring-blue-500/30">
        <span className="text-white font-bold text-4xl">EB</span>
      </div>
      <h1 className="text-5xl font-bold tracking-tighter">Easy Bookmark</h1>
      <p className="mt-4 text-lg text-gray-300 max-w-md">
        The simplest way to organize, share, and access your bookmarks across all your devices.
      </p>
      <div className="mt-16 space-y-10 text-left max-w-sm">
        <FeatureItem
          icon={<FolderKanban className="h-6 w-6 text-blue-400" />}
          title="Organize with Boards & Folders"
          description="Structure your bookmarks into intuitive boards and folders. No more endless lists."
        />
        <FeatureItem
          icon={<Share2 className="h-6 w-6 text-green-400" />}
          title="Share with a Click"
          description="Generate shareable links for boards, folders, or individual bookmarks instantly."
        />
        <FeatureItem
          icon={<Cloud className="h-6 w-6 text-purple-400" />}
          title="Access Anywhere"
          description="Your bookmarks are synced to the cloud, available on any device, anytime."
        />
      </div>
    </div>
    <div className="absolute bottom-8 text-center text-gray-500 text-sm z-10">
      <p>© {new Date().getFullYear()} Easy Bookmark. All rights reserved.</p>
    </div>
  </div>
);

const FeatureItem = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex items-start space-x-4">
    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-gray-400">{description}</p>
    </div>
  </div>
);

const AuthFormContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
    <AppInfoPanel />
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      {children}
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
        navigate('/');
      }, 3000);
    }

    setLoading(false);
  };

  return (
    <AuthFormContainer>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-gray-400" />
          <CardTitle className="text-3xl font-bold tracking-tight mt-4">Choose a new password</CardTitle>
          <CardDescription className="mt-2">
            Enter and confirm your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" required disabled={loading || !!success} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" required disabled={loading || !!success} />
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert variant="success"><AlertDescription>{success}</AlertDescription></Alert>}

            <Button type="submit" className="w-full" disabled={loading || !!success}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthFormContainer>
  );
}