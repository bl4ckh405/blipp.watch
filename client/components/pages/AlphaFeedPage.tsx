
import React, { useState } from 'react';
import { Feed } from '../Feed';
import { Video, User } from '../../types';
import { SUGGESTED_USERS } from '../../constants';
import { DiamondIcon, UserPlusIcon, LoadingIcon } from '../Icons';
import { useAppContext } from '../../contexts/AppContext';

interface AlphaFeedPageProps {
  videos: Video[];
  loadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
}

const SuggestedCreatorCard: React.FC<{ user: User }> = ({ user }) => {
    const { handleFollowToggle } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    
    const handleFollow = async () => {
        setIsLoading(true);
        await handleFollowToggle(user.username);
        setIsLoading(false);
    };

    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex flex-col items-center text-center transition-transform hover:scale-105 hover:bg-zinc-700">
            <img src={user.avatarUrl} alt={user.username} className="w-20 h-20 rounded-full mb-3" />
            <p className="font-bold text-white">@{user.username}</p>
            <p className="text-xs text-zinc-400 mb-4">Suggested for you</p>
            <button 
                onClick={handleFollow}
                disabled={isLoading}
                className="flex items-center justify-center space-x-2 w-full bg-emerald-500 text-black font-bold px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:bg-emerald-500/50 disabled:cursor-not-allowed"
            >
                {isLoading ? <LoadingIcon className="w-4 h-4 animate-spin" /> : <UserPlusIcon className="w-4 h-4" />}
                <span>{isLoading ? 'Following...' : 'Follow'}</span>
            </button>
        </div>
    );
};

const EmptyState: React.FC = () => (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 text-center">
        <div className="inline-block p-4 bg-zinc-800 rounded-full mb-4">
          <DiamondIcon className="w-12 h-12 text-emerald-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Your Alpha Feed is Empty</h1>
        <p className="mt-2 text-lg text-zinc-400 max-w-2xl mx-auto">
            You're not following anyone yet. Follow creators to see their latest videos right here and build your own curated feed.
        </p>
        <div className="border-t border-zinc-800 my-8"></div>
        <h2 className="text-xl font-bold text-white mb-4">Get Started by Following a Creator</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SUGGESTED_USERS.map(user => <SuggestedCreatorCard key={user.username} user={user} />)}
        </div>
    </div>
);

export const AlphaFeedPage: React.FC<AlphaFeedPageProps> = (props) => {
  const { followedUsers } = useAppContext();
  const followedCount = followedUsers.size;

  if (followedCount === 0 && !props.isLoading) {
    return <EmptyState />;
  }

  return (
    <Feed 
      videos={props.videos} 
      loadMore={props.loadMore} 
      isLoading={props.isLoading} 
      hasMore={props.hasMore} 
    />
  );
};
