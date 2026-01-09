'use client';

import React, { useState } from 'react';
import { useWallet } from './WalletProvider';
import { ChartBarIcon } from './Icons';  // Using ChartBarIcon since WalletIcon doesn't exist

export const WalletButton: React.FC = () => {
  const { connected, walletAddress, balanceAPT, disconnect, connect, connecting } = useWallet();
  const [showMenu, setShowMenu] = useState(false);

  if (!connected) {
    return (
      <button
        onClick={connect}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        disabled={connecting}
      >
        <ChartBarIcon className="w-5 h-5" />
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  const address = walletAddress || '';
  const truncatedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        <ChartBarIcon className="w-5 h-5" />
        <div className="flex flex-col items-start">
          <span className="text-sm">{truncatedAddress}</span>
          {balanceAPT !== null && (
            <span className="text-xs text-emerald-400">{balanceAPT.toFixed(2)} MOVE</span>
          )}
        </div>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-zinc-700">
            <p className="text-xs text-zinc-400">Wallet Address</p>
            <p className="text-sm font-mono break-all">{address}</p>
          </div>
          <div className="p-4 border-b border-zinc-700">
            <p className="text-xs text-zinc-400">Balance</p>
            <p className="text-lg font-bold text-emerald-400">
              {balanceAPT !== null ? `${balanceAPT.toFixed(4)} MOVE` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => {
              disconnect();
              setShowMenu(false);
            }}
            className="w-full text-left px-4 py-3 text-red-400 hover:bg-zinc-800 transition-colors rounded-b-lg"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
