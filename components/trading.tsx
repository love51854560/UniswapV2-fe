"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/context/wallet-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowDown, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MOCK_ERC20_ABI, MOCK_USDC_ABI, UNISWAP_PAIR_ABI } from "@/constants/abis"
import { CONTRACT_ADDRESSES } from "@/constants/addresses"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function Trading() {
  const { address, provider, signer } = useWallet()
  const { toast } = useToast()

  const [fromToken, setFromToken] = useState("MOCK")
  const [toToken, setToToken] = useState("USDC")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<string | null>(null)

  // Get token addresses based on selection
  const getTokenAddress = (symbol: string) => {
    return symbol === "MOCK" ? CONTRACT_ADDRESSES.mockERC20 : CONTRACT_ADDRESSES.mockUSDC
  }

  // Get token decimals based on selection
  const getTokenDecimals = (symbol: string) => {
    return symbol === "MOCK" ? 18 : 6
  }

  // Swap the tokens
  const swapTokens = () => {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount("")
    setToAmount("")
    setExchangeRate(null)
  }

  // Calculate the output amount based on input
  useEffect(() => {
    const calculateOutputAmount = async () => {
      if (!fromAmount || !provider || Number.parseFloat(fromAmount) === 0) {
        setToAmount("")
        setExchangeRate(null)
        return
      }

      setIsCalculating(true)

      try {
        const pairContract = new ethers.Contract(CONTRACT_ADDRESSES.uniswapPair, UNISWAP_PAIR_ABI, provider)

        // Get reserves
        const [reserve0, reserve1] = await pairContract.getReserves()

        // Determine which reserve corresponds to which token
        const token0 = await pairContract.token0()
        const fromTokenAddress = getTokenAddress(fromToken)

        let fromReserve, toReserve

        if (fromTokenAddress.toLowerCase() === token0.toLowerCase()) {
          fromReserve = reserve0
          toReserve = reserve1
        } else {
          fromReserve = reserve1
          toReserve = reserve0
        }

        // Calculate output amount using constant product formula (x * y = k)
        // Accounting for 0.3% fee: amountOut = (toReserve * amountIn * 0.997) / (fromReserve + amountIn * 0.997)
        const fromDecimals = getTokenDecimals(fromToken)
        const toDecimals = getTokenDecimals(toToken)

        const amountIn = ethers.parseUnits(fromAmount, fromDecimals)
        const amountInWithFee = amountIn * BigInt(997)
        const numerator = toReserve * amountInWithFee
        const denominator = fromReserve * BigInt(1000) + amountInWithFee
        const amountOut = numerator / denominator

        setToAmount(ethers.formatUnits(amountOut, toDecimals))

        // Calculate and set exchange rate
        if (Number.parseFloat(fromAmount) > 0) {
          const rate = Number.parseFloat(ethers.formatUnits(amountOut, toDecimals)) / Number.parseFloat(fromAmount)
          setExchangeRate(`1 ${fromToken} = ${rate.toFixed(6)} ${toToken}`)
        }
      } catch (error) {
        console.error("Error calculating swap:", error)
        toast({
          title: "Calculation Error",
          description: "Failed to calculate swap. The liquidity pool might not exist.",
          variant: "destructive",
        })
        setToAmount("")
        setExchangeRate(null)
      } finally {
        setIsCalculating(false)
      }
    }

    calculateOutputAmount()
  }, [fromAmount, fromToken, toToken, provider, toast])

  // Check if approval is needed
  useEffect(() => {
    const checkApproval = async () => {
      if (!address || !signer || !provider || !fromAmount || Number.parseFloat(fromAmount) <= 0) {
        setNeedsApproval(false)
        return
      }

      try {
        const fromTokenAddress = getTokenAddress(fromToken)
        const fromDecimals = getTokenDecimals(fromToken)
        const tokenContract = new ethers.Contract(
          fromTokenAddress,
          fromToken === "MOCK" ? MOCK_ERC20_ABI : MOCK_USDC_ABI,
          provider,
        )

        const allowance = await tokenContract.allowance(address, CONTRACT_ADDRESSES.uniswapRouter)
        const amountToSwap = ethers.parseUnits(fromAmount, fromDecimals)

        setNeedsApproval(allowance < amountToSwap)
      } catch (error) {
        console.error("Error checking approval:", error)
        setNeedsApproval(true)
      }
    }

    checkApproval()
  }, [address, signer, provider, fromAmount, fromToken])

  // Approve token spending
  const approveToken = async () => {
    if (!signer) return

    setIsApproving(true)

    try {
      const fromTokenAddress = getTokenAddress(fromToken)
      const fromDecimals = getTokenDecimals(fromToken)
      const tokenContract = new ethers.Contract(
        fromTokenAddress,
        fromToken === "MOCK" ? MOCK_ERC20_ABI : MOCK_USDC_ABI,
        signer,
      )

      // Approve a large amount to avoid frequent approvals
      const tx = await tokenContract.approve(
        CONTRACT_ADDRESSES.uniswapRouter,
        ethers.parseUnits("1000000", fromDecimals),
      )

      toast({
        title: "Approval Pending",
        description: "Please confirm the transaction in your wallet",
      })

      await tx.wait()

      toast({
        title: "Approval Successful",
        description: `You can now swap ${fromToken}`,
      })

      setNeedsApproval(false)
    } catch (error) {
      console.error("Error approving token:", error)
      toast({
        title: "Approval Failed",
        description: "Failed to approve token spending",
        variant: "destructive",
      })
    } finally {
      setIsApproving(false)
    }
  }

  // Execute the swap
  const executeSwap = async () => {
    if (!signer || !fromAmount || Number.parseFloat(fromAmount) <= 0) return

    setIsLoading(true)

    try {
      const routerContract = new ethers.Contract(
        CONTRACT_ADDRESSES.uniswapRouter,
        [
          "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        ],
        signer,
      )

      const fromTokenAddress = getTokenAddress(fromToken)
      const toTokenAddress = getTokenAddress(toToken)
      const fromDecimals = getTokenDecimals(fromToken)

      // Set up the path for the swap
      const path = [fromTokenAddress, toTokenAddress]

      // Calculate minimum output amount (with 2% slippage)
      const amountIn = ethers.parseUnits(fromAmount, fromDecimals)
      const amountOutMin = ethers.parseUnits(
        (Number.parseFloat(toAmount) * 0.98).toFixed(getTokenDecimals(toToken)),
        getTokenDecimals(toToken),
      )

      // Set deadline to 20 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60

      const tx = await routerContract.swapExactTokensForTokens(amountIn, amountOutMin, path, address, deadline)

      toast({
        title: "Swap Pending",
        description: "Please confirm the transaction in your wallet",
      })

      await tx.wait()

      toast({
        title: "Swap Successful",
        description: `Swapped ${fromAmount} ${fromToken} for approximately ${toAmount} ${toToken}`,
      })

      // Reset form
      setFromAmount("")
      setToAmount("")
    } catch (error) {
      console.error("Error executing swap:", error)
      toast({
        title: "Swap Failed",
        description: "Failed to execute the swap transaction",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!address) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not connected</AlertTitle>
        <AlertDescription>Please connect your wallet to trade tokens.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Swap Tokens</h2>

      <Card>
        <CardHeader>
          <CardTitle>Trade</CardTitle>
          <CardDescription>Swap between MOCK and USDC tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>From</Label>
              <div className="flex items-center space-x-2">
                <div className="w-1/4">
                  <div className="p-2 border rounded-md text-center font-medium">{fromToken}</div>
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" size="icon" onClick={swapTokens} disabled={isLoading || isCalculating}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>To</Label>
              <div className="flex items-center space-x-2">
                <div className="w-1/4">
                  <div className="p-2 border rounded-md text-center font-medium">{toToken}</div>
                </div>
                <div className="flex-1">
                  <Input type="number" placeholder="0.0" value={toAmount} readOnly disabled />
                </div>
              </div>
            </div>

            {exchangeRate && <div className="text-sm text-muted-foreground">{exchangeRate}</div>}

            {isCalculating && (
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                Calculating...
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {needsApproval ? (
            <Button
              onClick={approveToken}
              disabled={isApproving || !fromAmount || Number.parseFloat(fromAmount) <= 0}
              className="w-full"
            >
              {isApproving ? "Approving..." : `Approve ${fromToken}`}
            </Button>
          ) : (
            <Button
              onClick={executeSwap}
              disabled={
                isLoading ||
                !fromAmount ||
                !toAmount ||
                Number.parseFloat(fromAmount) <= 0 ||
                Number.parseFloat(toAmount) <= 0
              }
              className="w-full"
            >
              {isLoading ? "Swapping..." : "Swap"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

