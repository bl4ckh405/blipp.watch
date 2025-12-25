import { supabase } from './supabase'

export interface VideoData {
  id: string
  creator_id: string
  video_url: string
  thumbnail_url?: string
  title: string
  description?: string
  is_tradeable: boolean
  market_address?: string
  market_created_at?: string
  views: number
  likes: number
  created_at: string
}

export async function createVideo(
  creatorId: string,
  videoUrl: string,
  title: string,
  description: string,
  isTradeable: boolean
): Promise<VideoData | null> {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      creator_id: creatorId,
      video_url: videoUrl,
      title,
      description,
      is_tradeable: isTradeable,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getVideosByCreator(creatorId: string): Promise<VideoData[]> {
  const { data } = await supabase
    .from('videos')
    .select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })

  return data || []
}

export async function updateVideoMarket(
  videoId: string,
  marketAddress: string
): Promise<VideoData | null> {
  const { data, error } = await supabase
    .from('videos')
    .update({
      market_address: marketAddress,
      market_created_at: new Date().toISOString(),
      is_tradeable: true,
    })
    .eq('id', videoId)
    .select()
    .single()

  if (error) throw error
  return data
}
