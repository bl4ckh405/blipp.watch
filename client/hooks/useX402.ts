import { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { aptos } from '../lib/aptos-contract';

export interface X402Content {
  status: string;
  videoId: string;
  accessUrl: string;
  videoSrc: string;
  message: string;
}

export const useX402 = () => {
  const { signAndSubmitTransaction, account } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockContent = async (url: string): Promise<X402Content | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Initial Attempt
      console.log('🔒 Requesting access to:', url);
      const initialResponse = await fetch(url);

      if (initialResponse.status === 200) {
        // Already unlocked?
        const data = await initialResponse.json();
        setIsLoading(false);
        return data;
      }

      if (initialResponse.status !== 402) {
        // Try to read error text
        const text = await initialResponse.text();
        throw new Error(`Unexpected status: ${initialResponse.status} - ${text}`);
      }

      console.log("🔒 402 Received. Parsing payment method...");

      // 2. Parse Payment Request
      // Depending on x402plus spec, details are in Headers or Body.
      // The updated x402plus implementation returns details in the JSON body.
      
      let params: Record<string, string> = {};
      const paymentHeader = initialResponse.headers.get("WWW-Authenticate") || initialResponse.headers.get("x-payment-request");

      if (paymentHeader && paymentHeader.includes("x402")) {
          console.log('🧾 Payment requested via Header:', paymentHeader);
          // Parse header: "x402 network=movement..."
          const parts = paymentHeader.replace('x402 ', '').split(',');
          parts.forEach(part => {
             const [key, val] = part.trim().split('=');
             if (key && val) params[key] = val.replace(/"/g, '');
          });
      } else {
          // Fallback: Check Body (Standard for some x402 implementations)
          try {
             const body = await initialResponse.json();
             console.log('🧾 Payment requested via Body:', body);
             
             if (body && body.accepts && Array.isArray(body.accepts) && body.accepts.length > 0) {
                 const offer = body.accepts[0];
                 params = {
                     recipient: offer.payTo,
                     amount: offer.maxAmountRequired,
                     network: offer.network,
                     asset: offer.asset
                 };
             } else {
                 console.warn("Body parsed but 'accepts' array missing or empty", body);
             }
          } catch(e) {
             console.error("Failed to parse error body JSON", e);
          }
      }

      if (Object.keys(params).length === 0) {
          throw new Error("Missing payment details (Header or Body) from 402 response");
      }

      const recipient = params.recipient || params.payTo;
      const amount = params.amount || params.maxAmountRequired;

      if (!recipient || !amount) {
        console.error("Parsed params incomplete:", params);
        throw new Error("Invalid payment request parameters");
      }

      const amountNum = parseInt(amount);

      // 3. Make Payment
      console.log(`💸 Paying ${amount} to ${recipient}...`);

      if (!account) throw new Error("Wallet not connected");

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [recipient, amountNum],
        },
      });

      console.log('✅ Payment sent. Hash:', response.hash);

      // 3.5 Wait for Confirmation
      // Initialize a client to check confirmation
      // const client = new Aptos(new AptosConfig({ network: Network.TESTNET }));

      try {
        console.log("⏳ Waiting for transaction confirmation...");
        await aptos.waitForTransaction({ transactionHash: response.hash });
        console.log("✅ Transaction confirmed on-chain!");
      } catch (confirmErr) {
        console.warn("Wait for transaction failed or timed out, proceeding anyway...", confirmErr);
        // We proceed, but it might fail on server if not indexed yet.
        // A minimal delay might help if waitForTransaction threw but tx is actually there
        await new Promise(r => setTimeout(r, 2000));
      }

      // 4. Retry with Proof
      // Send the hash in Authorization header: `x402 <hash>`
      const proofHeader = `x402 ${response.hash}`;
      
      let finalResponse;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
          attempts++;
          console.log(`🔓 verifying payment (Attempt ${attempts}/${maxAttempts})...`);
          
          finalResponse = await fetch(url, {
            headers: {
              'Authorization': proofHeader,
              'X-Payment-Hash': response.hash
            }
          });

          if (finalResponse.ok) break;
          
          // If still 402 or 404, wait and retry (indexer lag)
          if (finalResponse.status === 402 || finalResponse.status === 404) {
              console.log("⏳ Verification pending (indexer lag), retrying in 2s...");
              await new Promise(r => setTimeout(r, 2000));
              continue;
          }
          
          // Fatal error
          break;
      }

      if (!finalResponse || !finalResponse.ok) {
        const errText = finalResponse ? await finalResponse.text() : "Unknown error";
        throw new Error(`Unlock failed: ${finalResponse?.status} - ${errText}`);
      }

      const content = await finalResponse.json();
      console.log('🔓 Content unlocked:', content);

      setIsLoading(false);
      return content;

    } catch (err: any) {
      console.error('Unlock error:', err);
      setError(err.message || "Failed to unlock content");
      setIsLoading(false);
      return null;
    }
  };

  return { unlockContent, isLoading, error };
};
