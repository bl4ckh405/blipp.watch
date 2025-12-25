import React from 'react';
import { HomeIcon, DiamondIcon, CompassIcon, UserCircleIcon, LiveIcon } from './Icons';
import { Page } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: Page | 'Profile';
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active = false, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center space-y-1 w-full transition-colors ${active ? 'text-white' : 'text-zinc-400 hover:text-white'}`}>
    {icon}
    <span className={`text-xs font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
  </button>
);

export const BottomNav: React.FC = () => {
  const { currentPage, setCurrentPage } = useAppContext();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-zinc-800 flex justify-between items-center px-6 py-3 z-30 pb-safe">
        <NavItem icon={<HomeIcon className="w-6 h-6" />} label="For You" active={currentPage === 'For You'} onClick={() => setCurrentPage('For You')} />
        <NavItem icon={<DiamondIcon className="w-6 h-6" />} label="Alpha Feed" active={currentPage === 'Alpha Feed'} onClick={() => setCurrentPage('Alpha Feed')} />
        
        {/* Centered LIVE button */}
        <div className="relative -top-4">
            <button 
                onClick={() => setCurrentPage('LIVE')}
                className={`flex items-center justify-center w-14 h-14 rounded-full border-4 border-black ${currentPage === 'LIVE' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' : 'bg-zinc-800 text-white'}`}
            >
                <LiveIcon className="w-8 h-8" />
            </button>
        </div>

        <NavItem icon={<CompassIcon className="w-6 h-6" />} label="Explore" active={currentPage === 'Explore'} onClick={() => setCurrentPage('Explore')} />
        <NavItem icon={<UserCircleIcon className="w-6 h-6" />} label="Profile" active={currentPage === 'Profile'} onClick={() => setCurrentPage('Profile')} />
    </nav>
  );
};