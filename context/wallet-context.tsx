"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { ethers } from "ethers"
import { useToast } from "@/hooks/use-toast"

interface WalletContextType {
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
  address: string | null
  chainId: number | null
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
})

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.isMetaMask) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            const browserProvider = new ethers.BrowserProvider(window.ethereum)
            const connectedSigner = await browserProvider.getSigner()
            const connectedAddress = await connectedSigner.getAddress()
            const network = await browserProvider.getNetwork()

            setProvider(browserProvider)
            setSigner(connectedSigner)
            setAddress(connectedAddress)
            setChainId(Number(network.chainId))
          }
        } catch (error) {
          console.error("Failed to connect to wallet:", error)
        }
      }
    }

    checkConnection()
  }, [])

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnect()
        } else if (accounts[0] !== address) {
          // User switched accounts
          if (provider) {
            const newSigner = await provider.getSigner()
            setSigner(newSigner)
            setAddress(accounts[0])

            toast({
              title: "Account changed",
              description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
            })
          }
        }
      }

      const handleChainChanged = (chainIdHex: string) => {
        const newChainId = Number.parseInt(chainIdHex, 16)
        setChainId(newChainId)

        toast({
          title: "Network changed",
          description: `Switched to chain ID: ${newChainId}`,
        })

        // Reload the page to avoid any state inconsistencies
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [provider, address, toast])

  const connect = async () => {
    if (!window.ethereum) {
      toast({
        title: "No wallet detected",
        description: "Please install MetaMask or another Ethereum wallet",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)

    try {
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" })

      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const connectedSigner = await browserProvider.getSigner()
      const connectedAddress = await connectedSigner.getAddress()
      const network = await browserProvider.getNetwork()

      setProvider(browserProvider)
      setSigner(connectedSigner)
      setAddress(connectedAddress)
      setChainId(Number(network.chainId))

      toast({
        title: "Wallet connected",
        description: `Connected to ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`,
      })
    } catch (error) {
      console.error("Failed to connect to wallet:", error)
      toast({
        title: "Connection failed",
        description: "Failed to connect to your wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setProvider(null)
    setSigner(null)
    setAddress(null)
    setChainId(null)

    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    })
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        isConnecting,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)

