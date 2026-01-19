import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Package, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Plus,
  Settings,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { Decimal } from '@prisma/client/runtime/library'
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart'
import { QuickScanButton } from '@/components/dashboard/QuickScanButton'

// Format currency
function formatCurrency(value: number | Decimal): string {
  const numValue = typeof value === 'object' ? Number(value) : value
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'RSD',
    minimumFractionDigits: 2,
  }).format(numValue)
}

// Format date for chart
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

interface ChartDataPoint {
  date: string
  count: number
}

async function getDashboardData(profileId: string) {
  // Parallel data fetching for maximum performance
  const [
    productCount,
    catalogCount,
    recentProducts,
    allProducts,
  ] = await Promise.all([
    // Total products count
    prisma.product.count({
      where: { profileId },
    }),
    
    // Total catalogs count
    prisma.catalog.count({
      where: { profileId },
    }),
    
    // Recent products (top 5)
    prisma.product.findMany({
      where: { profileId },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    }),
    
    // All products for analytics and inventory calculation
    prisma.product.findMany({
      where: { profileId },
      select: {
        id: true,
        price: true,
        createdAt: true,
      },
    }),
  ])

  // Calculate inventory value (sum of all product prices)
  const inventoryValue = allProducts.reduce((sum: number, product: { price: Decimal }) => {
    return sum + Number(product.price)
  }, 0)

  // Calculate products created per day (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  // Group products by creation date
  const productsByDate = new Map<string, number>()
  
  // Initialize all 7 days with 0
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    productsByDate.set(date.toISOString().split('T')[0], 0)
  }
  
  // Count products per day
  allProducts.forEach((product: { createdAt: Date }) => {
    if (product.createdAt >= sevenDaysAgo) {
      const date = new Date(product.createdAt)
      date.setHours(0, 0, 0, 0)
      const dateKey = date.toISOString().split('T')[0]
      productsByDate.set(dateKey, (productsByDate.get(dateKey) || 0) + 1)
    }
  })
  
  // Convert to chart data format (sorted by dateKey which is already in chronological order)
  const chartData: ChartDataPoint[] = Array.from(productsByDate.entries())
    .sort(([dateKeyA], [dateKeyB]) => dateKeyA.localeCompare(dateKeyB))
    .map(([dateKey, count]) => ({
      date: formatDate(new Date(dateKey)),
      count,
    }))

  return {
    productCount,
    catalogCount,
    recentProducts,
    inventoryValue,
    chartData,
  }
}

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Get user's profile
  const profile = await prisma.profile.findUnique({
    where: { clerkUserId: userId },
  })

  if (!profile) {
    redirect('/settings')
  }

  // Fetch all dashboard data in parallel
  const { productCount, catalogCount, recentProducts, inventoryValue, chartData } =
    await getDashboardData(profile.id)

  // Check if there's any data
  const hasData = productCount > 0 || catalogCount > 0

  // Empty state
  if (!hasData) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to TradeMaster</CardTitle>
            <CardDescription className="text-base">
              Get started by adding your first product or creating a catalog
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link href="/inventory">
              <Button className="w-full" size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Product
              </Button>
            </Link>
            <Link href="/catalogs/new">
              <Button variant="outline" className="w-full" size="lg">
                <FileText className="mr-2 h-4 w-4" />
                Create Your First Catalog
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your inventory and catalogs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Catalogs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{catalogCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Catalogs created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(inventoryValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total value of all products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Chart and Quick Actions */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Analytics Chart - 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Products Created (Last 7 Days)</CardTitle>
            <CardDescription className="text-sm">
              Track your product additions over the past week
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <AnalyticsChart data={chartData} />
          </CardContent>
        </Card>

        {/* Quick Actions - 1/3 width */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickScanButton />
            <Link href="/inventory">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </Link>
            <Link href="/catalogs/new">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Create Catalog
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">Recent Products</CardTitle>
              <CardDescription className="text-sm">The 5 most recently added products</CardDescription>
            </div>
            <Link href="/inventory" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentProducts.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        SKU
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        Price
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProducts.map((product: { id: string; name: string; sku: string; price: Decimal; createdAt: Date }) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-sm whitespace-nowrap">{product.name}</td>
                        <td className="py-3 px-4 text-xs sm:text-sm text-muted-foreground font-mono whitespace-nowrap">
                          {product.sku}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-sm whitespace-nowrap">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs sm:text-sm text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>No products yet. Create your first product to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
