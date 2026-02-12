import { useState, useRef, useEffect } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Menu, Search, ChevronDown, Check, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

interface PlazaRow {
  id: number
  plazaName: string
}

interface Scope {
  id: number
  scope_name: string
  required_documents: string
}


// Function to format plaza name for display: capitalize first letter and replace '_' with space
function formatPlazaName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Function to get today's date in Mumbai timezone (YYYY-MM-DD format)
function getTodayInMumbai(): string {
  const now = new Date()
  // Get date string in Mumbai timezone
  const mumbaiDateString = now.toLocaleDateString("en-CA", { 
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
  // en-CA locale returns YYYY-MM-DD format
  return mumbaiDateString
}

// Function to generate month options
function getMonthOptions(): { value: string, label: string }[] {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const months: { value: string, label: string }[] = []
  
  // Generate all 12 months (without year)
  for (let month = 0; month < 12; month++) {
    months.push({
      value: String(month + 1).padStart(2, '0'),
      label: monthNames[month]
    })
  }
  
  return months
}


export default function IDRTable() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [plazas, setPlazas] = useState<PlazaRow[]>([])
  const [nextId, setNextId] = useState(1)
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [dueDate, setDueDate] = useState<string>("")
  const [fromYear, setFromYear] = useState<string>("")
  const [fromMonth, setFromMonth] = useState<string>("")
  const [toYear, setToYear] = useState<string>("")
  const [toMonth, setToMonth] = useState<string>("")
  const [selectedScope, setSelectedScope] = useState<string>("")
  const [scopes, setScopes] = useState<Scope[]>([])
  const [plazaNames, setPlazaNames] = useState<string[]>([])
  const [isLoadingScopes, setIsLoadingScopes] = useState(false)
  const [isLoadingPlazas, setIsLoadingPlazas] = useState(false)
  const [isScopeDropdownOpen, setIsScopeDropdownOpen] = useState(false)
  const [scopeSearchQuery, setScopeSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const scopeDropdownRef = useRef<HTMLDivElement>(null)
  const minDate = getTodayInMumbai()

  // Available years (can be extended)
  const availableYears = ["2025", "2026"]
  const monthOptions = getMonthOptions()

  // Ensure "To" year-month is not before "From" year-month in the UI
  const filteredToYears = availableYears.filter((year) => {
    if (!fromYear) return true
    return parseInt(year) >= parseInt(fromYear)
  })

  const filteredToMonths = (() => {
    // If year or from-month not selected yet, allow all months
    if (!fromYear || !toYear || toYear !== fromYear || !fromMonth) {
      return monthOptions
    }
    // Same year: only allow months >= fromMonth
    const fromMonthNum = parseInt(fromMonth)
    return monthOptions.filter((month) => parseInt(month.value) >= fromMonthNum)
  })()

  // Fetch scopes and plazas on component mount
  useEffect(() => {
    fetchScopes()
    fetchPlazas()
  }, [])

  const fetchPlazas = async () => {
    setIsLoadingPlazas(true)
    try {
      const data = await api.getPlazas()
      setPlazaNames(data.plazas || [])
    } catch (error) {
      console.error("Error fetching plazas:", error)
      toast.error("Failed to load plazas")
    } finally {
      setIsLoadingPlazas(false)
    }
  }

  const fetchScopes = async () => {
    setIsLoadingScopes(true)
    try {
      const data = await api.getScopes()
      setScopes(data.scopes || [])
    } catch (error) {
      console.error("Error fetching scopes:", error)
      toast.error("Failed to load scopes")
    } finally {
      setIsLoadingScopes(false)
    }
  }

  // Filter plazas based on search query
  const filteredPlazas = plazaNames.filter((plaza) =>
    formatPlazaName(plaza).toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter scopes based on search query
  const filteredScopes = scopes.filter((scope) =>
    scope.scope_name.toLowerCase().includes(scopeSearchQuery.toLowerCase())
  )

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setSearchQuery("")
      }
      if (scopeDropdownRef.current && !scopeDropdownRef.current.contains(event.target as Node)) {
        setIsScopeDropdownOpen(false)
        setScopeSearchQuery("")
      }
    }

    if (isDropdownOpen || isScopeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen, isScopeDropdownOpen])

  // If From changes to a value after the current To, reset invalid To selection
  useEffect(() => {
    if (!fromYear || !fromMonth || !toYear || !toMonth) return

    const fromDateValue = new Date(parseInt(fromYear), parseInt(fromMonth) - 1, 1)
    const toDateValue = new Date(parseInt(toYear), parseInt(toMonth) - 1, 1)

    if (toDateValue < fromDateValue) {
      // Clear To selection if it becomes invalid
      setToYear("")
      setToMonth("")
    }
  }, [fromYear, fromMonth, toYear, toMonth])

  const handleAddPlaza = (plazaName: string) => {
    // Check if plaza already exists
    if (plazas.some(p => p.plazaName === plazaName)) {
      return
    }
    setPlazas([...plazas, { id: nextId, plazaName }])
    setNextId(nextId + 1)
  }

  const handleSelectAll = () => {
    const newPlazas: PlazaRow[] = []
    let newNextId = nextId
    
    plazaNames.forEach((plazaName) => {
      // Only add if not already in the list
      if (!plazas.some(p => p.plazaName === plazaName)) {
        newPlazas.push({ id: newNextId, plazaName })
        newNextId++
      }
    })
    
    if (newPlazas.length > 0) {
      setPlazas([...plazas, ...newPlazas])
      setNextId(newNextId)
    }
    setIsDropdownOpen(false)
    setSearchQuery("")
  }

  const handleRemovePlaza = (id: number) => {
    setPlazas(plazas.filter(p => p.id !== id))
  }

  const isPlazaSelected = (plazaName: string) => {
    return plazas.some(p => p.plazaName === plazaName)
  }

  const handleSubmit = async () => {
    // Validate that at least one plaza is selected
    if (plazas.length === 0) {
      toast.error("Please select at least one plaza")
      return
    }

    // Validate due date
    if (!dueDate) {
      toast.error("Please select a due date")
      return
    }

    // Check if due date is not in the past
    if (dueDate < minDate) {
      toast.error("Due date cannot be in the past")
      return
    }

    // Validate from year and month
    if (!fromYear || !fromMonth) {
      toast.error("Please select From Year and From Month")
      return
    }

    // Validate to year and month
    if (!toYear || !toMonth) {
      toast.error("Please select To Year and To Month")
      return
    }

    // Validate that to date is after from date
    const fromDateValue = new Date(parseInt(fromYear), parseInt(fromMonth) - 1, 1)
    const toDateValue = new Date(parseInt(toYear), parseInt(toMonth) - 1, 1)
    if (toDateValue < fromDateValue) {
      toast.error("To date must be after From date")
      return
    }

    // Validate scope
    if (!selectedScope) {
      toast.error("Please select a scope")
      return
    }

    setIsSubmitting(true)

    try {
      // Convert year and month values to date format
      // from_date: first day of fromMonth
      const fromDate = `${fromYear}-${fromMonth}-01`
      
      // to_date: last day of toMonth
      // JavaScript Date months are 0-indexed (0=Jan, 11=Dec)
      const toYearNum = parseInt(toYear)
      const toMonthNum = parseInt(toMonth) // 1-12 (March = 3)
      // new Date(year, month, 0) gives last day of (month-1) in 0-indexed
      // Example: toMonthNum=3 (March), new Date(2025, 3, 0) = last day of month index 2 = March 31
      const lastDayOfMonth = new Date(toYearNum, toMonthNum, 0)
      const toDate = `${toYear}-${toMonth}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`

      // Generate unique req_id for each plaza (10 character combination)
      const generateReqId = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let reqId = ''
        for (let i = 0; i < 10; i++) {
          reqId += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return reqId
      }

      // Prepare submission data with req_id for each plaza
      const submissionData = {
        plazas: plazas.map(p => ({
          plaza_name: p.plazaName,
          req_id: generateReqId()
        })),
        due_date: dueDate,
        from_date: fromDate,
        to_date: toDate,
        scope_name: selectedScope
      }

      // Call API to save data
      await api.createIDRMaster(submissionData)

      toast.success(`Successfully saved ${plazas.length} plaza(s) to IDR master`)
      
      // Reset all form fields after successful submission
      setPlazas([])
      setNextId(1)
      setDueDate("")
      setFromYear("")
      setFromMonth("")
      setToYear("")
      setToMonth("")
      setSelectedScope("")
      setSearchQuery("")
      setScopeSearchQuery("")
      
    } catch (error) {
      console.error("Error submitting IDR data:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save IDR data")
    } finally {
      setIsSubmitting(false)
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
        <Navbar title="IDR Table" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>
                  IDR Table
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* From and To Year, Month Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from">From</Label>
                    <div className="flex gap-2">
                      <Select value={fromYear} onValueChange={setFromYear}>
                        <SelectTrigger id="from-year" className="flex-1">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={fromMonth} onValueChange={setFromMonth}>
                        <SelectTrigger id="from-month" className="flex-1">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="to">To</Label>
                    <div className="flex gap-2">
                      <Select value={toYear} onValueChange={setToYear}>
                        <SelectTrigger id="to-year" className="flex-1">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredToYears.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={toMonth} onValueChange={setToMonth}>
                        <SelectTrigger id="to-month" className="flex-1">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredToMonths.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Scope Selection Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <div className="relative" ref={scopeDropdownRef}>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setIsScopeDropdownOpen(!isScopeDropdownOpen)}
                      disabled={isLoadingScopes}
                    >
                      <span className="text-muted-foreground">
                        {selectedScope
                          ? scopes.find(s => s.scope_name === selectedScope)?.scope_name || selectedScope
                          : "Select scope..."}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isScopeDropdownOpen && "rotate-180"
                        )}
                      />
                    </Button>
                    {isScopeDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-lg">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search scope..."
                              value={scopeSearchQuery}
                              onChange={(e) => setScopeSearchQuery(e.target.value)}
                              className="pl-8"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          {filteredScopes.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {isLoadingScopes ? "Loading..." : "No scopes found"}
                            </div>
                          ) : (
                            <div className="p-1">
                              {filteredScopes.map((scope) => {
                                const isSelected = selectedScope === scope.scope_name
                                return (
                                  <div
                                    key={scope.id}
                                    className={cn(
                                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                                      isSelected && "bg-accent"
                                    )}
                                    onClick={() => {
                                      setSelectedScope(scope.scope_name)
                                      setIsScopeDropdownOpen(false)
                                      setScopeSearchQuery("")
                                    }}
                                  >
                                    <div className="flex h-4 w-4 items-center justify-center rounded border">
                                      {isSelected && <Check className="h-3 w-3" />}
                                    </div>
                                    <span>{scope.scope_name}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Due Date Selection */}
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <div className="w-fit">
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      min={minDate}
                      className="w-auto"
                    />
                  </div>
                  {dueDate && dueDate < minDate && (
                    <p className="text-sm text-destructive">Due date cannot be in the past</p>
                  )}
                </div>

                {/* Plaza Selection Dropdown */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Select Plazas</h3>
                  <div className="relative" ref={dropdownRef}>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      disabled={isLoadingPlazas}
                    >
                      <span className="text-muted-foreground">
                        {isLoadingPlazas
                          ? "Loading plazas..."
                          : plazas.length === 0
                          ? "Select plazas..."
                          : `${plazas.length} plaza${plazas.length > 1 ? "s" : ""} selected`}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isDropdownOpen && "rotate-180"
                        )}
                      />
                    </Button>
                    {isDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-lg">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search plazas..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-8"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          <div className="p-2 border-b">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={handleSelectAll}
                              disabled={plazaNames.every(plaza => isPlazaSelected(plaza))}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Select All ({plazaNames.length})
                            </Button>
                          </div>
                          {filteredPlazas.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              {isLoadingPlazas ? "Loading..." : "No plazas found"}
                            </div>
                          ) : (
                            <div className="p-1">
                              {filteredPlazas.map((plaza) => {
                                const isSelected = isPlazaSelected(plaza)
                                return (
                                  <div
                                    key={plaza}
                                    className={cn(
                                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                                      isSelected && "bg-accent"
                                    )}
                                    onClick={() => {
                                      if (isSelected) {
                                        const plazaToRemove = plazas.find(p => p.plazaName === plaza)
                                        if (plazaToRemove) {
                                          handleRemovePlaza(plazaToRemove.id)
                                        }
                                      } else {
                                        handleAddPlaza(plaza)
                                      }
                                    }}
                                  >
                                    <div className="flex h-4 w-4 items-center justify-center rounded border">
                                      {isSelected && <Check className="h-3 w-3" />}
                                    </div>
                                    <span>{formatPlazaName(plaza)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Information Summary */}
                {(fromYear || fromMonth || toYear || toMonth || selectedScope || dueDate || plazas.length > 0) && (
                  <div className="border rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-semibold">Selected Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(fromYear || fromMonth) && (
                        <div>
                          <p className="text-sm text-muted-foreground">From</p>
                          <p className="font-medium">
                            {fromYear && fromMonth
                              ? `${monthOptions.find(m => m.value === fromMonth)?.label || fromMonth} ${fromYear}`
                              : fromYear || (fromMonth ? `${monthOptions.find(m => m.value === fromMonth)?.label || fromMonth}` : "")}
                          </p>
                        </div>
                      )}
                      
                      {(toYear || toMonth) && (
                        <div>
                          <p className="text-sm text-muted-foreground">To</p>
                          <p className="font-medium">
                            {toYear && toMonth
                              ? `${monthOptions.find(m => m.value === toMonth)?.label || toMonth} ${toYear}`
                              : toYear || (toMonth ? `${monthOptions.find(m => m.value === toMonth)?.label || toMonth}` : "")}
                          </p>
                        </div>
                      )}
                      
                      {selectedScope && (
                        <div>
                          <p className="text-sm text-muted-foreground">Scope</p>
                          <p className="font-medium">{selectedScope}</p>
                        </div>
                      )}
                      
                      {dueDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">Due Date</p>
                          <p className="font-medium">
                            {new Date(dueDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {plazas.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Selected Plazas ({plazas.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {plazas.map((plaza) => (
                            <div
                              key={plaza.id}
                              className="flex items-center gap-1 rounded-md border bg-secondary px-3 py-1.5 text-sm"
                            >
                              <span>{formatPlazaName(plaza.plazaName)}</span>
                              <button
                                onClick={() => handleRemovePlaza(plaza.id)}
                                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={handleSubmit}
                    disabled={plazas.length === 0 || !dueDate || !fromYear || !fromMonth || !toYear || !toMonth || !selectedScope || isSubmitting}
                    size="lg"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

