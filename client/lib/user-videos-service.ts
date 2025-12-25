import { supabase } from './supabase';
import { VideoData } from './video-service';

/**
 * Fetch videos created by a specific wallet address
 * @param walletAddress - Creator's wallet address
 * @param limit - Maximum number of videos to fetch
 * @param offset - Number of videos to skip
 */
export async function getVideosByCreator(
  walletAddress: string,
  limit: number = 50,
  offset: number = 0
): Promise<VideoData[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('creator_id', walletAddress)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching creator videos:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete a video (only if user is the creator)
 * @param videoId - UUID of the video to delete
 * @param walletAddress - Creator's wallet address for verification
 */
export async function deleteVideo(
  videoId: string,
  walletAddress: string
): Promise<boolean> {
  // First verify the user owns this video
  const { data: video, error: fetchError } = await supabase
    .from('videos')
    .select('creator_id')
    .eq('id', videoId)
    .single();

  if (fetchError || !video) {
    console.error('Error fetching video:', fetchError);
    return false;
  }

  if (video.creator_id !== walletAddress) {
    console.error('User does not own this video');
    return false;
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('creator_id', walletAddress); // Double-check ownership

  if (deleteError) {
    console.error('Error deleting video:', deleteError);
    return false;
  }

  return true;
}

/**
 * Update video details (only if user is the creator)
 * @param videoId - UUID of the video
 * @param walletAddress - Creator's wallet address
 * @param updates - Fields to update
 */
export async function updateVideoDetails(
  videoId: string,
  walletAddress: string,
  updates: {
    title?: string;
    description?: string;
  }
): Promise<VideoData | null> {
  // Verify ownership first
  const { data: video, error: fetchError } = await supabase
    .from('videos')
    .select('creator_id')
    .eq('id', videoId)
    .single();

  if (fetchError || !video || video.creator_id !== walletAddress) {
    console.error('Cannot update: User does not own this video');
    return null;
  }

  // Update the video
  const { data, error } = await supabase
    .from('videos')
    .update(updates)
    .eq('id', videoId)
    .eq('creator_id', walletAddress)
    .select()
    .single();

  if (error) {
    console.error('Error updating video:', error);
    return null;
  }

  return data;
}

/**
 * Get total stats for a creator
 * @param walletAddress - Creator's wallet address
 */
export async function getCreatorStats(walletAddress: string): Promise<{
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  tradeableVideos: number;
}> {
  const { data, error } = await supabase
    .from('videos')
    .select('views, likes, is_tradeable')
    .eq('creator_id', walletAddress);

  if (error || !data) {
    console.error('Error fetching creator stats:', error);
    return {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      tradeableVideos: 0,
    };
  }

  return {
    totalVideos: data.length,
    totalViews: data.reduce((sum, v) => sum + (v.views || 0), 0),
    totalLikes: data.reduce((sum, v) => sum + (v.likes || 0), 0),
    tradeableVideos: data.filter((v) => v.is_tradeable).length,
  };
}

/**
 * Check if a video belongs to a wallet address
 * @param videoId - UUID of the video
 * @param walletAddress - Wallet address to check
 */
export async function isVideoOwner(
  videoId: string,
  walletAddress: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('videos')
    .select('creator_id')
    .eq('id', videoId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.creator_id === walletAddress;
}
