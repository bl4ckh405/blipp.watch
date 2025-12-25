'use client';

import { WalletButton } from './WalletButton';
import { SparklesIcon } from './Icons';

export function Web3SignIn() {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center gap-3 mb-2">
        <SparklesIcon className="w-8 h-8 text-indigo-400" />
        <h3 className="text-xl font-bold">Connect Your Wallet</h3>
      </div>
      <p className="text-zinc-400 text-center text-sm mb-4">
        Connect your wallet to sign in and start earning from your content
      </p>
      <WalletButton />
    </div>
  );
}
