"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/context/wallet-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { MOCK_ERC20_ABI, MOCK_USDC_ABI, UNISWAP_PAIR_ABI } from "@/constants/abis"
import { CONTRACT_ADDRESSES } from "@/constants/addresses"

export function Liquidity() {
  const { address, provider, signer } = useWallet()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("add")
  const [mockAmount, setMockAmount] = useState("")
  const [usdcAmount, setUsdcAmount] = useState("")
  const [lpTokenBalance, setLpTokenBalance] = useState("0")
  const [mockApproved, setMockApproved] = useState(false)
  const [usdcApproved, setUsdcApproved] = useState(false)
  const [isLoadingAdd, setIsLoadingAdd] = useState(false)
  const [isLoadingRemove, setIsLoadingRemove] = useState(false)
  const [isApprovingMock, setIsApprovingMock] = useState(false)
  const [isApprovingUsdc, setIsApprovingUsdc] = useState(false)
  const [removeAmount, setRemoveAmount] = useState("")
  const [poolInfo, setPoolInfo] = useState({
    mockReserve: "0",
    usdcReserve: "0",
    totalSupply: "0",
  })

  // Fetch LP token balance and pool info
  useEffect(() => {
    const fetchLiquidityInfo = async () => {
      if (!address || !provider) return

      try {
        const pairContract = new ethers.Contract(CONTRACT_ADDRESSES.uniswapPair, UNISWAP_PAIR_ABI, provider)

        // Get LP token balance
        const balance = await pairContract.balanceOf(address)
        setLpTokenBalance(ethers.formatUnits(balance, 18))

        // Get reserves
        const [reserve0, reserve1] = await pairContract.getReserves()
        console.log('reserve0',reserve0);
        
        const totalSupply = await pairContract.totalSupply()

        // Determine which reserve corresponds to which token
        const token0 = await pairContract.token0()

        let mockReserve, usdcReserve

        if (CONTRACT_ADDRESSES.mockERC20.toLowerCase() === token0.toLowerCase()) {
          mockReserve = reserve0
          usdcReserve = reserve1
        } else {
          mockReserve = reserve1
          usdcReserve = reserve0
        }

        setPoolInfo({
          mockReserve: ethers.formatUnits(mockReserve, 18),
          usdcReserve: ethers.formatUnits(usdcReserve, 6),
          totalSupply: ethers.formatUnits(totalSupply, 18),
        })
      } catch (error) {
        console.error("Error fetching liquidity info:", error)
      }
    }

    fetchLiquidityInfo()

    // Set up interval to refresh data
    const interval = setInterval(fetchLiquidityInfo, 15000)

    return () => clearInterval(interval)
  }, [address, provider])

  // Check approvals
  useEffect(() => {
    const checkApprovals = async () => {
      if (!address || !provider || !signer) return

      try {
        // Check MOCK approval
        const mockContract = new ethers.Contract(CONTRACT_ADDRESSES.mockERC20, MOCK_ERC20_ABI, provider)

        const mockAllowance = await mockContract.allowance(address, CONTRACT_ADDRESSES.uniswapRouter)
        setMockApproved(mockAllowance > ethers.parseUnits("1000", 18))

        // Check USDC approval
        const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.mockUSDC, MOCK_USDC_ABI, provider)

        const usdcAllowance = await usdcContract.allowance(address, CONTRACT_ADDRESSES.uniswapRouter)
        setUsdcApproved(usdcAllowance > ethers.parseUnits("1000", 6))
      } catch (error) {
        console.error("Error checking approvals:", error)
      }
    }

    checkApprovals()
  }, [address, provider, signer])

  // Calculate the other token amount based on the current ratio
  const calculatePairedAmount = (amount: string, isCalculatingUsdc: boolean) => {
    if (
      !amount ||
      Number.parseFloat(amount) === 0 ||
      Number.parseFloat(poolInfo.mockReserve) === 0 ||
      Number.parseFloat(poolInfo.usdcReserve) === 0
    ) {
      return isCalculatingUsdc ? setUsdcAmount("") : setMockAmount("")
    }

    try {
      if (isCalculatingUsdc) {
        // Calculate USDC amount based on MOCK input
        const mockValue = Number.parseFloat(amount)
        const usdcValue =
          (mockValue * Number.parseFloat(poolInfo.usdcReserve)) / Number.parseFloat(poolInfo.mockReserve)
        setUsdcAmount(usdcValue.toFixed(6))
      } else {
        // Calculate MOCK amount based on USDC input
        const usdcValue = Number.parseFloat(amount)
        const mockValue =
          (usdcValue * Number.parseFloat(poolInfo.mockReserve)) / Number.parseFloat(poolInfo.usdcReserve)
        setMockAmount(mockValue.toFixed(18))
      }
    } catch (error) {
      console.error("Error calculating paired amount:", error)
    }
  }

  // Approve MOCK token
  const approveMock = async () => {
    if (!signer) return

    setIsApprovingMock(true)

    try {
      const mockContract = new ethers.Contract(CONTRACT_ADDRESSES.mockERC20, MOCK_ERC20_ABI, signer)

      const tx = await mockContract.approve(CONTRACT_ADDRESSES.uniswapRouter, ethers.parseUnits("1000000", 18))

      toast({
        title: "Approval Pending",
        description: "Please confirm the MOCK token approval in your wallet",
      })

      await tx.wait()

      toast({
        title: "Approval Successful",
        description: "MOCK token approved for liquidity provision",
      })

      setMockApproved(true)
    } catch (error) {
      console.error("Error approving MOCK:", error)
      toast({
        title: "Approval Failed",
        description: "Failed to approve MOCK token",
        variant: "destructive",
      })
    } finally {
      setIsApprovingMock(false)
    }
  }

  // Approve USDC token
  const approveUsdc = async () => {
    if (!signer) return

    setIsApprovingUsdc(true)

    try {
      const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.mockUSDC, MOCK_USDC_ABI, signer)

      const tx = await usdcContract.approve(CONTRACT_ADDRESSES.uniswapRouter, ethers.parseUnits("1000000", 6))

      toast({
        title: "Approval Pending",
        description: "Please confirm the USDC token approval in your wallet",
      })

      await tx.wait()

      toast({
        title: "Approval Successful",
        description: "USDC token approved for liquidity provision",
      })

      setUsdcApproved(true)
    } catch (error) {
      console.error("Error approving USDC:", error)
      toast({
        title: "Approval Failed",
        description: "Failed to approve USDC token",
        variant: "destructive",
      })
    } finally {
      setIsApprovingUsdc(false)
    }
  }

  // Add liquidity
  const addLiquidity = async () => {
    if (!signer || !mockAmount || !usdcAmount) return

    setIsLoadingAdd(true)

    try {
      const routerContract = new ethers.Contract(
        CONTRACT_ADDRESSES.uniswapRouter,
        [
          "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
        ],
        signer,
      )

      const mockAmountWei = ethers.parseUnits(mockAmount, 18)
      const usdcAmountWei = ethers.parseUnits(usdcAmount, 6)

      // Set minimum amounts with 2% slippage
      const mockAmountMin = (mockAmountWei * BigInt(98)) / BigInt(100)
      const usdcAmountMin = (usdcAmountWei * BigInt(98)) / BigInt(100)

      // Set deadline to 20 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60

      const tx = await routerContract.addLiquidity(
        CONTRACT_ADDRESSES.mockERC20,
        CONTRACT_ADDRESSES.mockUSDC,
        mockAmountWei,
        usdcAmountWei,
        mockAmountMin,
        usdcAmountMin,
        address,
        deadline,
      )

      toast({
        title: "Adding Liquidity",
        description: "Please confirm the transaction in your wallet",
      })

      await tx.wait()

      toast({
        title: "Liquidity Added",
        description: `Successfully added ${mockAmount} MOCK and ${usdcAmount} USDC to the liquidity pool`,
      })

      // Reset form
      setMockAmount("")
      setUsdcAmount("")
    } catch (error) {
      console.error("Error adding liquidity:", error)
      toast({
        title: "Transaction Failed",
        description: "Failed to add liquidity",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAdd(false)
    }
  }

  // Remove liquidity
  const removeLiquidity = async () => {
    if (!signer || !removeAmount || Number.parseFloat(removeAmount) <= 0) return

    setIsLoadingRemove(true)

    try {
      const routerContract = new ethers.Contract(
        CONTRACT_ADDRESSES.uniswapRouter,
        [
          "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
        ],
        signer,
      )

      const pairContract = new ethers.Contract(CONTRACT_ADDRESSES.uniswapPair, UNISWAP_PAIR_ABI, signer)

      // First approve the router to spend LP tokens
      const liquidityAmount = ethers.parseUnits(removeAmount, 18)

      const approveTx = await pairContract.approve(CONTRACT_ADDRESSES.uniswapRouter, liquidityAmount)

      toast({
        title: "Approval Pending",
        description: "Please approve the LP token transfer",
      })

      await approveTx.wait()

      // Calculate minimum amounts with 2% slippage
      const userShare = Number.parseFloat(removeAmount) / Number.parseFloat(poolInfo.totalSupply)
      const mockMinAmount = ethers.parseUnits(
        (Number.parseFloat(poolInfo.mockReserve) * userShare * 0.98).toFixed(18),
        18,
      )
      const usdcMinAmount = ethers.parseUnits(
        (Number.parseFloat(poolInfo.usdcReserve) * userShare * 0.98).toFixed(6),
        6,
      )

      // Set deadline to 20 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + 20 * 60

      const tx = await routerContract.removeLiquidity(
        CONTRACT_ADDRESSES.mockERC20,
        CONTRACT_ADDRESSES.mockUSDC,
        liquidityAmount,
        mockMinAmount,
        usdcMinAmount,
        address,
        deadline,
      )

      toast({
        title: "Removing Liquidity",
        description: "Please confirm the transaction in your wallet",
      })

      await tx.wait()

      toast({
        title: "Liquidity Removed",
        description: `Successfully removed ${removeAmount} LP tokens from the pool`,
      })

      // Reset form
      setRemoveAmount("")
    } catch (error) {
      console.error("Error removing liquidity:", error)
      toast({
        title: "Transaction Failed",
        description: "Failed to remove liquidity",
        variant: "destructive",
      })
    } finally {
      setIsLoadingRemove(false)
    }
  }

  if (!address) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not connected</AlertTitle>
        <AlertDescription>Please connect your wallet to manage liquidity.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Liquidity Management</h2>

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Pool Information</CardTitle>
            <CardDescription>Current liquidity pool status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>MOCK Reserve</Label>
                <div className="text-xl font-bold mt-1">
                  {Number.parseFloat(poolInfo.mockReserve).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </div>
              <div>
                <Label>USDC Reserve</Label>
                <div className="text-xl font-bold mt-1">
                  {Number.parseFloat(poolInfo.usdcReserve).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </div>
              <div>
                <Label>Your LP Tokens</Label>
                <div className="text-xl font-bold mt-1">
                  {Number.parseFloat(lpTokenBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="add" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="add">Add Liquidity</TabsTrigger>
          <TabsTrigger value="remove">Remove Liquidity</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Liquidity</CardTitle>
              <CardDescription>Provide tokens to the MOCK-USDC liquidity pool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>MOCK Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={mockAmount}
                    onChange={(e) => {
                      setMockAmount(e.target.value)
                      calculatePairedAmount(e.target.value, true)
                    }}
                    disabled={isLoadingAdd}
                  />
                </div>

                <div className="flex justify-center">
                  <Plus className="h-4 w-4" />
                </div>

                <div className="space-y-2">
                  <Label>USDC Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={usdcAmount}
                    onChange={(e) => {
                      setUsdcAmount(e.target.value)
                      calculatePairedAmount(e.target.value, false)
                    }}
                    disabled={isLoadingAdd}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              {!mockApproved || !usdcApproved ? (
                <div className="flex flex-col space-y-2 w-full">
                  {!mockApproved && (
                    <Button onClick={approveMock} disabled={isApprovingMock} className="w-full">
                      {isApprovingMock ? "Approving MOCK..." : "Approve MOCK"}
                    </Button>
                  )}

                  {!usdcApproved && (
                    <Button onClick={approveUsdc} disabled={isApprovingUsdc} className="w-full">
                      {isApprovingUsdc ? "Approving USDC..." : "Approve USDC"}
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={addLiquidity}
                  disabled={
                    isLoadingAdd ||
                    !mockAmount ||
                    !usdcAmount ||
                    Number.parseFloat(mockAmount) <= 0 ||
                    Number.parseFloat(usdcAmount) <= 0
                  }
                  className="w-full"
                >
                  {isLoadingAdd ? "Adding Liquidity..." : "Add Liquidity"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="remove">
          <Card>
            <CardHeader>
              <CardTitle>Remove Liquidity</CardTitle>
              <CardDescription>Withdraw your tokens from the MOCK-USDC liquidity pool</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>LP Tokens to Remove</Label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={removeAmount}
                    onChange={(e) => setRemoveAmount(e.target.value)}
                    disabled={isLoadingRemove}
                    max={lpTokenBalance}
                  />
                  <div className="text-sm text-muted-foreground">
                    Available:{" "}
                    {Number.parseFloat(lpTokenBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} LP
                    Tokens
                  </div>
                </div>

                {removeAmount && Number.parseFloat(removeAmount) > 0 && (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <div className="text-sm font-medium mb-2">You will receive approximately:</div>
                    <div className="flex justify-between">
                      <span>MOCK:</span>
                      <span className="font-medium">
                        {(
                          (Number.parseFloat(poolInfo.mockReserve) * Number.parseFloat(removeAmount)) /
                          Number.parseFloat(poolInfo.totalSupply)
                        ).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>USDC:</span>
                      <span className="font-medium">
                        {(
                          (Number.parseFloat(poolInfo.usdcReserve) * Number.parseFloat(removeAmount)) /
                          Number.parseFloat(poolInfo.totalSupply)
                        ).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={removeLiquidity}
                disabled={
                  isLoadingRemove ||
                  !removeAmount ||
                  Number.parseFloat(removeAmount) <= 0 ||
                  Number.parseFloat(removeAmount) > Number.parseFloat(lpTokenBalance)
                }
                className="w-full"
              >
                {isLoadingRemove ? "Removing Liquidity..." : "Remove Liquidity"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

