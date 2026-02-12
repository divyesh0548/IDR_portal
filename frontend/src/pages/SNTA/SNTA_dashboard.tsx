import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, Building2, Users, FileText, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

export default function SNTADashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const [statistics, setStatistics] = useState<{ totalPlazas: number; totalUsers: number } | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    setIsLoadingStats(true)
    try {
      const data = await api.getStatistics()
      setStatistics(data.statistics || { totalPlazas: 0, totalUsers: 0 })
    } catch (error) {
      console.error("Error fetching statistics:", error)
      toast.error("Failed to load statistics")
      setStatistics({ totalPlazas: 0, totalUsers: 0 })
    } finally {
      setIsLoadingStats(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar isCollapsed={false} onToggle={() => setIsMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar title="SNTA Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-6">Welcome to SNTA Dashboard</h2>
            
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Plaza</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-2xl font-bold">Loading...</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">{statistics?.totalPlazas ?? 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-2xl font-bold">Loading...</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">{statistics?.totalUsers ?? 0}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Submitted Requests Card */}
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate('/snta/submitted-requests')}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>Submitted Requests</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View all submitted IDR requests
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

