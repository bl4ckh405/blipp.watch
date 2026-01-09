'use client';

import React from 'react';
import { CoinIcon, SparklesIcon, SearchIcon } from './Icons';
import { useAppContext } from '../contexts/AppContext';
import { Web3SignIn } from './Web3SignIn';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserByWallet, createUser } from '@/lib/supabase-auth';
import { useWallet } from './WalletProvider';

const EarningsDisplay: React.FC<{ earnings: number }> = ({ earnings }) => (
  <div className="flex items-center space-x-2 bg-zinc-800 px-4 py-2 rounded-full">
    <CoinIcon className="w-6 h-6 text-yellow-400" />
    <span className="font-bold text-lg text-white tabular-nums">
      {earnings.toFixed(4)}
    </span>
  </div>
);

export const Header: React.FC = () => {
  const { openCreatorDashboard, isAuthenticated, currentUser, setCurrentUser } = useAppContext();
  const { connected, walletAddress, balanceAPT, disconnect } = useWallet();
  const earnings = 12.3456;
  const [showAuth, setShowAuth] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync wallet connection with user authentication
  useEffect(() => {
    const syncUser = async () => {
      if (connected && walletAddress && !currentUser) {
        console.log('🔄 Syncing user for wallet:', walletAddress);
        try {
          // Try to get existing user
          let user = await getUserByWallet(walletAddress);
          console.log('👤 Existing user:', user);

          // If user doesn't exist, create one
          if (!user) {
            const username = `user_${walletAddress.slice(0, 8)}`;
            console.log('➕ Creating new user with username:', username);
            user = await createUser(walletAddress, username);
            console.log('✅ User created:', user);
          }

          if (user) {
            setCurrentUser({
              id: user.id,
              username: user.username,
              wallet: walletAddress
            });
            console.log('✅ Current user set:', user.username);
            setShowAuth(false); // Close auth modal when user is set
          }
        } catch (error) {
          console.error('❌ Error syncing user:', error);
        }
      } else if (!connected && currentUser) {
        console.log('🚪 Wallet disconnected, clearing user');
        // Clear user when wallet disconnects
        setCurrentUser(null);
      }
    };

    syncUser();
  }, [connected, walletAddress, currentUser, setCurrentUser]);



  return (
    <header className="w-full bg-black p-3 z-20 border-b border-zinc-800 shrink-0">
      <div className="flex justify-between items-center">
        <div className="w-64">
          <h1 className="text-2xl font-extrabold tracking-tighter">
            blipp<span className="text-emerald-400">.</span>watch
          </h1>
        </div>

        <div className="flex-1 flex justify-center px-4">
          <div className="w-full max-w-lg relative">
            <input
              type="text"
              placeholder="Search accounts and videos"
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 rounded-full border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <SearchIcon className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 w-64">
          <button
            onClick={openCreatorDashboard}
            className="hidden md:flex items-center gap-1.5 bg-linear-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-black font-semibold text-sm px-3.5 py-1.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-linear-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10">Creator Dashboard</span>
          </button>
          {mounted && isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full p-1 pl-4 pr-1">
              <span className="text-zinc-400 font-semibold text-sm">@{currentUser?.username}</span>
              <button
                onClick={() => disconnect()}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-full transition-all"
                title="Disconnect Wallet"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          ) : mounted ? (
            <button
              onClick={() => setShowAuth(!showAuth)}
              className="bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-semibold text-sm px-4 py-1.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center gap-1.5 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-linear-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10">Sign In</span>
            </button>
          ) : (
            <div className="w-20 h-8"></div>
          )}
        </div>
      </div>
      {showAuth && !isAuthenticated && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-scale-in">
          <div className="bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-3xl shadow-2xl p-8 md:p-10 relative max-w-md w-full">
            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Web3SignIn />
          </div>
        </div>
      )}
    </header>
  );
};