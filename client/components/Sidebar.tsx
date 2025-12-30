
import React, { useEffect, useState } from 'react';
import { HomeIcon, DiamondIcon, CompassIcon, LiveIcon } from './Icons';
import { Page, User } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { getSuggestedUsers, getFollowingUsers } from '@/lib/user-service';
import { UserProfile } from '@/lib/supabase-auth';

interface NavItemProps {
  icon: React.ReactNode;
  label: Page | 'LIVE';
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick }) => (
  <button onClick={onClick} className={`flex items-center space-x-4 p-3 rounded-lg transition-colors text-lg w-full text-left ${active ? 'bg-zinc-800 font-bold text-white' : 'hover:bg-zinc-800 text-zinc-300'}`}>
    {icon}
    <span>{label}</span>
  </button>
);

const AccountItem: React.FC<{ avatar: string; username: string; status?: string; onClick?: () => void }> = ({ avatar, username, status, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-zinc-800 w-full text-left">
        <div className="relative">
            <img src={avatar} alt={username} className="w-10 h-10 rounded-full" />
            {status === 'live' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900"></div>}
        </div>
        <div className="flex-1">
            <p className="font-semibold text-sm">{username}</p>
            {status && <p className="text-xs text-zinc-400 capitalize">{status}</p>}
        </div>
    </button>
);

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, currentUser, setSelectedProfileUsername } = useAppContext();
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [followingUsers, setFollowingUsers] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    const suggested = await getSuggestedUsers(currentUser?.id || null, 5);
    setSuggestedUsers(suggested);
    
    if (currentUser?.id) {
      const following = await getFollowingUsers(currentUser.id);
      setFollowingUsers(following);
    }
  };

  const handleUserClick = (username: string) => {
    setSelectedProfileUsername(username);
    setCurrentPage('Profile');
  };
  
  return (
    <aside className="hidden md:flex flex-col w-64 bg-black p-4 border-r border-zinc-800 space-y-6">
      <nav className="space-y-2">
        <NavItem icon={<HomeIcon className="w-7 h-7" />} label="For You" active={currentPage === 'For You'} onClick={() => setCurrentPage('For You')} />
        {/* <NavItem icon={<DiamondIcon className="w-7 h-7" />} label="Alpha Feed" active={currentPage === 'Alpha Feed'} onClick={() => setCurrentPage('Alpha Feed')} /> */}
        <NavItem icon={<CompassIcon className="w-7 h-7" />} label="Explore" active={currentPage === 'Explore'} onClick={() => setCurrentPage('Explore')} />
        <NavItem icon={<LiveIcon className="w-7 h-7 text-rose-500" />} label="LIVE" active={currentPage === 'LIVE'} onClick={() => setCurrentPage('LIVE')} />
      </nav>
      
      <div className="border-t border-zinc-800 my-4"></div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <div>
            <h3 className="text-sm font-semibold text-zinc-400 px-3 mb-2">Suggested accounts</h3>
            <div className="space-y-1">
                {suggestedUsers.map(user => (
                  <AccountItem 
                    key={user.id}
                    avatar={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    username={user.username}
                    onClick={() => handleUserClick(user.username)}
                  />
                ))}
                {suggestedUsers.length === 0 && (
                  <p className="text-xs text-zinc-500 px-3">No suggestions yet.</p>
                )}
            </div>
        </div>
        
        <div>
            <h3 className="text-sm font-semibold text-zinc-400 px-3 mb-2">🦍 My Apes</h3>
             <div className="space-y-1">
                {followingUsers.map(user => (
                  <AccountItem 
                    key={user.id}
                    avatar={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    username={user.username}
                    onClick={() => handleUserClick(user.username)}
                  />
                ))}
                {followingUsers.length === 0 && (
                  <p className="text-xs text-zinc-500 px-3">You haven't aped into anyone yet.</p>
                )}
            </div>
        </div>
      </div>

    </aside>
  );
};
