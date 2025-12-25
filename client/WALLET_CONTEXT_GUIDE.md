# Universal Wallet Context Guide

## Overview

The wallet connection is now **universal** across your entire application! You can access wallet state from any component using a single hook.

## Using the Wallet Context

### Import
```tsx
import { useWallet } from '@/components/WalletProvider'
```

### Available Properties & Functions

```tsx
const {
  // Connection State
  connected,          // boolean - is wallet connected?
  connecting,         // boolean - is connection in progress?
  disconnecting,      // boolean - is disconnection in progress?
  
  // Account Info
  account,            // Full account object from Aptos SDK
  walletAddress,      // string | null - wallet address (e.g., "0x123...")
  
  // Balance (Auto-refreshes every 10 seconds!)
  balance,            // number | null - APT balance in octas
  balanceAPT,         // number | null - APT balance in readable format
  
  // Functions
  connect,            // () => Promise<void>
  disconnect,         // () => Promise<void>
  signAndSubmitTransaction,  // Submit transactions
  refreshBalance,     // () => Promise<void> - manually refresh balance
  
  // Auth (for Supabase)
  session,           // { user: { id: string } } | null
} = useWallet()
```

## Examples

### 1. Display Wallet Info in Header

```tsx
'use client'

import { useWallet } from '@/components/WalletProvider'

export function Header() {
  const { connected, walletAddress, balanceAPT, disconnect } = useWallet()
  
  return (
    <header>
      {connected ? (
        <div>
          <p>Address: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</p>
          <p>Balance: {balanceAPT?.toFixed(4)} APT</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button>Connect Wallet</button>
      )}
    </header>
  )
}
```

### 2. Check Connection Before Action

```tsx
'use client'

import { useWallet } from '@/components/WalletProvider'

export function UploadButton() {
  const { connected, walletAddress } = useWallet()
  
  const handleUpload = () => {
    if (!connected) {
      alert('Please connect your wallet first!')
      return
    }
    
    console.log('Uploading from:', walletAddress)
    // ... upload logic
  }
  
  return (
    <button onClick={handleUpload} disabled={!connected}>
      Upload Video
    </button>
  )
}
```

### 3. Submit Transaction

```tsx
'use client'

import { useWallet } from '@/components/WalletProvider'

export function BuyButton({ videoId, amount }: Props) {
  const { connected, signAndSubmitTransaction, refreshBalance } = useWallet()
  const [loading, setLoading] = useState(false)
  
  const handleBuy = async () => {
    if (!connected) return
    
    setLoading(true)
    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${CONTRACT}::buy_shares`,
          functionArguments: [videoId, amount],
        },
      })
      
      // Balance auto-refreshes, but you can force refresh
      await refreshBalance()
      
      alert(`Success! Hash: ${response.hash}`)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }
  
  return <button onClick={handleBuy}>{loading ? 'Processing...' : 'Buy'}</button>
}
```

### 4. Display Balance Anywhere

```tsx
'use client'

import { useWallet } from '@/components/WalletProvider'

export function BalanceDisplay() {
  const { balanceAPT, balance } = useWallet()
  
  return (
    <div>
      {balanceAPT !== null ? (
        <>
          <h3>{balanceAPT.toFixed(2)} APT</h3>
          <p className="text-xs">({balance} octas)</p>
        </>
      ) : (
        <p>Connect wallet to see balance</p>
      )}
    </div>
  )
}
```

### 5. Protect Routes

```tsx
'use client'

import { useWallet } from '@/components/WalletProvider'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ProtectedPage() {
  const { connected } = useWallet()
  const router = useRouter()
  
  useEffect(() => {
    if (!connected) {
      router.push('/')
    }
  }, [connected, router])
  
  if (!connected) return <div>Redirecting...</div>
  
  return <div>Protected Content</div>
}
```

## Key Features

### ✅ Auto-Refresh Balance
Balance automatically refreshes every 10 seconds when wallet is connected!

### ✅ Universal Access
Use `useWallet()` from **any component** - no prop drilling needed!

### ✅ Type-Safe
Full TypeScript support with proper types

### ✅ Backward Compatible
Existing code using `useAuth()` still works!

### ✅ Persistent Connection
Wallet auto-connects on page load if previously connected

## Migrating Existing Code

### Old Way (component-specific)
```tsx
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'

const { account, connected, signAndSubmitTransaction } = useAptosWallet()
```

### New Way (universal)
```tsx
import { useWallet } from '@/components/WalletProvider'

const { account, connected, walletAddress, balanceAPT, signAndSubmitTransaction } = useWallet()
```

## Benefits

1. **Single Source of Truth** - One context manages all wallet state
2. **Balance Tracking** - Automatic balance refresh every 10 seconds
3. **Better UX** - Loading states for connecting/disconnecting
4. **Easier Development** - Access wallet from anywhere without imports hassle
5. **Cleaner Code** - No need to pass wallet props down component trees

---

**Note:** The wallet context is wrapped at the root level in `app/layout.tsx`, so it's available throughout your entire app!
