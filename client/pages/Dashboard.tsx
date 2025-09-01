import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Board } from '@/lib/supabase';
import BoardsSidebar from '@/components/BoardsSidebar';
import MainContent from '@/components/MainContent';
import { Button } from '@/components/ui/button';
import { LogOut, User, Menu, X, FileUp, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function Dashboard(): JSX.Element {
  const { boardSlug } = useParams<{ boardSlug: string }>();
  const { user, session, signOut } = useAuth();
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBoardSelect = (board: Board) => setSelectedBoard(board);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleExport = async () => {
    if (!session) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to export bookmarks.' });
      return;
    }

    try {
      const response = await fetch('/api/bookmarks/export', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Failed to export bookmarks.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bookmarks-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: 'Export Successful', description: 'Your bookmarks have been downloaded.' });
    } catch (error) {
      toast({ title: 'Export Failed', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!session) {
      toast({ title: 'Authentication Error', description: 'You must be logged in to import bookmarks.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') throw new Error('Failed to read file content.');

        const bookmarks = JSON.parse(content);

        const response = await fetch('/api/bookmarks/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(bookmarks),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to import bookmarks.');
        }

        toast({ title: 'Import Successful', description: 'Bookmarks have been imported. Refreshing...' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        toast({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept="application/json" />

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className={`w-80 bg-white border-r border-gray-200 flex flex-col shadow-soft transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:relative z-50 lg:z-auto`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-soft">
              <span className="text-white font-bold text-sm">EB</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Easy Bookmark</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-sm text-gray-600">{user?.email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleImportClick}><FileUp className="mr-2 h-4 w-4" />Import Bookmarks</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExport}><FileDown className="mr-2 h-4 w-4" />Export Bookmarks</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600"><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <BoardsSidebar
          selectedBoard={selectedBoard}
          onBoardSelect={handleBoardSelect}
          selectedBoardSlug={boardSlug}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 mr-2" />Menu
          </Button>

          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">BH</span>
            </div>
            <span className="font-semibold text-gray-900">Easy Bookmark</span>
          </div>
        </div>

        <MainContent selectedBoard={selectedBoard} searchQuery={searchQuery} />
      </div>
    </div>
  );
}
