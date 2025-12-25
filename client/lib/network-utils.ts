import { Network } from '@aptos-labs/ts-sdk';

/**
 * Verify that the wallet is connected to the correct network
 * @param expectedNetwork - The network you expect (e.g., Network.TESTNET)
 * @returns true if on correct network, false otherwise
 */
export async function verifyNetwork(expectedNetwork: Network): Promise<boolean> {
  try {
    // Check if Petra wallet is available
    if (!window.aptos) {
      console.error('Petra wallet not found');
      return false;
    }

    // Get current network from wallet
    const network = await window.aptos.network();
    const currentNetwork = network.name.toLowerCase();
    
    console.log('Current wallet network:', currentNetwork);
    console.log('Expected network:', expectedNetwork);

    // Check if matches
    const isCorrect = currentNetwork === expectedNetwork.toLowerCase();
    
    if (!isCorrect) {
      console.warn(`⚠️ Wrong network! Wallet is on ${currentNetwork} but app expects ${expectedNetwork}`);
    }

    return isCorrect;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
}

/**
 * Request user to switch network in their wallet
 * @param targetNetwork - Network to switch to
 */
export async function requestNetworkSwitch(targetNetwork: Network): Promise<boolean> {
  try {
    if (!window.aptos) {
      throw new Error('Petra wallet not found');
    }

    // Request network change
    await window.aptos.changeNetwork(targetNetwork);
    
    console.log(`✅ Switched to ${targetNetwork}`);
    return true;
  } catch (error: any) {
    console.error('Error switching network:', error);
    if (error.message?.includes('rejected')) {
      console.log('User rejected network switch');
    }
    return false;
  }
}

/**
 * Get the current network from the wallet
 */
export async function getCurrentNetwork(): Promise<string | null> {
  try {
    if (!window.aptos) {
      return null;
    }

    const network = await window.aptos.network();
    return network.name;
  } catch (error) {
    console.error('Error getting current network:', error);
    return null;
  }
}

// Add type declaration for window.aptos
declare global {
  interface Window {
    aptos?: {
      connect(): Promise<{ address: string; publicKey: string }>;
      disconnect(): Promise<void>;
      network(): Promise<{ name: string; chainId: string }>;
      changeNetwork(network: string): Promise<void>;
      signAndSubmitTransaction(transaction: any): Promise<any>;
      account(): Promise<{ address: string; publicKey: string }>;
    };
  }
}
