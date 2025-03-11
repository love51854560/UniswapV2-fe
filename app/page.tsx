"use client"
import { WalletConnectButton } from "@/components/wallet-connect-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Home } from "@/components/home"
import { Trading } from "@/components/trading"
import { Liquidity } from "@/components/liquidity"
import { History } from "@/components/history"
import { WalletProvider } from "@/context/wallet-context"

export default function DeFiExchange() {
  return (
    <WalletProvider>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">DeFi Exchange</h1>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Trade and provide liquidity for ERC20 tokens</p>
            <WalletConnectButton />
          </div>
        </header>

        <Tabs defaultValue="home" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="pt-6">
              <TabsContent value="home">
                <Home />
              </TabsContent>

              <TabsContent value="trading">
                <Trading />
              </TabsContent>

              <TabsContent value="liquidity">
                <Liquidity />
              </TabsContent>

              <TabsContent value="history">
                <History />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </WalletProvider>
  )
}

