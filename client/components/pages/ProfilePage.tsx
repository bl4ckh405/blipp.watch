
import React, { useState, useEffect } from 'react';
import { VideoThumbnail } from '../VideoThumbnail';
import { GridIcon, RepeatIcon, ShareProfileIcon, DollarIcon, VerifiedIcon, LoadingIcon, PlayIcon } from '../Icons';
import { useAppContext } from '../../contexts/AppContext';
import { getUserByUsername } from '@/lib/supabase-auth';
import { getVideosByCreator } from '@/lib/video-service';
import { UserProfile } from '@/lib/supabase-auth';
import { VideoData } from '@/lib/video-service';

type ProfileTab = 'posts' | 'reposts';

const StatItem: React.FC<{ value: string; label: string }> = ({ value, label }) => (
    <div className="text-center md:text-left">
        <span className="font-bold text-xl md:text-2xl">{value}</span>
        <span className="text-zinc-400 ml-2">{label}</span>
    </div>
);

const TabButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center space-x-2 py-3 font-semibold border-b-2 transition-colors ${isActive ? 'text-white border-white' : 'text-zinc-400 border-transparent hover:border-zinc-700 hover:text-white'}`}>
        {icon}
        <span>{label}</span>
    </button>
);


interface ProfilePageProps {
    username?: string;
    onVideoClick?: (video: any) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ username, onVideoClick }) => {
    const { followedUsers, handleFollowToggle, currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
    const [isFollowingLoading, setIsFollowingLoading] = useState(false);
    const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
    const [videos, setVideos] = useState<VideoData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, [username]);

    const loadProfile = async () => {
        setLoading(true);
        const targetUsername = username || currentUser?.username;

        try {
            let user = null;

            // Try to get user by username first
            if (targetUsername) {
                user = await getUserByUsername(targetUsername);
            }

            // If no user found and we have currentUser wallet, try wallet lookup
            if (!user && !username && currentUser?.wallet) {
                const { getUserByWallet } = await import('@/lib/supabase-auth');
                user = await getUserByWallet(currentUser.wallet);
            }

            if (user) {
                setProfileUser(user);
                // Fix: Videos are stored with wallet_address as creator_id, not the user UUID
                console.log('  🔍 Fetching videos for wallet:', user.wallet_address);
                const userVideos = await getVideosByCreator(user.wallet_address);
                setVideos(userVideos);
                console.log('  ✅ Profile loaded for:', user.username, 'with', userVideos.length, 'videos');
            } else {
                console.error('No user found for:', targetUsername || currentUser?.wallet);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }

        setLoading(false);
    };

    const handleVideoSelect = async (videoData: VideoData) => {
        if (!onVideoClick || !profileUser) return;

        // Dynamically import transform to avoid circular dependencies if any
        const { transformVideoData } = await import('@/lib/feed-service');

        const video = transformVideoData(videoData, {
            username: profileUser.username,
            avatar_url: profileUser.avatar_url
        });

        onVideoClick(video);
    };

    const formatCount = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const isFollowing = profileUser ? followedUsers.has(profileUser.username) : false;

    const handleFollowClick = async () => {
        if (!profileUser || profileUser.id === currentUser?.id) return;
        setIsFollowingLoading(true);
        await handleFollowToggle(profileUser.username);
        setIsFollowingLoading(false);
    };

    const isOwnProfile = profileUser?.id === currentUser?.id;

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <LoadingIcon className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
        );
    }

    if (!profileUser) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <p className="text-zinc-400">User not found</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto scrollbar-hide bg-zinc-900 pb-24 md:pb-0">
            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Profile Header */}
                <header className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-8">
                    <img src={profileUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`} alt={profileUser.username} className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-zinc-800" />
                    <div className="flex-1 flex flex-col items-center md:items-start w-full">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-3xl font-extrabold tracking-tight">{profileUser.username}</h1>
                        </div>
                        <div className="flex items-center space-x-6 my-4">
                            <StatItem value={formatCount(0)} label="Apes" />
                            <StatItem value={formatCount(0)} label="Ape Army" />
                            <StatItem value={formatCount(videos.reduce((sum, v) => sum + v.likes, 0))} label="Likes" />
                        </div>
                        <p className="text-zinc-300 text-center md:text-left max-w-md">{profileUser.bio || 'No bio yet'}</p>

                        <div className="flex items-center gap-2 mt-5 w-full md:w-auto">
                            {!isOwnProfile && (
                                <button
                                    onClick={handleFollowClick}
                                    disabled={isFollowingLoading}
                                    className={`font-bold px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5
                                  ${isFollowing
                                            ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                                            : 'bg-emerald-500 text-black hover:bg-emerald-600'
                                        }
                                  ${isFollowingLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                  `}
                                >
                                    {isFollowingLoading ? <LoadingIcon className="w-5 h-5 animate-spin" /> : (
                                        isFollowing ? 'Aped In 🦍' : '🚀 Ape In'
                                    )}
                                </button>
                            )}
                            {!isOwnProfile && (
                                <button className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 font-semibold px-4 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors border border-emerald-500/30">
                                    <DollarIcon className="w-4 h-4" />
                                    <span>Tip</span>
                                </button>
                            )}
                            <button className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                                <ShareProfileIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Tabs */}
                <div className="mt-10 border-b border-zinc-800">
                    <div className="flex">
                        <TabButton icon={<GridIcon className="w-5 h-5" />} label="Posts" isActive={activeTab === 'posts'} onClick={() => setActiveTab('posts')} />
                        <TabButton icon={<RepeatIcon className="w-5 h-5" />} label="Reposts" isActive={activeTab === 'reposts'} onClick={() => setActiveTab('reposts')} />
                    </div>
                </div>

                {/* Video Grid */}
                <div className="mt-6">
                    {videos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                            <GridIcon className="w-16 h-16 mb-4" />
                            <p>No videos yet</p>
                        </div>
                    ) : (
                        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                            {videos.map(video => (
                                <div
                                    key={video.id}
                                    className="break-inside-avoid cursor-pointer hover:scale-105 transition-transform duration-200"
                                    onClick={() => handleVideoSelect(video)}
                                >
                                    <div className="bg-zinc-800 rounded-lg overflow-hidden relative group aspect-[9/16]">
                                        {video.video_url ? (
                                            <video
                                                src={video.video_url}
                                                className="w-full h-full object-cover"
                                                muted
                                                loop
                                                playsInline
                                                onMouseOver={(e) => e.currentTarget.play()}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.pause();
                                                    e.currentTarget.currentTime = 0;
                                                }}
                                            />
                                        ) : video.thumbnail_url ? (
                                            <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                                                <span className="text-zinc-500">Video</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 pointer-events-none" />
                                        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                                            <div className="flex items-center text-white text-xs drop-shadow-md">
                                                <PlayIcon className="w-3 h-3 mr-1" />
                                                <span className="font-semibold">{formatCount(video.views)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold mt-2 truncate text-zinc-100">{video.title}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
