import { supabase } from './supabase';
import { VideoData } from './video-service';
import { Video, User } from '@/types';

/**
 * Fetch all videos from the database
 * @param limit - Maximum number of videos to fetch
 * @param offset - Number of videos to skip
 */
export async function getAllVideos(limit: number = 20, offset: number = 0): Promise<VideoData[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching videos:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch only tradeable videos
 */
export async function getTradeableVideos(limit: number = 20, offset: number = 0): Promise<VideoData[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('is_tradeable', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching tradeable videos:', error);
    return [];
  }

  return data || [];
}

/**
 * Transform database VideoData to frontend Video type
 */
/**
 * Transform database VideoData to frontend Video type
 */
export function transformVideoData(dbVideo: VideoData, userProfile?: { username: string, avatar_url?: string }): Video {
  // Use provided profile, or fallback to generating from address (legacy behavior)
  const username = userProfile?.username || dbVideo.creator_id.slice(0, 8);
  const avatarUrl = userProfile?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${dbVideo.creator_id}`;

  const user: User = {
    username,
    avatarUrl,
  };

  return {
    id: parseInt(dbVideo.id.replace(/-/g, '').slice(0, 8), 16), // Convert UUID to number for display
    videoId: dbVideo.id, // Keep original UUID for blockchain operations
    videoUrl: dbVideo.video_url,
    thumbnailUrl: dbVideo.thumbnail_url || dbVideo.video_url, // Use video URL as thumbnail if no thumbnail
    user,
    description: dbVideo.description || dbVideo.title,
    songTitle: 'Original Sound', // Default since we don't track this yet
    likes: dbVideo.likes,
    comments: 0, // We don't have comments yet
    shares: 0, // We don't have shares yet
    views: dbVideo.views,
    isTradeable: dbVideo.is_tradeable,
    marketAddress: dbVideo.market_address || undefined,
    marketCreatedAt: dbVideo.market_created_at || undefined,
  };
}

/**
 * Fetch and transform videos for the feed
 */
export async function getFeedVideos(page: number = 0, pageSize: number = 10): Promise<{ videos: Video[]; hasMore: boolean }> {
  const offset = page * pageSize;
  const limit = pageSize + 1; // Fetch one extra to check if there are more

  const dbVideos = await getAllVideos(limit, offset);

  // Check if there are more videos
  const hasMore = dbVideos.length > pageSize;

  // Only return pageSize number of videos
  const videosToReturn = dbVideos.slice(0, pageSize);

  // Fetch user profiles for these videos
  const creatorIds = Array.from(new Set(videosToReturn.map(v => v.creator_id)));
  console.log('🔍 feed-service: Looking up creatorIds:', creatorIds);

  let userMap = new Map<string, { username: string, avatar_url?: string }>();

  if (creatorIds.length > 0) {
    const { data: users, error } = await supabase
      .from('users')
      .select('wallet_address, username, avatar_url')
      .in('wallet_address', creatorIds);

    if (error) {
      console.error('❌ feed-service: Error fetching users:', error);
    }

    if (users) {
      console.log('✅ feed-service: Found users:', users);
      users.forEach(u => {
        if (u.wallet_address) {
          userMap.set(u.wallet_address, { username: u.username, avatar_url: u.avatar_url || undefined });
        }
      });
    } else {
      console.log('⚠️ feed-service: No users found for ids');
    }
  }

  // Transform to frontend format with user data
  const videos = videosToReturn.map(v => transformVideoData(v, userMap.get(v.creator_id)));

  return {
    videos,
    hasMore,
  };
}

/**
 * Increment view count for a video
 */
export async function incrementVideoViews(videoId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_video_views', {
    video_id: videoId
  });

  if (error) {
    console.error('Error incrementing views:', error);
  }
}

/**
 * Increment like count for a video
 */
export async function incrementVideoLikes(videoId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_video_likes', {
    video_id: videoId
  });

  if (error) {
    console.error('Error incrementing likes:', error);
  }
}
