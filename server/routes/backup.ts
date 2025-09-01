
import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
// Use the service role key for admin-level operations like deleting/inserting across tables.
// IMPORTANT: This key should be stored securely in environment variables on the server, never exposed to the client.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define a custom request type to include the user
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Re-usable Supabase client for user-level requests
const userSupabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication middleware
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const { data: { user }, error } = await userSupabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
};

// Export all user data
export const handleExport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const { data: boards, error: boardsError } = await supabase
      .from('boards').select('*').eq('user_id', userId);
    if (boardsError) throw boardsError;

    const boardIds = boards.map(b => b.id);

    const { data: folders, error: foldersError } = await supabase
      .from('folders').select('*').in('board_id', boardIds);
    if (foldersError) throw foldersError;

    const folderIds = folders.map(f => f.id);

    const { data: links, error: linksError } = await supabase
      .from('links').select('*').in('folder_id', folderIds);
    if (linksError) throw linksError;

    const backupData = {
      boards,
      folders,
      links,
    };

    res.setHeader('Content-Disposition', 'attachment; filename="bookmarks-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(backupData);

  } catch (error: any) {
    res.status(500).json({ error: `Export failed: ${error.message}` });
  }
};

// Import and restore all user data
export const handleImport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { boards: boardsToImport, folders: foldersToImport, links: linksToImport } = req.body;

    if (!Array.isArray(boardsToImport) || !Array.isArray(foldersToImport) || !Array.isArray(linksToImport)) {
      return res.status(400).json({ error: 'Invalid import format. Expected boards, folders, and links arrays.' });
    }

    // --- DELETION PHASE ---
    const { data: existingBoards, error: fetchError } = await supabase.from('boards').select('id').eq('user_id', userId);
    if (fetchError) throw new Error(`Failed to fetch existing boards: ${fetchError.message}`);
    
    const existingBoardIds = existingBoards.map(b => b.id);
    if (existingBoardIds.length > 0) {
      const { data: existingFolders, error: folderFetchError } = await supabase.from('folders').select('id').in('board_id', existingBoardIds);
      if (folderFetchError) throw new Error(`Failed to fetch existing folders: ${folderFetchError.message}`);

      const existingFolderIds = existingFolders.map(f => f.id);
      if (existingFolderIds.length > 0) {
        const { error: linksDeleteError } = await supabase.from('links').delete().in('folder_id', existingFolderIds);
        if (linksDeleteError) throw new Error(`Failed to delete existing links: ${linksDeleteError.message}`);
      }

      const { error: foldersDeleteError } = await supabase.from('folders').delete().in('board_id', existingBoardIds);
      if (foldersDeleteError) throw new Error(`Failed to delete existing folders: ${foldersDeleteError.message}`);
    }

    const { error: boardsDeleteError } = await supabase.from('boards').delete().eq('user_id', userId);
    if (boardsDeleteError) throw new Error(`Failed to delete existing boards: ${boardsDeleteError.message}`);

    // --- INSERTION PHASE ---
    const boardIdMap: { [oldId: string]: string } = {};
    const newBoards = boardsToImport.map(b => {
        const { id, created_at, updated_at, ...rest } = b;
        return { ...rest, user_id: userId };
    });
    const { data: insertedBoards, error: boardInsertError } = await supabase.from('boards').insert(newBoards).select();
    if (boardInsertError) throw new Error(`Board import failed: ${boardInsertError.message}`);
    for (let i = 0; i < boardsToImport.length; i++) {
      boardIdMap[boardsToImport[i].id] = insertedBoards[i].id;
    }

    const folderIdMap: { [oldId: string]: string } = {};
    const newFolders = foldersToImport.map(f => {
        const { id, created_at, updated_at, ...rest } = f;
        return { ...rest, board_id: boardIdMap[f.board_id] };
    });
    const { data: insertedFolders, error: folderInsertError } = await supabase.from('folders').insert(newFolders).select();
    if (folderInsertError) throw new Error(`Folder import failed: ${folderInsertError.message}`);
    for (let i = 0; i < foldersToImport.length; i++) {
      folderIdMap[foldersToImport[i].id] = insertedFolders[i].id;
    }

    const newLinks = linksToImport.map(l => {
        const { id, created_at, updated_at, ...rest } = l;
        return { ...rest, folder_id: folderIdMap[l.folder_id] };
    });
    const { data: insertedLinks, error: linkInsertError } = await supabase.from('links').insert(newLinks).select();
    if (linkInsertError) throw new Error(`Link import failed: ${linkInsertError.message}`);

    res.status(200).json({ 
      message: 'Data restored successfully', 
      counts: { boards: insertedBoards.length, folders: insertedFolders.length, links: insertedLinks.length }
    });

  } catch (error: any) {
    res.status(500).json({ error: `Import failed: ${error.message}` });
  }
};
