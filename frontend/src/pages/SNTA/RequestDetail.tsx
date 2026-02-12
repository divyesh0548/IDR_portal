import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, FileText, Download, X, Loader2, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

interface DocumentCount {
  req_id: string
  plaza_name: string
  year: string
  month: string
  document_count: number
}

interface Document {
  id: number
  req_id: string
  document_type: string
  document_url: string
  modified_time: string
  year: string
  month: string
  is_rejected?: boolean
  reason?: string
}

// Function to format plaza name for display
function formatPlazaName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Function to generate month names between from_date and to_date
function getMonthsBetweenDates(fromDate: string, toDate: string): string[] {
  const start = new Date(fromDate)
  const end = new Date(toDate)
  const months: string[] = []
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  
  const current = new Date(start.getFullYear(), start.getMonth(), 1)
  
  while (current <= end) {
    months.push(`${monthNames[current.getMonth()]} ${current.getFullYear()}`)
    current.setMonth(current.getMonth() + 1)
  }
  
  return months
}

export default function RequestDetail() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const scopeParam = searchParams.get('scope') || ''
  const from_date = searchParams.get('from_date') || ''
  const to_date = searchParams.get('to_date') || ''
  const due_date = searchParams.get('due_date') || ''
  
  const [records, setRecords] = useState<IDRRecord[]>([])
  const [actualScopeName, setActualScopeName] = useState<string>('') // Actual scope_name from records
  const [documentCounts, setDocumentCounts] = useState<Map<string, number>>(new Map())
  const [selectedCell, setSelectedCell] = useState<{ req_id: string; plaza_name: string; month: string; year: string } | null>(null)
  const [cellDocuments, setCellDocuments] = useState<Document[]>([])
  const [requiredDocumentTypes, setRequiredDocumentTypes] = useState<string[]>([])
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRejectMode, setIsRejectMode] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<Set<number>>(new Set())
  const [rejectReason, setRejectReason] = useState("")
  const [isRejecting, setIsRejecting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Determine the actual scope_name to use (from param or from records)
  const scope_name = scopeParam === 'all' ? actualScopeName : scopeParam

  useEffect(() => {
    if (scopeParam && from_date && to_date && due_date) {
      fetchRecords()
    }
  }, [scopeParam, from_date, to_date, due_date])

  useEffect(() => {
    if (records.length > 0) {
      fetchDocumentCounts()
    }
  }, [records])

  const fetchRecords = async () => {
    setIsLoading(true)
    try {
      const data = await api.getSubmittedRequests(scopeParam)
      // Filter records by date range
      const filtered = (data.records || []).filter((record: IDRRecord) => 
        record.from_date === from_date && 
        record.to_date === to_date && 
        record.due_date === due_date
      )
      setRecords(filtered)
      
      // If scope was "all", extract the actual scope_name from the first record
      if (scopeParam === 'all' && filtered.length > 0 && filtered[0].scope_name) {
        setActualScopeName(filtered[0].scope_name)
      } else if (scopeParam !== 'all') {
        setActualScopeName(scopeParam)
      }
    } catch (error) {
      console.error("Error fetching records:", error)
      toast.error("Failed to load request details")
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDocumentCounts = async () => {
    if (records.length === 0) return

    try {
      const reqIds = records.map(r => r.req_id)
      const data = await api.getDocumentCounts(reqIds)
      
      // Create a map: key = "req_id-year-month", value = count
      const countsMap = new Map<string, number>()
      data.counts.forEach((count: DocumentCount) => {
        const key = `${count.req_id}-${count.year}-${count.month}`
        countsMap.set(key, Number(count.document_count))
      })
      
      setDocumentCounts(countsMap)
    } catch (error) {
      console.error("Error fetching document counts:", error)
    }
  }

  const handleCellClick = async (record: IDRRecord, month: string) => {
    // Extract year and month number from month string (e.g., "January 2025")
    const [monthName, year] = month.split(' ')
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    const monthNum = String(monthNames.indexOf(monthName) + 1).padStart(2, '0')

    setSelectedCell({
      req_id: record.req_id,
      plaza_name: record.plaza_name,
      month: monthNum,
      year: year
    })
    setIsDialogOpen(true)
    setIsLoadingDocuments(true)
    setIsRejectMode(false)
    setSelectedDocuments(new Set())
    setRejectReason("")

    try {
      // Fetch required document types from scope (only if scope_name is provided and not "all")
      if (scope_name && scope_name !== 'all') {
        try {
          const scopeData = await api.getScopeByName(scope_name)
          if (scopeData.scope && scopeData.scope.required_documents) {
            const requiredDocs = scopeData.scope.required_documents
              .split(',')
              .map((doc: string) => doc.trim())
              .filter((doc: string) => doc.length > 0)
            setRequiredDocumentTypes(requiredDocs)
          } else {
            setRequiredDocumentTypes([])
          }
        } catch (scopeError) {
          // If scope not found, just log and continue with empty required documents
          console.warn("Scope not found or error fetching scope:", scopeError)
          setRequiredDocumentTypes([])
        }
      } else {
        setRequiredDocumentTypes([])
      }

      // Fetch uploaded documents
      const data = await api.getPlazaDocuments(record.req_id, year, monthNum)
      setCellDocuments(data.documents || [])
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast.error("Failed to load documents")
      setCellDocuments([])
      setRequiredDocumentTypes([])
    } finally {
      setIsLoadingDocuments(false)
    }
  }

  const handleRejectClick = () => {
    setIsRejectMode(true)
    setSelectedDocuments(new Set())
    setRejectReason("")
  }

  const handleCancelReject = () => {
    setIsRejectMode(false)
    setSelectedDocuments(new Set())
    setRejectReason("")
  }

  const handleDocumentToggle = (docId: number) => {
    const newSelected = new Set(selectedDocuments)
    if (newSelected.has(docId)) {
      newSelected.delete(docId)
    } else {
      newSelected.add(docId)
    }
    setSelectedDocuments(newSelected)
  }

  const handleRejectSubmit = async () => {
    if (selectedDocuments.size === 0) {
      toast.error("Please select at least one document to reject")
      return
    }

    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    setIsRejecting(true)
    try {
      const documentIds = Array.from(selectedDocuments)
      await api.rejectDocuments(documentIds, rejectReason)
      toast.success(`Successfully rejected ${documentIds.length} document(s)`)
      
      // Refresh documents to show updated status
      if (selectedCell) {
        const data = await api.getPlazaDocuments(selectedCell.req_id, selectedCell.year, selectedCell.month)
        setCellDocuments(data.documents || [])
      }
      
      // Reset reject mode
      setIsRejectMode(false)
      setSelectedDocuments(new Set())
      setRejectReason("")
      
      // Refresh document counts
      fetchDocumentCounts()
    } catch (error) {
      console.error("Error rejecting documents:", error)
      toast.error(error instanceof Error ? error.message : "Failed to reject documents")
    } finally {
      setIsRejecting(false)
    }
  }

  const extractFileName = (url: string): string => {
    try {
      const parts = url.split('/')
      const fileName = parts[parts.length - 1]
      return decodeURIComponent(fileName)
    } catch {
      return 'Document'
    }
  }

  const getDocumentCount = (req_id: string, month: string): number => {
    // Extract year and month number from month string
    const [monthName, year] = month.split(' ')
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    const monthNum = String(monthNames.indexOf(monthName) + 1).padStart(2, '0')
    const key = `${req_id}-${year}-${monthNum}`
    return documentCounts.get(key) || 0
  }

  const groupDocumentsByType = (documents: Document[]): Map<string, Document[]> => {
    const grouped = new Map<string, Document[]>()
    documents.forEach(doc => {
      if (!grouped.has(doc.document_type)) {
        grouped.set(doc.document_type, [])
      }
      grouped.get(doc.document_type)!.push(doc)
    })
    return grouped
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDeleteRequest = async () => {
    if (!scope_name || !from_date || !to_date) {
      toast.error("Missing request parameters")
      
      return
    }

    setIsDeleting(true)
    try {
      await api.deleteRequest(scope_name, from_date, to_date)
      console.log("Deleted request:", scope_name, from_date, to_date)
      toast.success("Request deleted successfully")
      // Navigate back to submitted requests page
      navigate('/snta/submitted-requests')
    } catch (error) {
      console.error("Error deleting request:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete request")
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!scope_name || !from_date || !to_date || !due_date) {
    return (
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden md:block shrink-0">
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        </aside>
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar title="Request Detail" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="container mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Invalid request parameters.</p>
                    <Button variant="outline" onClick={() => navigate('/snta/submitted-requests')} className="mt-4">
                      Back to Submitted Requests
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
        <Navbar title="Request Detail" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {scope_name || (records.length > 0 ? records[0].scope_name : 'Loading...')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      From: {formatDate(from_date)} | To: {formatDate(to_date)} | Due: {formatDate(due_date)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting || records.length === 0}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Request
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/snta/submitted-requests')}>
                      Back to Requests
                    </Button>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No records found for this request.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left font-semibold">Plaza Name</th>
                          {getMonthsBetweenDates(from_date, to_date).map((month) => (
                            <th key={month} className="border p-2 text-center font-semibold min-w-[120px]">
                              {month}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record) => (
                          <tr 
                            key={record.id} 
                            className={`hover:bg-muted/50 ${
                              record.done === 'Done' ? 'bg-green-50/30 dark:bg-green-950/20' : ''
                            }`}
                          >
                            <td className="border p-2 font-medium">
                              <div className="flex items-center gap-2">
                                <span>{formatPlazaName(record.plaza_name)}</span>
                                {record.done === 'Done' && (
                                  <Badge variant="default" className="bg-green-600 text-xs">Done</Badge>
                                )}
                              </div>
                            </td>
                            {getMonthsBetweenDates(from_date, to_date).map((month) => {
                              const count = getDocumentCount(record.req_id, month)
                              return (
                                <td 
                                  key={month} 
                                  className="border p-2 text-center cursor-pointer hover:bg-accent transition-colors"
                                  onClick={() => handleCellClick(record, month)}
                                >
                                  {count > 0 ? (
                                    <Badge variant="secondary" className="cursor-pointer">
                                      {count} {count === 1 ? 'Doc' : 'Docs'}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Request</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this request? This action will delete all documents from S3 bucket, all document records from the database, and the request from the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-2 space-y-2">
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Delete all documents from S3 bucket</li>
                    <li>Delete all document records from the database</li>
                    <li>Delete the request from the system</li>
                  </ul>
                  <p className="text-sm font-semibold text-destructive">This action cannot be undone.</p>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteRequest}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Request
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Documents Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setIsRejectMode(false)
                setSelectedDocuments(new Set())
                setRejectReason("")
              }
            }}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Documents - {selectedCell && formatPlazaName(selectedCell.plaza_name)}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCell && (
                      <>
                        {(() => {
                          const monthNames = [
                            "January", "February", "March", "April", "May", "June",
                            "July", "August", "September", "October", "November", "December"
                          ]
                          const monthName = monthNames[parseInt(selectedCell.month) - 1]
                          return `${monthName} ${selectedCell.year}`
                        })()}
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>
                {!isRejectMode && cellDocuments.length > 0 && (
                  <div className="flex justify-end pb-2 border-b">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRejectClick}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject Documents
                    </Button>
                  </div>
                )}
                <div className="space-y-4">
                  {isLoadingDocuments ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading documents...
                    </div>
                  ) : requiredDocumentTypes.length > 0 ? (
                    // Show all required document types
                    requiredDocumentTypes.map((docType) => {
                      // Get documents for this document type
                      const docs = cellDocuments.filter(doc => doc.document_type === docType)
                      
                      return (
                        <Card key={docType} className="p-4">
                          <h4 className="font-semibold mb-3 text-lg">{docType}</h4>
                          <div className="space-y-2">
                            {docs.length > 0 ? (
                              docs.map((doc) => (
                                <div 
                                  key={doc.id} 
                                  className={`flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 ${
                                    doc.is_rejected ? 'bg-destructive/10 border-destructive/20' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {isRejectMode && (
                                      <Checkbox
                                        checked={selectedDocuments.has(doc.id)}
                                        onCheckedChange={() => handleDocumentToggle(doc.id)}
                                        disabled={doc.is_rejected}
                                      />
                                    )}
                                    <FileText className={`h-4 w-4 shrink-0 ${doc.is_rejected ? 'text-destructive' : 'text-muted-foreground'}`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className={`font-medium text-sm truncate ${doc.is_rejected ? 'line-through text-muted-foreground' : ''}`}>
                                          {extractFileName(doc.document_url)}
                                        </p>
                                        {doc.is_rejected && (
                                          <Badge variant="destructive" className="text-xs">
                                            Rejected
                                          </Badge>
                                        )}
                                      </div>
                                      {doc.modified_time && (
                                        <p className="text-xs text-muted-foreground">
                                          Uploaded: {new Date(doc.modified_time).toLocaleString()}
                                        </p>
                                      )}
                                      {doc.is_rejected && doc.reason && (
                                        <p className="text-xs text-destructive mt-1">
                                          Reason: {doc.reason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {!isRejectMode && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(doc.document_url, '_blank')}
                                      className="h-8 shrink-0"
                                      disabled={doc.is_rejected}
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download
                                    </Button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="p-3 border rounded-lg bg-muted/30">
                                <p className="text-sm text-muted-foreground text-center">No documents uploaded</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      )
                    })
                  ) : cellDocuments.length > 0 ? (
                    // Fallback: if required document types are not available, show grouped by uploaded documents
                    Array.from(groupDocumentsByType(cellDocuments).entries()).map(([docType, docs]) => (
                      <Card key={docType} className="p-4">
                        <h4 className="font-semibold mb-3 text-lg">{docType}</h4>
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div 
                              key={doc.id} 
                              className={`flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 ${
                                doc.is_rejected ? 'bg-destructive/10 border-destructive/20' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isRejectMode && (
                                  <Checkbox
                                    checked={selectedDocuments.has(doc.id)}
                                    onCheckedChange={() => handleDocumentToggle(doc.id)}
                                    disabled={doc.is_rejected}
                                  />
                                )}
                                <FileText className={`h-4 w-4 shrink-0 ${doc.is_rejected ? 'text-destructive' : 'text-muted-foreground'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`font-medium text-sm truncate ${doc.is_rejected ? 'line-through text-muted-foreground' : ''}`}>
                                      {extractFileName(doc.document_url)}
                                    </p>
                                    {doc.is_rejected && (
                                      <Badge variant="destructive" className="text-xs">
                                        Rejected
                                      </Badge>
                                    )}
                                  </div>
                                  {doc.modified_time && (
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded: {new Date(doc.modified_time).toLocaleString()}
                                    </p>
                                  )}
                                  {doc.is_rejected && doc.reason && (
                                    <p className="text-xs text-destructive mt-1">
                                      Reason: {doc.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {!isRejectMode && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.document_url, '_blank')}
                                  className="h-8 shrink-0"
                                  disabled={doc.is_rejected}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No document types found</p>
                      <p className="text-sm mt-2">Unable to load required document types for this scope.</p>
                    </div>
                  )}
                  
                  {/* Reject Mode UI */}
                  {isRejectMode && (
                    <Card className="p-4 border-destructive">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reject-reason" className="text-sm font-semibold">
                            Reason for Rejection *
                          </Label>
                          <Input
                            id="reject-reason"
                            placeholder="Enter reason for rejecting selected documents..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="mt-2"
                            disabled={isRejecting}
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={handleCancelReject}
                            disabled={isRejecting}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleRejectSubmit}
                            disabled={selectedDocuments.size === 0 || !rejectReason.trim() || isRejecting}
                          >
                            {isRejecting ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Reject Selected ({selectedDocuments.size})
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}

