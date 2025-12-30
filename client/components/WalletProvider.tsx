'use client'

import { AptosWalletAdapterProvider, useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { Network, AccountAddress } from '@aptos-labs/ts-sdk'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react'
import { aptos } from '@/lib/aptos-contract'


// Universal Wallet Context Type
interface WalletContextType {
  // Connection state
  connected: boolean
  connecting: boolean
  disconnecting: boolean

  // Account info
  account: ReturnType<typeof useAptosWallet>['account']
  walletAddress: string | null

  // Balance
  balance: number | null  // APT balance in octas
  balanceAPT: number | null  // APT balance in human-readable format

  // Wallet functions
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  signAndSubmitTransaction: ReturnType<typeof useAptosWallet>['signAndSubmitTransaction']

  // Auth (for Supabase integration)
  session: { user: { id: string } } | null

  // Utility functions
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PetraWallet()], [])

  return (
    <AptosWalletAdapterProvider
      {...({ plugins: wallets } as any)}
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
      }}
      onError={(error: any) => {
        // Suppress "User has rejected the request" errors as they are expected when user cancels
        const msg = typeof error === 'string' ? error : error?.message || String(error);
        if (msg.includes('rejected') || msg.includes('User has rejected')) {
          console.warn('Wallet action rejected by user');
          return;
        }
        console.error('Wallet error:', error);
      }}
    >
      <WalletContextProvider>
        {children}
      </WalletContextProvider>
    </AptosWalletAdapterProvider>
  )
}

// Internal provider that uses the Aptos wallet adapter
function WalletContextProvider({ children }: { children: ReactNode }) {
  const {
    connected,
    disconnect: disconnectWallet,
    account,
    signAndSubmitTransaction,
    wallet,
    connect: connectWallet,
  } = useAptosWallet()

  const [balance, setBalance] = useState<number | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)



  // Get wallet address
  const walletAddress = useMemo(() => {
    if (!account) return null
    return account.address.toString()
  }, [account])

  // Get balance in APT
  const balanceAPT = useMemo(() => {
    if (balance === null) return null
    return balance / 100_000_000 // Convert octas to APT
  }, [balance])

  // Create session object for Supabase integration
  const session = useMemo(() => {
    if (!connected || !account) return null
    return {
      user: {
        id: account.address.toString()
      }
    }
  }, [connected, account])

  // Remind user about network when wallet connects
  useEffect(() => {
    if (connected) {
      console.log('🌐 App configured for: TESTNET');
      console.log('💡 Make sure your Petra wallet is also on TESTNET!');
      console.log('📍 To switch: Open Petra → Settings → Network → Select "Testnet"');
    }
  }, [connected]);

  // Refresh balance function
  const refreshBalance = async () => {
    if (!walletAddress) {
      setBalance(null)
      return
    }

    try {
      const resources = await aptos.getAccountResources({
        accountAddress: walletAddress
      })

      const aptResource = resources.find(
        (r) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      )

      if (aptResource) {
        const coinData = aptResource.data as { coin: { value: string } }
        setBalance(Number(coinData.coin.value))
      } else {
        setBalance(0)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(null)
    }
  }

  // Auto-refresh balance when wallet connects or address changes
  useEffect(() => {
    if (connected && walletAddress) {
      refreshBalance()

      // Set up interval to refresh balance every 10 seconds
      const interval = setInterval(refreshBalance, 10000)
      return () => clearInterval(interval)
    } else {
      setBalance(null)
    }
  }, [connected, walletAddress])
  // Connect function - triggers wallet connection
  const connect = async () => {
    if (connected) return
    setConnecting(true)
    try {
      // Get the first available wallet (Petra in this case)
      const walletName = wallet?.name || 'Petra'
      await connectWallet(walletName)
    } catch (error) {
      console.error('Error connecting wallet:', error)
    } finally {
      setConnecting(false)
    }
  }
  // Disconnect function with state management
  const disconnect = async () => {
    setDisconnecting(true)
    try {
      await disconnectWallet()
      setBalance(null)
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
    } finally {
      setDisconnecting(false)
    }
  }
  const value: WalletContextType = {
    connected,
    connecting,
    disconnecting,
    account,
    walletAddress,
    balance,
    balanceAPT,
    connect,
    disconnect,
    signAndSubmitTransaction,
    session,
    refreshBalance,
  }
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

// Universal hook to access wallet throughout the app
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}

// Keep useAuth for backward compatibility with existing code
export function useAuth() {
  const { session, connected, account } = useWallet()
  return {
    session,
    connected,
    account
  }
}
