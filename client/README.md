# Blipp.watch ⚡️👁️

> **The First Decentralized Pay-Per-View & Live Streaming Network on Movement.**  
> *Stream. Monetize. Own.*

![Blipp Banner](https://placehold.co/1200x400/18181b/f43f5e?text=Blipp.watch+|+Stream+Value)

## 🏆 The Pitch

Blipp is not just a streaming platform; it is a **monetization protocol** for the next generation of creators. Built on the **Movement Network**, Blipp leverages the **x402 Protocol** to bring the long-awaited HTTP 402 (Payment Required) status code to life. 

We solve the "Creator Poverty" problem by enabling:
- **Instant, Permissionless Pay-Gating**: Turn any video or stream into a premium asset instantly.
- **Peer-to-Peer Streaming**: Zero server costs for creators using WebRTC scaling.
- **One-Click Payments**: Watchers pay in APT/MOVE, creators get paid immediately. No thresholds. No net-30.

---

## 🚀 Key Features

### 1. 🔐 The x402 Protocol (Payment Required)
We define a new standard for value exchange on the web. When a user creates premium content, Blipp generates an **x402 Lock**.
- **The Flow**: User requests content -> Server returns `402 Payment Required` with pricing metadata -> Client pays on-chain -> Server verifies tx proof -> Content Unlocks.
- **Why?** It decouples content from the platform. The "Key" is money, not a login.

### 2. 🔴 P2P Live Streaming
Built with WebRTC and a decentralized signaling mesh.
- **Low Latency**: Real-time interaction.
- **Cost Efficiency**: Viewers help distribute the stream (Mesh Networking), removing the need for expensive centralized CDNs.

### 3. 💸 Real-Time Tipping & Commerce
- **Gifting**: Send animations (Gems, Sparkles) that are actual on-chain asset transfers.
- **Replay Marketplace**: Live streams automatically convert to pay-per-view replays.

### 4. ⚡ Powered by Movement
- **High Throughput**: Capable of handling thousands of micro-transactions per second.
- **Low Fees**: Making $0.10 unlocks viable, unlike on Ethereum Mainnet.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 15, TailwindCSS, Framer Motion.
- **Backend Protocol**: `x402-server` (Express + Custom Middleware).
- **Blockchain**: Aptos TS SDK, Movement Testnet.
- **Database / Realtime**: Supabase (Postgres + Channels).
- **Streaming Engine**: WebRTC (PeerJS), Custom P2P Mesh logic.

---

## ⚡️ Getting Started

To run Blipp locally and test the future of streaming:

### Prerequisites
- Node.js 18+
- pnpm or npm
- A Movement/Aptos Wallet (e.g., Petra, Nightly)

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/bl4ckh501/blipp.watch.git
   cd blipp.watch
   ```

2. **Install Dependencies**
   ```bash
   # Install Client deps
   cd client
   npm install

   # Install x402 Protocol Server deps
   cd ../x402-server
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` in `/client`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_sb_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_sb_key
   ```
   Create a `.env` in `/x402-server`:
   ```env
   MOVEMENT_PAY_TO=your_wallet_address
   PORT=4402
   ```

4. **Run the Stack**
   
   **Terminal 1 (Client):**
   ```bash
   cd client
   npm run dev
   ```

   **Terminal 2 (Protocol Node):**
   ```bash
   cd x402-server
   npm run start
   ```

5. **Open Blipp**
   Visit `http://localhost:3000` and connect your wallet!

---

## 🔮 Roadmap

- [x] **Phase 1: Alpha**: P2P Streaming, Tipping, Basic x402 Unlocks.
- [ ] **Phase 2: Mesh**: Robust Mesh networking for >10k viewers.
- [ ] **Phase 3: NFT Keys**: Token-gated streams based on collection ownership.
- [ ] **Phase 4: Mainnet**: Launch on Movement Mainnet.

---

## 🤝 Contribution

We welcome PRs! This is an open protocol experiment. Please check the `issues` tab.

## 📄 License

MIT. Build the future freely.
