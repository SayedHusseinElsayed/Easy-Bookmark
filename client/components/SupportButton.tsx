import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export function SupportButton() {
  return (
    <a
      href="https://wa.me/201008915894"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 rounded-full w-16 h-16 shadow-lg bg-green-500 hover:bg-green-600 flex items-center justify-center text-white"
    >
      <MessageSquare className="h-8 w-8" />
    </a>
  );
}
