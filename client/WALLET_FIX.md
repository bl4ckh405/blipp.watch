# Wallet Connection Fix

## Problem
Petra wallet was loading but showing a blank screen when trying to connect or sign transactions.

## Root Cause
The `AptosWalletAdapterProvider` was missing the `plugins` prop, which is required to configure which wallets (like Petra) should be available to the app.

## Solution

### 1. Installed Required Packages
```bash
pnpm add petra-plugin-wallet-adapter
```

### 2. Updated WalletProvider.tsx

**Before:**
```tsx
<AptosWalletAdapterProvider
  autoConnect={true}
  dappConfig={{ network: Network.TESTNET }}
>
```

**After:**
```tsx
const wallets = useMemo(() => [new PetraWallet()], [])

<AptosWalletAdapterProvider
  plugins={wallets}  // ← Added this!
  autoConnect={true}
  dappConfig={{ network: Network.TESTNET }}
>
```

## Testing

1. **Reload your browser** (hard refresh with Ctrl+Shift+R)
2. **Connect Wallet:**
   - Click the wallet connect button
   - Petra should now open properly with connection options
3. **Test Transaction:**
   - Try creating a market or buying shares
   - Petra should show transaction details for approval

## If Issues Persist

Check browser console (F12) for errors:
- **Network errors**: Verify you're on Testnet
- **Account errors**: Make sure Petra is set to Testnet network
- **Transaction errors**: Check contract address is correct

## Common Issues

### Petra still shows blank screen
1. Clear browser cache
2. Disconnect wallet from Petra extension
3. Reconnect from fresh

### "Wallet not found" error
1. Make sure Petra extension is installed
2. Refresh the page
3. Click connect again

### Transaction fails
1. Verify contract is deployed on testnet at address: `0xe839b729a89575c5930c1691b6817de70ecfb4cc229268108ee8eba64a4da792`
2. Check you have APT in wallet (get from faucet)
3. Ensure network is set to Testnet in both Petra and app
