
export interface User {
  username: string;
  avatarUrl: string;
  followerCount?: number;
  followingCount?: number;
  likeCount?: number;
  bio?: string;
}

export interface Video {
  id: number;
  videoId?: string; // Original UUID for blockchain operations
  videoUrl: string;
  thumbnailUrl: string;
  user: User;
  description: string;
  songTitle: string;
  likes: number;
  comments: number;
  shares: number;
  views?: number;
  isTradeable: boolean;
  marketCap?: number;
  volume24h?: number;
  liquidity?: number;
  priceHistory?: number[];
  marketAddress?: string;
  marketCreatedAt?: string;
}

export interface MarketInfo {
  creator: string;
  aptosReserve: string;
  tokenReserve: string;
  totalSold: string;
  graduated: boolean;
}

export type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

export type Page = 'For You' | 'Alpha Feed' | 'Explore' | 'LIVE' | 'Profile';

export interface VideoIdea {
  title: string;
  description: string;
}

export interface ChatMessage {
  id: number;
  user: User;
  type: 'comment' | 'gift' | 'subscription';
  message?: string;
  giftAmount?: number;
}
