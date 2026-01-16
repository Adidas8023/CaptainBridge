# CaptainBridge

**CaptainBridge** is a modern, high-performance cross-chain bridge application built with **Next.js 16**, **Circle CCTP**, and **Reown AppKit**. It enables seamless asset transfers across supported blockchains, including Ethereum, Solana, and other EVM-compatible chains.

## 🚀 Features

-   **Cross-Chain Transfer Protocol (CCTP)**: Leverages Circle's CCTP for secure and capital-efficient USDC transfers.
-   **Multi-Chain Support**: Integrated with major networks including **Ethereum**, **Solana**, **Arbitrum**, **Optimism**, and more.
-   **Modern UI/UX**: Built with **Tailwind CSS 4** and **Radix UI** for a polished, responsive, and accessible interface.
-   **Wallet Integration**: Seamless connection with **Wagmi**, **Reown AppKit**, and **Solana Wallet Adapter**.
-   **Performance**: Powered by **Next.js 16** with Turbopack for lightning-fast transfers and updates.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **Blockchain Interaction**: [Wagmi](https://wagmi.sh/), [Viem](https://viem.sh/), [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
-   **Bridge Tech**: [Circle CCTP](https://www.circle.com/en/cross-chain-transfer-protocol)
-   **State Management**: [Zustand](https://docs.pmnd.rs/zustand)

## 📦 Getting Started

### Prerequisites

-   Node.js (v20+)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Adidas8023/CaptainBridge.git
    cd CaptainBridge
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Copy `.env.example` to `.env.local` and fill in your API keys and project IDs.
    ```bash
    cp .env.example .env.local
    ```

4.  Start Development Server:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🔒 Security

-   **Private Keys**: Never commit your `.env` files containing private keys or sensitive secrets.
-   This project is configured to ignore `.env*` files (except `.env.example`).

## 📄 License

[MIT](LICENSE)
