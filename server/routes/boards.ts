import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const getBoardBySlug = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id; // Assuming authMiddleware has populated req.user

    const { data: board, error } = await supabase
      .from('boards')
      .select('*')
      .eq('slug', slug)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return res.status(404).json({ error: 'Board not found' });
      }
      throw error;
    }

    res.status(200).json(board);
  } catch (error: any) {
    console.error('Error fetching board by slug:', error);
    res.status(500).json({ error: `Failed to fetch board: ${error.message}` });
  }
};