
import React, { useState, useEffect } from 'react';
import { MusicNoteIcon, HeartIcon, SendIcon, LoadingIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getVideoComments, addComment, Comment as CommentType } from '@/lib/comment-service';

interface CommentProps {
    avatar: string;
    username: string;
    text: string;
    createdAt: string;
}

const Comment: React.FC<CommentProps> = ({ avatar, username, text, createdAt }) => {
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex items-start space-x-3 py-4">
            <img src={avatar} alt={username} className="w-9 h-9 rounded-full" />
            <div className="flex-1">
                <p className="font-semibold text-sm">@{username}</p>
                <p className="text-sm text-zinc-200">{text}</p>
                <div className="flex items-center space-x-4 text-xs text-zinc-400 mt-2">
                    <span>{formatTime(createdAt)}</span>
                </div>
            </div>
        </div>
    );
};

const SkeletonLoader: React.FC = () => (
    <div className="p-6 animate-pulse">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-zinc-700"></div>
                <div>
                    <div className="h-4 w-24 bg-zinc-700 rounded mb-2"></div>
                    <div className="h-3 w-16 bg-zinc-700 rounded"></div>
                </div>
            </div>
            <div className="h-9 w-24 bg-zinc-700 rounded-lg"></div>
        </div>
        <div className="h-4 w-full bg-zinc-700 rounded mb-2"></div>
        <div className="h-4 w-3/4 bg-zinc-700 rounded mb-4"></div>
        <div className="h-5 w-1/2 bg-zinc-700 rounded"></div>
    </div>
)

export const DetailsColumn: React.FC = () => {
    const { activeVideo: video, followedUsers, handleFollowToggle, setCurrentPage, setSelectedProfileUsername } = useAppContext();
    const { account, connected } = useWallet();
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowingLoading, setIsFollowingLoading] = useState(false);
    const [comments, setComments] = useState<CommentType[]>([]);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        if (video) {
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [video]);

    // Load real comments when video changes
    useEffect(() => {
        if (video?.videoId) {
            loadComments();
        }
    }, [video?.videoId]);

    const loadComments = async () => {
        if (!video?.videoId) return;
        const fetchedComments = await getVideoComments(video.videoId);
        setComments(fetchedComments);
    };

    const handleFollowClick = async () => {
        if (!video) return;
        setIsFollowingLoading(true);
        await handleFollowToggle(video.user.username);
        setIsFollowingLoading(false);
    };

    const handleUsernameClick = () => {
        if (!video) return;
        setSelectedProfileUsername(video.user.username);
        setCurrentPage('Profile');
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!connected || !account) {
            alert('Please connect your wallet to comment');
            return;
        }

        if (!video?.videoId || !commentText.trim()) return;

        setIsSubmitting(true);
        const comment = await addComment(video.videoId, account.address.toString(), commentText.trim());

        if (comment) {
            setComments([comment, ...comments]); // Add to top
            setCommentText('');
        }

        setIsSubmitting(false);
    };

    const formatWallet = (wallet: string) => {
        return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    };

    if (!video) {
        return (
            <aside className="hidden lg:flex flex-col bg-black border-l border-zinc-800 p-6">
                <div className="flex items-center justify-center h-full text-zinc-500">
                    <p>Select a video to see details.</p>
                </div>
            </aside>
        );
    }

    const isFollowing = followedUsers.has(video.user.username);

    return (
        <aside className="hidden lg:flex flex-col bg-black border-l border-zinc-800 h-full">
            <div className="shrink-0">
                {isLoading ? <SkeletonLoader /> : (
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                <img
                                    src={video.user.avatarUrl}
                                    className="w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                                    alt={video.user.username}
                                    onClick={handleUsernameClick}
                                />
                                <div>
                                    <p
                                        className="font-bold text-lg cursor-pointer hover:text-emerald-400 transition-colors"
                                        onClick={handleUsernameClick}
                                    >
                                        @{video.user.username}
                                    </p>
                                    <p className="text-sm text-zinc-400">Original Video</p>
                                </div>
                            </div>
                            <button
                                onClick={handleFollowClick}
                                disabled={isFollowingLoading}
                                className={`font-bold px-5 py-2 rounded-lg text-sm transition-colors w-24 flex items-center justify-center
                            ${isFollowing
                                        ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                                        : 'bg-emerald-500 text-black hover:bg-emerald-600'}
                            ${isFollowingLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            >
                                {isFollowingLoading ? <LoadingIcon className="w-5 h-5 animate-spin" /> : (isFollowing ? 'Following' : 'Follow')}
                            </button>
                        </div>
                        <p className="text-sm">{video.description}</p>
                        <div className="flex items-center space-x-2">
                            <MusicNoteIcon className="w-5 h-5" />
                            <p className="text-sm font-semibold">{video.songTitle}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col overflow-y-hidden border-t border-zinc-800">
                <h3 className="text-base font-semibold p-4 shrink-0 sticky top-0 bg-black z-10 border-b border-zinc-800">
                    Comments ({comments.length})
                </h3>
                <div className="flex-1 overflow-y-auto px-6 space-y-2 scrollbar-hide">
                    {comments.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500">
                            <p>No comments yet. Be the first!</p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <Comment
                                key={comment.id}
                                avatar={`https://api.dicebear.com/7.x/identicon/svg?seed=${comment.user_id}`}
                                username={formatWallet(comment.user_id)}
                                text={comment.content}
                                createdAt={comment.created_at}
                            />
                        ))
                    )}
                </div>
                <form onSubmit={handleCommentSubmit} className="p-4 border-t border-zinc-800 shrink-0 bg-black">
                    <div className="relative flex items-center">
                        {connected && account ? (
                            <img
                                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${account.address}`}
                                className="w-9 h-9 rounded-full mr-3"
                                alt="Your avatar"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-zinc-700 mr-3" />
                        )}
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={connected ? "Add a comment..." : "Connect wallet to comment"}
                            disabled={!connected || isSubmitting}
                            className="w-full pl-4 pr-12 py-3 bg-zinc-800 rounded-full border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-shadow disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!connected || !commentText.trim() || isSubmitting}
                            className="absolute right-3 text-zinc-400 hover:text-emerald-400 disabled:text-zinc-600 transition-colors"
                            aria-label="Send comment"
                        >
                            {isSubmitting ? (
                                <LoadingIcon className="w-6 h-6 animate-spin" />
                            ) : (
                                <SendIcon className="w-6 h-6" />
                            )}
                        </button>
                    </div>
                </form>
            </div>

        </aside>
    );
};
