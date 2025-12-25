import { Aptos, AptosConfig, Network, Account, AccountAddress, InputViewFunctionData } from '@aptos-labs/ts-sdk';

// Contract configuration from Move.toml
export const CONTRACT_ADDRESS = '0xe839b729a89575c5930c1691b6817de70ecfb4cc229268108ee8eba64a4da792';
export const MODULE_NAME = 'bonding_curve';

// Network configuration
const NETWORK = Network.TESTNET; // Change to MAINNET when ready

// Initialize Aptos client
const aptosConfig = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(aptosConfig);

// Export aptos instance for use in components
export { aptos };

// Market info interface
export interface MarketInfo {
  creator: string;
  aptosReserve: string;
  tokenReserve: string;
  totalSold: string;
  graduated: boolean;
}

// Transaction result interface
export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
}

/**
 * Initialize a new market for a video
 * @param account - User's account (signer)
 * @param videoId - Unique identifier for the video
 */
export async function initializeMarket(
  account: Account,
  videoId: string
): Promise<TransactionResult> {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::initialize_market`,
        functionArguments: [videoId],
      },
    });

    const committedTransaction = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    return {
      success: executedTransaction.success,
      hash: committedTransaction.hash,
    };
  } catch (error: any) {
    console.error('Initialize market error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize market',
    };
  }
}

/**
 * Buy shares in a video market
 * @param account - User's account (signer)
 * @param videoId - Video identifier
 * @param aptAmount - Amount of APT to spend (in octas, 1 APT = 10^8 octas)
 */
export async function buyShares(
  account: Account,
  videoId: string,
  aptAmount: number
): Promise<TransactionResult> {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::buy_shares`,
        functionArguments: [videoId, aptAmount],
      },
    });

    const committedTransaction = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    return {
      success: executedTransaction.success,
      hash: committedTransaction.hash,
    };
  } catch (error: any) {
    console.error('Buy shares error:', error);
    return {
      success: false,
      error: error.message || 'Failed to buy shares',
    };
  }
}

/**
 * Sell shares in a video market
 * @param account - User's account (signer)
 * @param videoId - Video identifier
 * @param shareAmount - Amount of shares to sell (with 8 decimals)
 */
export async function sellShares(
  account: Account,
  videoId: string,
  shareAmount: number
): Promise<TransactionResult> {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::sell_shares`,
        functionArguments: [videoId, shareAmount],
      },
    });

    const committedTransaction = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash,
    });

    return {
      success: executedTransaction.success,
      hash: committedTransaction.hash,
    };
  } catch (error: any) {
    console.error('Sell shares error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sell shares',
    };
  }
}

/**
 * Get market information for a video
 * @param videoId - Video identifier
 * @returns Market info or null if market doesn't exist
 */
export async function getMarketInfo(videoId: string): Promise<MarketInfo | null> {
  try {
    const payload: InputViewFunctionData = {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_market_info`,
      functionArguments: [videoId],
    };

    const result = await aptos.view({ payload });

    if (result && result.length >= 5) {
      return {
        creator: result[0] as string,
        aptosReserve: result[1] as string,
        tokenReserve: result[2] as string,
        totalSold: result[3] as string,
        graduated: result[4] as boolean,
      };
    }

    return null;
  } catch (error) {
    console.error('Get market info error:', error);
    return null;
  }
}

/**
 * Get current price for a video's shares
 * @param videoId - Video identifier
 * @returns Price in octas per share (with 8 decimals) or null
 */
export async function getCurrentPrice(videoId: string): Promise<string | null> {
  try {
    const payload: InputViewFunctionData = {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_current_price`,
      functionArguments: [videoId],
    };

    const result = await aptos.view({ payload });

    if (result && result.length > 0) {
      return result[0] as string;
    }

    return null;
  } catch (error) {
    console.error('Get current price error:', error);
    return null;
  }
}

/**
 * Get user's share balance for a video
 * @param videoId - Video identifier
 * @param userAddress - User's wallet address
 * @returns Balance in smallest units (with 8 decimals) or '0'
 */
export async function getUserShareBalance(videoId: string, userAddress: string): Promise<string> {
  try {
    const payload: InputViewFunctionData = {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_user_share_balance`,
      functionArguments: [videoId, userAddress],
    };

    const result = await aptos.view({ payload });

    if (result && result.length > 0) {
      return result[0] as string;
    }

    return '0';
  } catch (error) {
    console.error('Get user share balance error:', error);
    return '0';
  }
}

/**
 * Check if a market exists for a video
 * @param videoId - Video identifier
 * @returns True if market exists, false otherwise
 */
export async function marketExists(videoId: string): Promise<boolean> {
  try {
    const payload: InputViewFunctionData = {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::market_exists`,
      functionArguments: [videoId],
    };

    const result = await aptos.view({ payload });

    if (result && result.length > 0) {
      return result[0] as boolean;
    }

    return false;
  } catch (error) {
    console.error('Market exists error:', error);
    return false;
  }
}

/**
 * Get market address for a video
 * @param videoId - Video identifier
 * @returns Market address or null
 */
export async function getMarketAddress(videoId: string): Promise<string | null> {
  try {
    const payload: InputViewFunctionData = {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_market_address`,
      functionArguments: [videoId],
    };

    const result = await aptos.view({ payload });

    if (result && result.length > 0) {
      return result[0] as string;
    }

    return null;
  } catch (error) {
    console.error('Get market address error:', error);
    return null;
  }
}

// Helper functions for calculations

/**
 * Convert APT to octas (1 APT = 10^8 octas)
 */
export function aptToOctas(apt: number): number {
  return Math.floor(apt * 100_000_000);
}

/**
 * Convert octas to APT
 */
export function octasToApt(octas: number | string): number {
  return Number(octas) / 100_000_000;
}

/**
 * Convert shares with decimals to human-readable format
 */
export function sharesToHuman(shares: number | string): number {
  return Number(shares) / 100_000_000;
}

/**
 * Convert human shares to contract format (with 8 decimals)
 */
export function humanToShares(shares: number): number {
  return Math.floor(shares * 100_000_000);
}
