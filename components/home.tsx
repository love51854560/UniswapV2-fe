"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/context/wallet-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { TokenBalance } from "@/components/token-balance"
import { MOCK_ERC20_ABI, MOCK_USDC_ABI } from "@/constants/abis"
import { CONTRACT_ADDRESSES } from "@/constants/addresses"

export function Home() {
  const { address, provider, signer } = useWallet()
  const [isLoading, setIsLoading] = useState(true)
  const [mockTokenBalance, setMockTokenBalance] = useState("0")
  const [usdcBalance, setUsdcBalance] = useState("0")
  const [ethBalance, setEthBalance] = useState("0")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBalances = async () => {
      if (!address || !provider || !signer) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Fetch ETH balance
        const balance = await provider.getBalance(address)
        setEthBalance(ethers.formatEther(balance))

        // Fetch MockERC20 balance
        const mockTokenContract = new ethers.Contract(CONTRACT_ADDRESSES.mockERC20, MOCK_ERC20_ABI, provider)
        const tokenBalance = await mockTokenContract.balanceOf(address)
        
        setMockTokenBalance(ethers.formatUnits(tokenBalance, 18))

        // Fetch MockUSDC balance
        const mockUsdcContract = new ethers.Contract(CONTRACT_ADDRESSES.mockUSDC, MOCK_USDC_ABI, provider)
        const usdcBalance = await mockUsdcContract.balanceOf(address)
        setUsdcBalance(ethers.formatUnits(usdcBalance, 6))
      } catch (err) {
        console.error("Error fetching balances:", err)
        setError("Failed to fetch token balances. Please check your connection and try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalances()
  }, [address, provider, signer])

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-4">Welcome to DeFi Exchange</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Connect your wallet to view your token balances, trade tokens, and manage liquidity.
        </p>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not connected</AlertTitle>
          <AlertDescription>Please connect your wallet using the button in the top right corner.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Portfolio</h2>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TokenBalance
          name="Ethereum"
          symbol="ETH"
          balance={ethBalance}
          isLoading={isLoading}
          decimals={18}
          iconUrl="/placeholder.svg?height=40&width=40"
        />

        <TokenBalance
          name="Mock Token"
          symbol="MOCK"
          balance={mockTokenBalance}
          isLoading={isLoading}
          decimals={18}
          iconUrl="/placeholder.svg?height=40&width=40"
        />

        <TokenBalance
          name="USD Coin"
          symbol="USDC"
          balance={usdcBalance}
          isLoading={isLoading}
          decimals={6}
          iconUrl="/placeholder.svg?height=40&width=40"
        />
      </div>
    </div>
  )
}

