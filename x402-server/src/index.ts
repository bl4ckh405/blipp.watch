import express from "express";
import cors from "cors";
import { x402Paywall } from "x402plus";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 4402;

// In-memory store for unlocked rooms (in a real app, use a database)
const unlockedRooms = new Map<string, Set<string>>(); // videoId -> Set<walletAddress>

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    exposedHeaders: ["X-PAYMENT-RESPONSE", "WWW-Authenticate"]
}));

app.use(express.json());

// Helper to check if user has access
const hasAccess = (videoId: string, walletAddress: string) => {
    return unlockedRooms.get(videoId)?.has(walletAddress);
};

// Hardcoded fallback for workshop demo
const DEFAULT_PAY_TO = "0x31f5919930f6e458c819172627d8a691e77757b3ae847a1eb7c215e0d92efb83";

// 1. Pay-to-Watch Endpoint
// This middleware handles the 402 Payment Required flow automatically
// 1. Pay-to-Watch Endpoint (Dynamic)
// We define the middleware logic directly in the route chain to preserve full path visibility
app.get("/api/premium/:videoId",
    async (req, res, next) => {
        const price = (req.query.price as string) || "200000000"; // Default 2 APT
        const recipient = (req.query.recipient as string) || process.env.MOVEMENT_PAY_TO || DEFAULT_PAY_TO;
        const videoId = req.params.videoId;

        // --- MANUAL VERIFICATION (Bypass external facilitator) ---
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("x402 0x")) {
            const hash = authHeader.split(" ")[1];
            console.log(`🔍 Manually verifying tx: ${hash}`);

            try {
                // Query Aptos Testnet Fullnode directly
                const nodeUrl = "https://api.testnet.aptoslabs.com/v1";
                const response = await fetch(`${nodeUrl}/transactions/by_hash/${hash}`);

                if (response.ok) {
                    const tx: any = await response.json();

                    // 1. Check Execution Status
                    if (!tx.success) {
                        console.warn("❌ Tx failed on-chain");
                    } else {
                        // 2. Check Payload (Basic validation)
                        const isTransfer = tx.payload?.function === "0x1::aptos_account::transfer" || tx.payload?.function === "0x1::aptos_coin::transfer";

                        // Note: Arguments are sometimes strings, sometimes numbers depending on SDK/API version
                        const txRecipient = tx.payload?.arguments?.[0];
                        const txAmount = tx.payload?.arguments?.[1];

                        // Loose equality check for safety
                        if (isTransfer &&
                            BigInt(txAmount) >= BigInt(price) &&
                            (txRecipient === recipient || txRecipient === `0x${recipient.replace('0x', '')}`)) {
                            console.log("✅ Manual verification Passed! Skipping x402 middleware.");
                            return next(); // Skip to success handler
                        } else {
                            console.warn("⚠️ Tx found but parameters didn't match.", {
                                expected: { recipient, price },
                                got: { recipient: txRecipient, amount: txAmount, func: tx.payload?.function }
                            });
                        }
                    }
                } else {
                    console.warn(`⚠️ Tx not found on node yet (Status ${response.status})`);
                }
            } catch (e) {
                console.error("Manual verification fetch error:", e);
            }
        }
        // ---------------------------------------------------------

        // Generate multiple keys to ensure matching regardless of library logic
        const rawPath = req.path;
        const noQueryPath = req.originalUrl.split('?')[0];
        const routePattern = "/api/premium/:videoId";

        const keys = [
            `GET ${rawPath}`,
            `GET ${noQueryPath}`,
            `GET ${routePattern}`
        ];

        const configObject: any = {};
        keys.forEach(key => {
            configObject[key] = {
                network: "testnet", // Changed from "movement" to match client's Aptos Testnet
                asset: "0x1::aptos_coin::AptosCoin",
                maxAmountRequired: price,
                description: "Unlock Premium Blipp Room",
                mimeType: "application/json",
                maxTimeoutSeconds: 600
            };
        });

        console.log(`🔒 Validating Access for keys:`, keys);

        const paywall = x402Paywall(
            recipient,
            configObject,
            {
                url: "https://facilitator.stableyard.fi"
            }
        );

        paywall(req, res, next);
    },
    (req, res) => {
        const { videoId } = req.params;

        // If we reach here, x402 has validated the payment (or passed it through via next())
        // We can now safely "unlock" the room.

        res.json({
            status: "unlocked",
            videoId: videoId,
            accessUrl: `/room/${videoId}`,
            videoSrc: "https://storage.googleapis.com/blipp-watch/premium/exclusive-content.mp4",
            message: "Payment successful! Welcome to the exclusive room."
        });
    }
);

app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "x402-server" });
});

app.listen(PORT, () => {
    console.log(`x402 server running at http://localhost:${PORT}`);
    console.log(`Pay-to address: ${process.env.MOVEMENT_PAY_TO}`);
});
