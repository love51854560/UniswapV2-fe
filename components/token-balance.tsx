import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

interface TokenBalanceProps {
  name: string
  symbol: string
  balance: string
  isLoading: boolean
  decimals: number
  iconUrl: string
}

export function TokenBalance({ name, symbol, balance, isLoading, decimals, iconUrl }: TokenBalanceProps) {
  // Format balance to show only up to 6 decimal places
  const formattedBalance = Number.parseFloat(balance).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        <div className="h-10 w-10 rounded-full overflow-hidden">
          <Image src={iconUrl || "/placeholder.svg"} alt={symbol} width={40} height={40} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <div className="text-2xl font-bold">
            {formattedBalance} <span className="text-sm font-normal text-muted-foreground">{symbol}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

