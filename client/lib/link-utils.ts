import { toast } from '@/hooks/use-toast';

export const fetchTitle = async (url: string): Promise<string> => {
  try {
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch URL content');
    }
    const contents = await response.json();
    const doc = new DOMParser().parseFromString(contents.contents, 'text/html');
    const title = doc.querySelector('title');
    return title ? title.innerText.trim() : new URL(url).hostname;
  } catch (error) {
    console.error('Error fetching title:', error);
    toast({ title: 'Error Fetching Title', description: (error as Error).message, variant: 'destructive' });
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
};