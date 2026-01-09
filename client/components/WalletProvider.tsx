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
  balance: number | null  // MOVE balance in octas
  balanceAPT: number | null  // MOVE balance in human-readable format

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
  // Remove manual plugins to allow auto-detection of all AIP-62 wallets (including Razor)
  // Passing 'undefined' or removing the prop entirely enables the default detection behavior

  useEffect(() => {
    // Debugging: Check for wallet extensions in the window object
    if (typeof window !== 'undefined') {
      console.log('window.aptos:', (window as any).aptos);
      console.log('window.petra:', (window as any).petra);
    }
  }, []);

  const wallets = [new PetraWallet()];

  return (
    <AptosWalletAdapterProvider
      // plugins={wallets}
      autoConnect={true}
      dappConfig={{
        network: Network.TESTNET,
        aptosConnect: { dappId: '57fa42a9-29c6-4f1e-939c-4eefa36d9ff5' }
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
    signTransaction, // Needed for custom submit flow
    wallet,
    connect: connectWallet,
    wallets,
    network,
  } = useAptosWallet()

  const [balance, setBalance] = useState<number | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)



  // Get wallet address
  const walletAddress = useMemo(() => {
    if (!account) return null
    return account.address.toString()
  }, [account])

  // Get balance in MOVE
  const balanceAPT = useMemo(() => {
    if (balance === null) return null
    return balance / 100_000_000 // Convert octas to MOVE
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
      console.log('🌐 App configured for: MOVEMENT TESTNET (Custom)');
      console.log('💡 Make sure your Wallet (Petra/Razor/Pontem) is connected to Movement Testnet!');
      console.log('📍 RPC: https://testnet.movementnetwork.xyz/v1');
      if (network) {
        console.log(`🔗 Wallet connected to chain: ${network.chainId} (${network.name})`);
      }
    }
  }, [connected, network]);

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

      // DEBUG: Find ANY CoinStore
      const allCoinStores = resources.filter(r => r.type.includes('CoinStore'));
      console.log('💰 User CoinStores:', allCoinStores.map(c => ({ type: c.type, value: (c.data as any).coin?.value })));

      if (aptResource) {
        const coinData = aptResource.data as { coin: { value: string } }
        setBalance(Number(coinData.coin.value))
      } else {
        setBalance(0)
      }
    } catch (error: any) {
      // Suppress "Failed to fetch" (net::ERR_INSUFFICIENT_RESOURCES or similar)
      if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
        setBalance(null);
        return;
      }
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
      // Debug: Log all wallets to see their status
      console.log("🔍 All detected wallets:", (wallets || []).map(w => ({ name: w.name, readyState: w.readyState })));

      // Find available wallets
      const installedWallets = (wallets || []).filter(w => w.readyState === "Installed");
      console.log("🔍 Available Wallets:", installedWallets.map(w => w.name));

      // Prioritize Razor, then Petra, then others
      // Note: "Continue with Google" often appears as a wallet, we might want to prioritize extension wallets first
      const razor = installedWallets.find(w => w.name.toLowerCase().includes('razor'));
      const petra = installedWallets.find(w => w.name.toLowerCase().includes('petra'));
      const other = installedWallets.find(w => !w.name.includes('Google') && !w.name.includes('Apple')); // Prefer non-social first?

      const targetWallet = razor || petra || other || installedWallets[0];

      if (!targetWallet) {
        console.warn("⚠️ No wallets detected. Prompting for Petra installation or check configuration.");
        // Fallback to Petra only if really nothing else found, but might open install page
        await connectWallet('Petra');
        return;
      }

      const walletName = targetWallet.name;

      console.log("🔌 Connecting to:", walletName);
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
  // Custom submit function to handle Network mismatch (Adapter thinks Testnet, RPC is Custom)
  const submitTransaction = async (payload: any) => {
    if (!account) throw new Error("Wallet not connected");

    console.log("🚀 Starting Custom Transaction Submit");
    console.log("👤 Sender:", account.address);

    // 0. Validate Network
    if (network) {
      console.log(`Checking wallet network: ${network.chainId} (${network.name})`);
      // Movement Testnet: 177 or 250 usually. '250' decimal is 0xfa.
      const chainId = typeof network.chainId === 'string' ? parseInt(network.chainId) : network.chainId;

      // Aptos Mainnet: 1. Aptos Testnet: 2.
      if (chainId === 1 || chainId === 2) {
        throw new Error(`Wrong Network! You are connected to ${network.name} (ChainID ${chainId}). Please switch to Movement Testnet (ChainID 250 or 177).`);
      }
    }

    try {
      // 0.5 Manually fetch Sequence Number (Bypasses flaky getAccountInfo internal call)
      let accountSequenceNumber;
      try {
        const resource = await aptos.getAccountResource({
          accountAddress: account.address,
          resourceType: "0x1::account::Account"
        });
        const data = resource as any;
        accountSequenceNumber = data.sequence_number;
        console.log(`✅ Account found (Seq: ${accountSequenceNumber})`);
      } catch (e: any) {
        if (e?.message?.includes('Account not found') || e?.status === 404) {
          console.error("❌ Account FAUCET CHECK NEEDED. Account resource not found.", e);
          throw new Error("Account not found on Movement Testnet. Please fund your wallet via the Faucet or bridge.");
        }
        console.warn("⚠️ Could not fetch sequence number manually, letting SDK try auto-fetch...", e);
      }

      // 1. Build using Custom RPC (Movement) with EXPLICIT sequence number
      console.log("🛠️ Building transaction with payload:", payload);
      const transaction = await aptos.transaction.build.simple({
        sender: payload.sender || account.address,
        data: payload.data,
        options: {
          accountSequenceNumber: accountSequenceNumber, // Use manual seq number if found
        }
      });
      console.log("📝 Transaction built:", transaction);

      // 2. Sign using Adapter (Wallet is on Movement, Adapter is on Testnet loop)
      console.log("✍️ Requesting signature from wallet...");
      const response = await signTransaction({ transactionOrPayload: transaction });
      console.log("🔐 Signature received:", response);

      // 3. Submit using Custom RPC (Movement)
      console.log("🚀 Submitting to Movement RPC...");
      const committedTransaction = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: response.authenticator,
      });
      console.log("✅ Transaction submitted!", committedTransaction);

      return committedTransaction;
    } catch (error) {
      console.error("Custom submit failed detailed:", error);
      throw error;
    }
  };

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
    signAndSubmitTransaction: submitTransaction as any, // Override standard function with our custom one
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
