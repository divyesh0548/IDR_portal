import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { UserSidebar } from "@/components/layout/UserSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DocumentRequest {
  id: number;
  plaza_name: string;
  request_datetime: string;
  due_date: string;
  from_date: string;
  to_date: string;
  scope_name: string;
  req_id: string;
  done: string | null;
}

export default function ClientDocumentRequests() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  // Get filter from URL params (pending, done, or all)
  const filter = searchParams.get('filter') || 'all'

  // Separate pending and done requests
  const pendingRequests = documentRequests.filter(req => !req.done || req.done === '')
  const doneRequests = documentRequests.filter(req => req.done === 'Done')

  // Filter requests based on selected filter
  const filteredRequests = filter === 'pending' 
    ? pendingRequests 
    : filter === 'done' 
    ? doneRequests 
    : documentRequests

  useEffect(() => {
    if (user?.plaza_name && user.plaza_name.trim() !== '') {
      fetchDocumentRequests()
    }
  }, [user?.plaza_name])

  const fetchDocumentRequests = async () => {
    setIsLoadingRequests(true)
    try {
      const data = await api.getClientRequests()
      setDocumentRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching document requests:', error)
      setDocumentRequests([])
    } finally {
      setIsLoadingRequests(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user?.plaza_name || user.plaza_name.trim() === '') {
    return (
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden md:block shrink-0">
          <UserSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        </aside>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <UserSidebar isCollapsed={false} onToggle={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar title="Document Requests" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="container mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No plaza assigned to your account.</p>
                    <p className="text-sm mt-2">Please contact your administrator to assign a plaza.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:block shrink-0">
        <UserSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </aside>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <UserSidebar isCollapsed={false} onToggle={() => setIsMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar title="Document Requests" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            {/* Filter Boxes */}
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card 
                className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                  filter === 'pending' || filter === 'all' 
                    ? 'border-l-primary bg-primary/5' 
                    : 'border-l-transparent'
                }`}
                onClick={() => setSearchParams({ filter: 'pending' })}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Pending Requests</CardTitle>
                    {pendingRequests.length > 0 && (
                      <Badge variant="secondary">{pendingRequests.length}</Badge>
                    )}
                  </div>
                  <CardDescription>
                    Document requests awaiting submission
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                  filter === 'done' || filter === 'all'
                    ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20 dark:border-l-green-400' 
                    : 'border-l-transparent'
                }`}
                onClick={() => setSearchParams({ filter: 'done' })}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Completed Requests</CardTitle>
                    {doneRequests.length > 0 && (
                      <Badge variant="default" className="bg-green-600">{doneRequests.length}</Badge>
                    )}
                  </div>
                  <CardDescription>
                    Successfully completed document requests
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Requests List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {filter === 'pending' && 'Pending Requests'}
                    {filter === 'done' && 'Completed Requests'}
                    {filter === 'all' && 'All Document Requests'}
                  </CardTitle>
                  {filteredRequests.length > 0 && (
                    <Badge variant="secondary">{filteredRequests.length}</Badge>
                  )}
                </div>
                <CardDescription>
                  {filter === 'pending' && 'Document requests awaiting submission'}
                  {filter === 'done' && 'Successfully completed document requests'}
                  {filter === 'all' && 'All document requests for your plaza'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRequests ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading requests...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-lg font-medium">
                      {filter === 'pending' && 'No pending requests'}
                      {filter === 'done' && 'No completed requests'}
                      {filter === 'all' && 'No document requests'}
                    </p>
                    <p className="text-sm mt-2">
                      {filter === 'pending' && 'All your document requests have been completed.'}
                      {filter === 'done' && 'You haven\'t completed any document requests yet.'}
                      {filter === 'all' && 'You don\'t have any document requests yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map((request) => (
                      <Card 
                        key={request.id} 
                        className={`border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
                          request.done === 'Done' 
                            ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20 dark:border-l-green-400' 
                            : 'border-l-primary'
                        }`}
                        onClick={() => request.req_id && navigate(`/client/document-requests/${request.req_id}`)}
                      >
                        <CardContent className="pt-4">
                          {request.done === 'Done' && (
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="default" className="bg-green-600">Done</Badge>
                            </div>
                          )}
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Scope</p>
                              <p className="font-medium">{request.scope_name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Due Date</p>
                              <p className="font-medium">{formatDate(request.due_date)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Period</p>
                              <p className="font-medium">
                                {formatDate(request.from_date)} - {formatDate(request.to_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Requested On</p>
                              <p className="text-sm">{formatDateTime(request.request_datetime)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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

