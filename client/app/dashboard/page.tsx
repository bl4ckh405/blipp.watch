'use client'

import { useEffect, useState } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { UsernameSetup } from '@/components/UsernameSetup'
import { WalletButton } from '@/components/WalletButton'

export default function DashboardPage() {
  const { connected, account } = useWallet()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [needsUsername, setNeedsUsername] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  if (!connected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold text-white">Connect Your Wallet</h1>
        <p className="text-gray-400">Connect your wallet to access the creator dashboard</p>
        <WalletButton />
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Welcome @{user.username}!</p>
      </div>
    )
  }

  return null
}
