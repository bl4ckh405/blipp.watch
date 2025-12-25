# Blipp - Pitch & Project Description

## Short Description (50 Words)
Blipp is the first decentralized Pay-Per-View streaming network built on Movement. By implementing the "x402" protocol (HTTP 402), Blipp enables creators to lock content that can only be unlocked via instant, on-chain micro-payments. No subscriptions, no ads, just direct value exchange between creator and viewer.

## Long Description (Hackathon Submission)

**The Problem**
The creator economy is broken. Platforms take 30-50% cuts, rely on intrusive ads, and lock creators into "golden handcuff" subscriptions. Micropayments (paying $0.50 for a video) have never worked on the web because traditional payment processors charge $0.30 + 3% per transaction.

**The Solution: Blipp**
Blipp utilizes the high speed and negligible fees of the **Movement Network** to make true Peer-to-Peer commerce a reality. 

**How it works:**
1. **The x402 Protocol**: We built a custom middleware that listens for requests. If premium content is requested, the server responds with `402 Payment Required` and a challenge. The user's wallet automatically signs a transaction, and the proof unlocks the content instantly.
2. **P2P Streaming**: We use WebRTC to let users broadcast directly from their browser to viewers, bypassing expensive centralized servers and ensuring the platform remains permissionless.
3. **Instant Settlement**: When a viewer "tips" or "buys a ticket", the funds go straight to the creator's wallet. Blipp never holds custody of funds.

**Why it wins:**
- **Technical Innovation**: We genuinely implemented HTTP 402, a status code reserved since the 90s, using modern blockchain tech.
- **Design**: A "Netflix-grade" UI that makes Web3 feel invisible and premium.
- **Market Fit**: With 'Subscription Fatigue' at an all-time high, Blipp offers a 'Pay-as-you-go' alternative that users actually want.

**Tech Stack:**
- **Movement/Aptos**: For sub-second transaction settlement.
- **Next.js & Supabase**: For a snappy, reactive frontend and real-time chat.
- **WebRTC**: For decentralized broadcasting.
- **Express/Node**: Custom x402 unlock server.
