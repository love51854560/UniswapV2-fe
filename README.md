# DeFi Exchange Frontend

A React-based Single Page Application (SPA) for interacting with SimpleUniswapV2-compatible smart contracts. This frontend allows users to connect their Ethereum wallets, view token balances, trade tokens, provide/remove liquidity, and view transaction history.

## Features

- **Wallet Connection**: Connect with MetaMask and other Ethereum wallets
- **Token Balance Dashboard**: View your ETH, MOCK, and USDC balances
- **Trading Interface**: Swap between MOCK and USDC tokens with real-time price calculations
- **Liquidity Management**: Add and remove liquidity from the MOCK-USDC trading pair
- **Transaction History**: View your past swaps and liquidity operations

## Technologies Used

- **React**: Frontend framework
- **TypeScript**: Type-safe JavaScript
- **Next.js**: React framework with App Router
- **ethers.js**: Ethereum library for blockchain interactions
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: UI component library
- **Lucide React**: Icon library

## Prerequisites

- Node.js (v16.8 or later)
- npm or yarn
- MetaMask or compatible Ethereum wallet browser extension
- Access to an Ethereum network (mainnet, testnet, or local development network)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/defi-exchange.git
   cd defi-exchange

2. npm install
3. npm run dev

## Smart Contract Requirements

- **MockERC20**: A standard ERC20 token for testing
- **MockUSDC**: A standard ERC20 token with 6 decimals, simulating USDC
- **SimpleUniswapV2Factory**: Factory contract for creating trading pairs
- **SimpleUniswapV2Pair**: Trading pair contract
- **SimpleUniswapV2Router**: Router contract for swapping tokens and managing liquidity

  Make sure these contracts are deployed and their addresses are correctly configured in `constants/addresses.ts`.

## Configuration

### Contract Addresses

Update the `constants/addresses.ts` file with your deployed contract addresses:

```
export const CONTRACT_ADDRESSES = {
  mockERC20: "0x...", // Your MockERC20 contract address
  mockUSDC: "0x...", // Your MockUSDC contract address
  uniswapFactory: "0x...", // Your SimpleUniswapV2Factory contract address
  uniswapRouter: "0x...", // Your SimpleUniswapV2Router contract address
  uniswapPair: "0x..." // Your MockERC20-MockUSDC pair address
}
```

## Project Structure
```
defi-exchange/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application page
├── components/           # React components
│   ├── home.tsx          # Home page component
│   ├── trading.tsx       # Trading page component
│   ├── liquidity.tsx     # Liquidity page component
│   ├── history.tsx       # Transaction history component
│   ├── token-balance.tsx # Token balance display component
│   └── wallet-connect-button.tsx # Wallet connection button
├── context/              # React context
│   └── wallet-context.tsx # Wallet connection context
├── constants/            # Constants and ABIs
│   ├── abis.ts           # Contract ABIs
│   └── addresses.ts      # Contract addresses
└── tailwind.config.ts    # Tailwind CSS configuration
```
## Development

### Adding New Tokens

To add support for a new token:

1. Deploy the ERC20 token contract
2. Add its address to `constants/addresses.ts`
3. Add its ABI to `constants/abis.ts`
4. Update the UI components to include the new token


### Customizing the UI

This project uses Tailwind CSS for styling. You can customize the UI by:

1. Modifying the `tailwind.config.ts` file
2. Updating component styles in their respective files

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [ethers.js](https://docs.ethers.org/v6/) for Ethereum interactions
- [Uniswap V2](https://uniswap.org/) for the exchange protocol design
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Tailwind CSS](https://tailwindcss.com/) for styling