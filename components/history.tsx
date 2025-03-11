"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { useWallet } from "@/context/wallet-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ArrowDownUp, Plus, Minus } from "lucide-react"
import { UNISWAP_PAIR_ABI } from "@/constants/abis"
import { CONTRACT_ADDRESSES } from "@/constants/addresses"

interface Transaction {
  id: string
  type: "swap" | "addLiquidity" | "removeLiquidity"
  timestamp: number
  hash: string
  details: {
    tokenA?: string
    tokenB?: string
    amountA?: string
    amountB?: string
    liquidity?: string
  }
}

export function History() {
  const { address, provider } = useWallet()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!address || !provider) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const pairContract = new ethers.Contract(CONTRACT_ADDRESSES.uniswapPair, UNISWAP_PAIR_ABI, provider)

        // Get token addresses
        const token0 = await pairContract.token0()
        const token1 = await pairContract.token1()

        // Map token addresses to symbols
        const tokenMap: Record<string, string> = {
          [token0.toLowerCase()]: token0.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? "MOCK" : "USDC",
          [token1.toLowerCase()]: token1.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? "MOCK" : "USDC",
        }

        // Get events for the connected address
        const filter = {
          address: CONTRACT_ADDRESSES.uniswapPair,
          fromBlock: -10000, // Last 10000 blocks, adjust as needed
          toBlock: "latest",
        }

        // Get Swap events
        const swapFilter = {
          ...filter,
          topics: [ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)")],
        }

        const swapEvents = await provider.getLogs(swapFilter)

        // Get Mint events (add liquidity)
        const mintFilter = {
          ...filter,
          topics: [ethers.id("Mint(address,uint256,uint256)")],
        }

        const mintEvents = await provider.getLogs(mintFilter)

        // Get Burn events (remove liquidity)
        const burnFilter = {
          ...filter,
          topics: [ethers.id("Burn(address,uint256,uint256,address)")],
        }

        const burnEvents = await provider.getLogs(burnFilter)

        // Process events
        const swapTxs = await Promise.all(
          swapEvents.map(async (event) => {
            const tx = await provider.getTransaction(event.transactionHash)
            const block = await provider.getBlock(event.blockNumber)

            if (!tx || !block || tx.from.toLowerCase() !== address.toLowerCase()) return null

            const decodedData = pairContract.interface.parseLog({
              topics: event.topics as string[],
              data: event.data,
            })

            return {
              id: `${event.transactionHash}-${event.logIndex}`,
              type: "swap" as const,
              timestamp: block.timestamp,
              hash: event.transactionHash,
              details: {
                tokenA: tokenMap[token0.toLowerCase()],
                tokenB: tokenMap[token1.toLowerCase()],
                amountA: ethers.formatUnits(
                  decodedData.args[1],
                  token0.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? 18 : 6,
                ),
                amountB: ethers.formatUnits(
                  decodedData.args[2],
                  token1.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? 18 : 6,
                ),
              },
            }
          }),
        )

        const mintTxs = await Promise.all(
          mintEvents.map(async (event) => {
            const tx = await provider.getTransaction(event.transactionHash)
            const block = await provider.getBlock(event.blockNumber)

            if (!tx || !block || tx.from.toLowerCase() !== address.toLowerCase()) return null

            const decodedData = pairContract.interface.parseLog({
              topics: event.topics as string[],
              data: event.data,
            })

            return {
              id: `${event.transactionHash}-${event.logIndex}`,
              type: "addLiquidity" as const,
              timestamp: block.timestamp,
              hash: event.transactionHash,
              details: {
                tokenA: tokenMap[token0.toLowerCase()],
                tokenB: tokenMap[token1.toLowerCase()],
                amountA: ethers.formatUnits(
                  decodedData.args[1],
                  token0.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? 18 : 6,
                ),
                amountB: ethers.formatUnits(
                  decodedData.args[2],
                  token1.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? 18 : 6,
                ),
                liquidity: ethers.formatUnits(decodedData.args[0], 18),
              },
            }
          }),
        )

        const burnTxs = await Promise.all(
          burnEvents.map(async (event) => {
            const tx = await provider.getTransaction(event.transactionHash)
            const block = await provider.getBlock(event.blockNumber)

            if (!tx || !block || tx.from.toLowerCase() !== address.toLowerCase()) return null

            const decodedData = pairContract.interface.parseLog({
              topics: event.topics as string[],
              data: event.data,
            })

            return {
              id: `${event.transactionHash}-${event.logIndex}`,
              type: "removeLiquidity" as const,
              timestamp: block.timestamp,
              hash: event.transactionHash,
              details: {
                tokenA: tokenMap[token0.toLowerCase()],
                tokenB: tokenMap[token1.toLowerCase()],
                amountA: ethers.formatUnits(
                  decodedData.args[1],
                  token0.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? 18 : 6,
                ),
                amountB: ethers.formatUnits(
                  decodedData.args[2],
                  token1.toLowerCase() === CONTRACT_ADDRESSES.mockERC20.toLowerCase() ? 18 : 6,
                ),
                liquidity: ethers.formatUnits(decodedData.args[0], 18),
              },
            }
          }),
        )

        // Combine and filter out null values
        const allTxs = [...swapTxs, ...mintTxs, ...burnTxs]
          .filter((tx): tx is Transaction => tx !== null)
          .sort((a, b) => b.timestamp - a.timestamp)

        setTransactions(allTxs)
      } catch (error) {
        console.error("Error fetching transaction history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactionHistory()
  }, [address, provider])

  if (!address) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not connected</AlertTitle>
        <AlertDescription>Please connect your wallet to view your transaction history.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Transaction History</h2>

      {isLoading ? (
        <div className="text-center py-8">Loading transaction history...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No transactions found for this wallet address.</div>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <Card key={tx.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {tx.type === "swap" && <ArrowDownUp className="h-5 w-5 mr-2" />}
                    {tx.type === "addLiquidity" && <Plus className="h-5 w-5 mr-2" />}
                    {tx.type === "removeLiquidity" && <Minus className="h-5 w-5 mr-2" />}
                    <CardTitle className="text-base">
                      {tx.type === "swap" && "Swap"}
                      {tx.type === "addLiquidity" && "Add Liquidity"}
                      {tx.type === "removeLiquidity" && "Remove Liquidity"}
                    </CardTitle>
                  </div>
                  <CardDescription>{new Date(tx.timestamp * 1000).toLocaleString()}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {tx.type === "swap" && (
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between">
                        <span>Swapped:</span>
                        <span>
                          {Number.parseFloat(tx.details.amountA || "0").toFixed(6)} {tx.details.tokenA}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>For:</span>
                        <span>
                          {Number.parseFloat(tx.details.amountB || "0").toFixed(6)} {tx.details.tokenB}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction:</span>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                        </a>
                      </div>
                    </div>
                  )}

                  {tx.type === "addLiquidity" && (
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between">
                        <span>Added:</span>
                        <span>
                          {Number.parseFloat(tx.details.amountA || "0").toFixed(6)} {tx.details.tokenA}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>And:</span>
                        <span>
                          {Number.parseFloat(tx.details.amountB || "0").toFixed(6)} {tx.details.tokenB}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>LP Tokens:</span>
                        <span>{Number.parseFloat(tx.details.liquidity || "0").toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction:</span>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                        </a>
                      </div>
                    </div>
                  )}

                  {tx.type === "removeLiquidity" && (
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between">
                        <span>Removed:</span>
                        <span>{Number.parseFloat(tx.details.liquidity || "0").toFixed(6)} LP Tokens</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Received:</span>
                        <span>
                          {Number.parseFloat(tx.details.amountA || "0").toFixed(6)} {tx.details.tokenA}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>And:</span>
                        <span>
                          {Number.parseFloat(tx.details.amountB || "0").toFixed(6)} {tx.details.tokenB}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction:</span>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

