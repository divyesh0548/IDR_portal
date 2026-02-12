import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function IDR() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState<string>("")
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const runNumber = searchParams.get("run") || "1"
  const financialYear = searchParams.get("financial_year") || "2025-26"

  const quarters = [
    { value: "Q1", label: "Quarter 1" },
    { value: "Q2", label: "Quarter 2" },
    { value: "Q3", label: "Quarter 3" },
    { value: "Q4", label: "Quarter 4" }
  ]

  const handleQuarterSelect = (quarter: string) => {
    setSelectedQuarter(quarter)
  }

  const handleProceed = () => {
    if (!selectedQuarter) {
      return
    }
    navigate(`/snta/idr/table?run=${runNumber}&quarter=${selectedQuarter}&financial_year=${financialYear}`)
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
        <Navbar title={`IDR - Run ${runNumber}`} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Select Quarter</CardTitle>
                <CardDescription>
                  Please select a quarter for Run {runNumber}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="quarter">Quarter</Label>
                  <Select value={selectedQuarter} onValueChange={handleQuarterSelect}>
                    <SelectTrigger id="quarter">
                      <SelectValue placeholder="Select a quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((quarter) => (
                        <SelectItem key={quarter.value} value={quarter.value}>
                          {quarter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedQuarter && (
                  <div className="pt-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Selected: Run {runNumber} - {quarters.find(q => q.value === selectedQuarter)?.label || selectedQuarter}
                    </p>
                    <Button onClick={handleProceed} className="w-full">
                      Proceed
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

