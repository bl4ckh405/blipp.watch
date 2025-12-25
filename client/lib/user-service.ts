import { supabase } from './supabase'
import { UserProfile } from './supabase-auth'

export async function getSuggestedUsers(currentUserId: string | null, limit: number = 5): Promise<UserProfile[]> {
  let query = supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (currentUserId) {
    query = query.neq('id', currentUserId)
  }
  
  const { data } = await query
  return data || []
}

export async function getFollowingUsers(userId: string): Promise<UserProfile[]> {
  const { data } = await supabase
    .from('follows')
    .select('following_id, users!follows_following_id_fkey(*)')
    .eq('follower_id', userId)
  
  return data?.map(f => f.users).filter(Boolean) || []
}

export async function apeIntoUser(aperId: string, targetId: string): Promise<void> {
  await supabase
    .from('follows')
    .insert({ follower_id: aperId, following_id: targetId })
}

export async function unapeUser(aperId: string, targetId: string): Promise<void> {
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', aperId)
    .eq('following_id', targetId)
}
