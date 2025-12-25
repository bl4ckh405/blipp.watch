import { supabase } from './supabase';

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;  // Changed from user_wallet
  content: string;  // Changed from comment_text
  created_at: string;
}

/**
 * Get comments for a video
 */
export async function getVideoComments(videoId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  return data || [];
}

/**
 * Add a comment to a video
 */
export async function addComment(
  videoId: string,
  userWallet: string,
  commentText: string
): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      video_id: videoId,
      user_id: userWallet,  // Changed from user_wallet
      content: commentText,  // Changed from comment_text
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }

  return data;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    return false;
  }

  return true;
}

/**
 * Get comment count for a video
 */
export async function getCommentCount(videoId: string): Promise<number> {
  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('video_id', videoId);

  if (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }

  return count || 0;
}
