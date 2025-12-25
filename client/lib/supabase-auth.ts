import { supabase } from './supabase'

export interface UserProfile {
  id: string
  wallet_address: string
  username: string
  avatar_url?: string
  bio?: string
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle()

  return !data
}

export async function createUser(walletAddress: string, username: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      wallet_address: walletAddress,
      username: username,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserByWallet(walletAddress: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .maybeSingle()

  return data
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle()  // Changed from .single() to avoid errors

  if (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }

  return data;
}
