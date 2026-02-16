import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { UserSidebar } from "@/components/layout/UserSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, FileText, ArrowRight } from "lucide-react"
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

export default function UserDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)

  // Separate pending and done requests
  const pendingRequests = documentRequests.filter(req => !req.done || req.done === '')
  const doneRequests = documentRequests.filter(req => req.done === 'Done')

  useEffect(() => {
    if (user?.plaza_name) {
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
        <Navbar title="User Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-6">Welcome to your dashboard</h2>

            {/* Document Requests Section */}
            {user?.plaza_name && user.plaza_name.trim() !== '' && (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {/* Pending Requests Box */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/client/document-requests?filter=pending')}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <CardTitle>Pending Requests</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingRequests.length > 0 && (
                          <Badge variant="secondary">{pendingRequests.length}</Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <CardDescription>
                      Document requests awaiting submission
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRequests ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading requests...
                      </div>
                    ) : pendingRequests.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No pending requests
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.slice(0, 3).map((request) => (
                          <div key={request.id} className="p-3 border rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium capitalize text-sm">
                                  {request.plaza_name?.replace(/_/g, ' ') || 'N/A'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {request.scope_name} • Due: {formatDate(request.due_date)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {pendingRequests.length > 3 && (
                          <p className="text-sm text-center text-muted-foreground pt-2">
                            +{pendingRequests.length - 3} more request(s)
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Done Requests Box */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-950/20 dark:border-l-green-400" onClick={() => navigate('/client/document-requests?filter=done')}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <CardTitle>Completed Requests</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {doneRequests.length > 0 && (
                          <Badge variant="default" className="bg-green-600">{doneRequests.length}</Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <CardDescription>
                      Successfully completed document requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRequests ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading requests...
                      </div>
                    ) : doneRequests.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No completed requests
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {doneRequests.slice(0, 3).map((request) => (
                          <div key={request.id} className="p-3 border rounded-lg bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium capitalize text-sm">
                                  {request.plaza_name?.replace(/_/g, ' ') || 'N/A'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {request.scope_name} • Due: {formatDate(request.due_date)}
                                </p>
                              </div>
                              <Badge variant="default" className="bg-green-600 text-xs">Done</Badge>
                            </div>
                          </div>
                        ))}
                        {doneRequests.length > 3 && (
                          <p className="text-sm text-center text-muted-foreground pt-2">
                            +{doneRequests.length - 3} more request(s)
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
