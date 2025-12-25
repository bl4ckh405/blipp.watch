
import { User, Video, ChatMessage } from '@/types';

// USERS
export const PROFILE_USER: User = {
    username: 'creatorcove',
    avatarUrl: 'https://picsum.photos/seed/creatorcove/100/100',
    followingCount: 120,
    followerCount: 2340000,
    likeCount: 56900000,
    bio: 'Just creating cool stuff and sharing it with the world. Join the journey! ✨'
};

const user1: User = { username: 'urbanexplorer', avatarUrl: 'https://picsum.photos/seed/user1/100/100' };
const user2: User = { username: 'travelbug', avatarUrl: 'https://picsum.photos/seed/user2/100/100' };
const user3: User = { username: 'foodiefan', avatarUrl: 'https://picsum.photos/id/1013/100/100' };
const user4: User = { username: 'artbyvincent', avatarUrl: 'https://picsum.photos/id/1040/100/100' };

export const SUGGESTED_USERS: User[] = [
    { username: 'chefgordonramsay', avatarUrl: 'https://picsum.photos/id/1011/100/100' },
    { username: 'skydiverjane', avatarUrl: 'https://picsum.photos/id/237/100/100' },
    { username: 'codingwizard', avatarUrl: 'https://picsum.photos/id/433/100/100' },
    user4,
];

export const ALL_MOCK_USERS: User[] = [
    PROFILE_USER,
    user1,
    user2,
    user3,
    user4,
    ...SUGGESTED_USERS,
    { username: 'designerdan', avatarUrl: 'https://picsum.photos/id/1012/100/100' },
    { username: 'adventureamy', avatarUrl: 'https://picsum.photos/id/1014/100/100' },
];

const generatePriceHistory = () => {
    const data = [];
    let price = 50 + Math.random() * 50;
    for (let i = 0; i < 30; i++) {
        data.push(price);
        price += (Math.random() - 0.45) * 10;
        if (price < 10) price = 10;
    }
    return data;
};

// VIDEOS
export const MOCK_VIDEOS: Video[] = [
    {
        id: 1,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/thumb1/540/960',
        user: PROFILE_USER,
        description: 'Just enjoying the beautiful sunset views! 🌅 #sunset #nature #travel',
        songTitle: 'Golden Hour - JVKE',
        likes: 1200000,
        comments: 4500,
        shares: 22000,
        views: 7300000,
        isTradeable: true,
        marketCap: 12500000,
        volume24h: 850000,
        liquidity: 3200000,
        priceHistory: generatePriceHistory(),
    },
    {
        id: 2,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/thumb2/540/960',
        user: user1,
        description: 'Exploring the hidden alleys of the city. So much history here!',
        songTitle: 'City Lights - Uppbeat',
        likes: 85000,
        comments: 1200,
        shares: 5400,
        views: 1200000,
        isTradeable: true,
        marketCap: 2300000,
        volume24h: 120000,
        liquidity: 500000,
        priceHistory: generatePriceHistory(),
    },
    {
        id: 3,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/thumb3/540/960',
        user: user2,
        description: 'Found this incredible waterfall on my last hike. 🏞️ #hiking #adventure',
        songTitle: 'Wanderlust - Instrumental',
        likes: 230000,
        comments: 3200,
        shares: 15000,
        views: 4500000,
        isTradeable: false,
    },
    {
        id: 4,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/thumb4/540/960',
        user: PROFILE_USER,
        description: 'Unboxing the new tech gadget everyone is talking about! 🤯',
        songTitle: 'Upbeat Tech - Alex Productions',
        likes: 450000,
        comments: 8900,
        shares: 25000,
        views: 9800000,
        isTradeable: true,
        marketCap: 5500000,
        volume24h: 430000,
        liquidity: 1100000,
        priceHistory: generatePriceHistory(),
    },
    {
        id: 5,
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'https://picsum.photos/seed/thumb5/540/960',
        user: user3,
        description: 'Trying the viral recipe! Did it work? Watch to find out! 🍝',
        songTitle: 'Cooking Time - FASSounds',
        likes: 180000,
        comments: 6500,
        shares: 9800,
        views: 3200000,
        isTradeable: false,
    }
];

export const REPOSTED_VIDEOS: Video[] = MOCK_VIDEOS.slice(2, 4).map(v => ({...v, id: v.id + 100}));

// HASHTAGS
export const TRENDING_HASHTAGS: string[] = [
    'SummerVibes', 'DIYProject', 'TechUnboxing', 'TravelGoals', 'ComedySketch', 'FitCheck', 'LifeHack'
];

// CHAT MESSAGES
export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
    { id: 1, user: user1, type: 'comment', message: 'This is amazing! 🔥' },
    { id: 2, user: user2, type: 'comment', message: 'Wow, such talent!' },
    { id: 3, user: user3, type: 'gift', giftAmount: 10 },
    { id: 4, user: SUGGESTED_USERS[0], type: 'subscription' },
    { id: 5, user: SUGGESTED_USERS[1], type: 'comment', message: 'I could watch this all day' },
    { id: 6, user: SUGGESTED_USERS[2], type: 'comment', message: 'Where can I learn to do this?' },
    { id: 7, user: ALL_MOCK_USERS[6], type: 'gift', giftAmount: 100 },
];
