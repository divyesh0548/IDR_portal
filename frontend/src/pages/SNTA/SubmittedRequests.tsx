import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Menu } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

interface IDRRecord {
  id: number
  plaza_name: string
  request_datetime: string
  due_date: string
  from_date: string
  to_date: string
  scope_name: string
  req_id: string
  done: string | null
}

interface Group {
  from_date: string
  to_date: string
  due_date: string
  plazas: IDRRecord[]
}

// Function to format plaza name for display
function formatPlazaName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function SubmittedRequests() {
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scopes, setScopes] = useState<string[]>([])
  const [selectedScope, setSelectedScope] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all") // "all", "pending", "done"
  const [plazaFilter, setPlazaFilter] = useState<string>("all") // "all" or specific plaza_name
  const [records, setRecords] = useState<IDRRecord[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchUniqueScopes()
  }, [])

  useEffect(() => {
    if (selectedScope) {
      fetchSubmittedRequests()
      // Reset plaza filter when scope changes
      setPlazaFilter('all')
    } else {
      setRecords([])
      setGroups([])
      setPlazaFilter('all')
    }
  }, [selectedScope])

  useEffect(() => {
    if (records.length > 0) {
      groupRecords()
    } else {
      setGroups([])
    }
  }, [records, statusFilter, plazaFilter])



  const fetchUniqueScopes = async () => {
    try {
      const data = await api.getUniqueScopes()
      setScopes(data.scopes || [])
    } catch (error) {
      console.error("Error fetching unique scopes:", error)
      toast.error("Failed to load scopes")
    }
  }

  const fetchSubmittedRequests = async () => {
    setIsLoading(true)
    try {
      const data = await api.getSubmittedRequests(selectedScope)
      setRecords(data.records || [])
    } catch (error) {
      console.error("Error fetching submitted requests:", error)
      toast.error("Failed to load submitted document requests")
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const groupRecords = () => {
    // Filter records based on status filter
    let filteredRecords = records
    if (statusFilter === 'pending') {
      filteredRecords = records.filter(record => !record.done || record.done === '')
    } else if (statusFilter === 'done') {
      filteredRecords = records.filter(record => record.done === 'Done')
    }

    // Filter records based on plaza filter
    if (plazaFilter !== 'all') {
      filteredRecords = filteredRecords.filter(record => record.plaza_name === plazaFilter)
    }

    const grouped = new Map<string, IDRRecord[]>()

    filteredRecords.forEach(record => {
      const key = `${record.from_date}|${record.to_date}|${record.due_date}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(record)
    })

    const groupsArray: Group[] = Array.from(grouped.entries()).map(([key, plazas]) => {
      const [from_date, to_date, due_date] = key.split('|')
      return {
        from_date,
        to_date,
        due_date,
        plazas
      }
    })

    setGroups(groupsArray)
  }

  const handleGroupClick = (group: Group) => {
    // Navigate to detail page with query params
    const params = new URLSearchParams({
      scope: selectedScope,
      from_date: group.from_date,
      to_date: group.to_date,
      due_date: group.due_date
    })
    navigate(`/snta/submitted-requests/detail?${params.toString()}`)
  }



  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
        <Navbar title="Submitted Document Requests" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Submitted Document Requests</CardTitle>
                  <Button onClick={() => navigate('/snta/idr/table')}>
                    New Document Request
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-2 w-[200px]">
                    <Label htmlFor="scope">Scope</Label>
                    <Select value={selectedScope} onValueChange={setSelectedScope}>
                      <SelectTrigger id="scope" className="w-full">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {scopes.map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {scope}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 w-[200px]">
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter} >
                      <SelectTrigger id="status"  className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Document Requests</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 w-[200px]">
                    <Label htmlFor="plaza">Plaza</Label>
                    <Select 
                      value={plazaFilter} 
                      onValueChange={setPlazaFilter}
                      disabled={records.length === 0}
                    >
                      <SelectTrigger id="plaza" className="w-full">
                        <SelectValue placeholder="Select plaza" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plazas</SelectItem>
                        {Array.from(new Set(records.map(r => r.plaza_name)))
                          .sort()
                          .map((plaza) => (
                            <SelectItem key={plaza} value={plaza}>
                              {formatPlazaName(plaza)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Requests Display */}
                {groups.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Document Requests ({groups.length})</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {groups.map((group, index) => {
                        // Check if all plazas in this group are done
                        const allDone = group.plazas.every(record => record.done === 'Done')
                        const someDone = group.plazas.some(record => record.done === 'Done')
                        
                        return (
                        <Card
                          key={index}
                          className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                            allDone 
                              ? 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/20 dark:border-l-green-400 hover:bg-green-50/40 dark:hover:bg-green-950/30' 
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => handleGroupClick(group)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-semibold">
                                Document Request {index + 1}
                              </CardTitle>
                              {allDone && (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">Done</Badge>
                              )}
                              {someDone && !allDone && (
                                <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">Partial</Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2.5 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16 text-left">From:</span>
                                <span className="font-medium flex-1">{formatDate(group.from_date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16 text-left">To:</span>
                                <span className="font-medium flex-1">{formatDate(group.to_date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground w-16 text-left">Due:</span>
                                <span className="font-medium flex-1">{formatDate(group.due_date)}</span>
                              </div>
                              <div className="pt-2.5 border-t">
                                <div className="flex items-start gap-2">
                                  <span className="text-muted-foreground w-16 text-left pt-0.5">Plazas:</span>
                                  <div className="flex-1 pl-0">
                                    <span className="font-medium">{group.plazas.length}</span>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 pl-0">
                                      {group.plazas.slice(0, 3).map((record) => (
                                        <span
                                          key={record.id}
                                          className="text-xs bg-secondary px-2 py-1 rounded-sm"
                                        >
                                          {formatPlazaName(record.plaza_name)}
                                        </span>
                                      ))}
                                      {group.plazas.length > 3 && (
                                        <span className="text-xs text-muted-foreground">
                                          +{group.plazas.length - 3} more
                                        </span>
                                      )}
                                    </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        )
                      })}
                    </div>
                  </div>
                )}


                {/* Empty States */}
                {!selectedScope && (
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a scope to view submitted document requests.
                  </div>
                )}

                {selectedScope && isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                )}

                {selectedScope && !isLoading && groups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No submitted document requests found for the selected scope.
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

