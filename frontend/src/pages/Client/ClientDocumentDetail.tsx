import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Navbar } from "@/components/layout/Navbar"
import { UserSidebar } from "@/components/layout/UserSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, ArrowLeft, FileText, Upload, Download, Loader2, Trash2, File, AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Document {
  id: number;
  req_id: string;
  document_type: string;
  document_url: string | null;
  modified_time: string | null;
  year: string;
  month: string;
  is_rejected?: boolean;
  reason?: string;
}

export default function ClientDocumentDetail() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()
  const { req_id } = useParams<{ req_id: string }>()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<Document[]>([])
  const [scopeName, setScopeName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
  const [deleting, setDeleting] = useState<{ [key: string]: boolean }>({})
  const [openDialog, setOpenDialog] = useState<{ [key: string]: boolean }>({})
  const [replacing, setReplacing] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (req_id) {
      fetchDocuments()
    }
  }, [req_id])

  const fetchDocuments = async () => {
    if (!req_id) return
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getDocumentsByReqId(req_id)
      setDocuments(data.documents || [])
      setScopeName(data.scope_name || null)
    } catch (error) {
      console.error('Error fetching documents:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch documents')
      setDocuments([])
      setScopeName(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Group documents by month+year and get unique document types
  const getUniqueDocumentTypes = () => {
    const types = new Set<string>()
    documents.forEach(doc => {
      if (doc.document_type) {
        types.add(doc.document_type)
      }
    })
    return Array.from(types).sort()
  }

  const getUniqueMonthYears = () => {
    const monthYears = new Set<string>()
    documents.forEach(doc => {
      if (doc.year && doc.month) {
        const monthYear = `${doc.year}-${doc.month}`
        monthYears.add(monthYear)
      }
    })
    return Array.from(monthYears).sort()
  }

  const getDocuments = (monthYear: string, documentType: string): Document[] => {
    return documents.filter(doc => {
      const docMonthYear = `${doc.year}-${doc.month}`
      return docMonthYear === monthYear && doc.document_type === documentType && doc.document_url
    })
  }


  const getDocumentCount = (monthYear: string, documentType: string): number => {
    return documents.filter(doc => {
      const docMonthYear = `${doc.year}-${doc.month}`
      return docMonthYear === monthYear && doc.document_type === documentType && doc.document_url
    }).length
  }

  const handleFileUpload = async (monthYear: string, documentType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (!req_id || !event.target.files || event.target.files.length === 0) return

    const file = event.target.files[0]
    const [year, month] = monthYear.split('-')
    const uploadKey = `${monthYear}-${documentType}`

    setUploading(prev => ({ ...prev, [uploadKey]: true }))
    setError(null)

    try {
      await api.uploadDocument(req_id, documentType, year, month, file)
      // Refresh documents after successful upload
      await fetchDocuments()
    } catch (error) {
      console.error('Error uploading document:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setUploading(prev => ({ ...prev, [uploadKey]: false }))
      // Reset file input
      event.target.value = ''
    }
  }

  const handleDownload = (url: string) => {
    window.open(url, '_blank')
  }

  const extractFileName = (url: string): string => {
    try {
      // Extract filename from S3 URL: IDR/plaza/scope/type/month-year/filename
      const parts = url.split('/')
      const fileName = parts[parts.length - 1]
      // Decode URL encoding if present
      return decodeURIComponent(fileName)
    } catch {
      return 'Document'
    }
  }

  const handleDelete = async (documentId: string, monthYear: string, documentType: string) => {
    if (!req_id) return

    const [year, month] = monthYear.split('-')
    const deleteKey = `${documentId}`

    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeleting(prev => ({ ...prev, [deleteKey]: true }))
    setError(null)

    try {
      await api.deleteDocument(documentId, req_id, documentType, year, month)
      // Refresh documents after successful delete
      await fetchDocuments()
      
      // Close dialog if no documents remain
      const docCount = getDocumentCount(monthYear, documentType)
      const dialogKey = `${monthYear}-${documentType}`
      if (docCount === 0) {
        setOpenDialog(prev => ({ ...prev, [dialogKey]: false }))
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete document')
    } finally {
      setDeleting(prev => ({ ...prev, [deleteKey]: false }))
    }
  }

  const handleReplace = async (doc: Document, file: File) => {
    const replaceKey = String(doc.id)
    setReplacing(prev => ({ ...prev, [replaceKey]: true }))
    setError(null)

    try {
      await api.replaceDocument(doc.id, file)
      await fetchDocuments()
    } catch (error) {
      console.error('Error replacing document:', error)
      setError(error instanceof Error ? error.message : 'Failed to replace document')
    } finally {
      setReplacing(prev => ({ ...prev, [replaceKey]: false }))
    }
  }

  const getMonthName = (month: string) => {
    const monthNum = parseInt(month, 10)
    const date = new Date(2000, monthNum - 1, 1)
    return date.toLocaleString('en-US', { month: 'long' })
  }

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-')
    const monthName = getMonthName(month)
    return `${monthName} ${year}`
  }

  const documentTypes = getUniqueDocumentTypes()
  const monthYears = getUniqueMonthYears()
  const rejectedDocuments = documents.filter(doc => doc.is_rejected)

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
          <Navbar title="Document Details" />
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
        <Navbar title="Document Details" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto">
            <div className="mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/client/document-requests')}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Document Requests
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
                <CardDescription>
                  Documents required for this request
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rejectedDocuments.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="mb-4 p-3 rounded-md border border-yellow-300 bg-yellow-50 text-sm flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <div>
                            <p className="font-medium text-yellow-800">
                              {rejectedDocuments.length} document{rejectedDocuments.length !== 1 ? "s" : ""} have been rejected.
                            </p>
                            <p className="text-xs text-yellow-800/80">
                              Click to view details of rejected documents.
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>Rejected Documents</DialogTitle>
                        <DialogDescription>
                          The following documents for this request (plaza and scope) have been marked as rejected.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {rejectedDocuments.map((doc) => (
                          <Card key={doc.id} className="p-3 border-destructive/40 bg-destructive/5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-sm">
                                  {doc.document_type} - {formatMonthYear(`${doc.year}-${doc.month}`)}
                                </p>
                                {doc.reason && (
                                  <p className="text-xs text-destructive mt-1">
                                    Reason: {doc.reason}
                                  </p>
                                )}
                                {doc.modified_time && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Last updated: {new Date(doc.modified_time).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {scopeName && (
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm text-muted-foreground">Scope</p>
                    <p className="text-lg font-semibold">{scopeName}</p>
                  </div>
                )}
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading documents...
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-destructive">
                    <p className="font-medium">Error loading documents</p>
                    <p className="text-sm mt-2">{error}</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No documents found</p>
                    <p className="text-sm mt-2">No documents have been assigned to this request yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Month / Year</TableHead>
                          {documentTypes.map((docType) => (
                            <TableHead key={docType} className="text-center">
                              {docType}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthYears.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={documentTypes.length + 1} className="text-center text-muted-foreground">
                              No data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          monthYears.map((monthYear) => (
                            <TableRow key={monthYear}>
                              <TableCell className="font-medium">
                                {formatMonthYear(monthYear)}
                              </TableCell>
                              {documentTypes.map((docType) => {
                                const uploadedDocs = getDocuments(monthYear, docType)
                                const uploadKey = `${monthYear}-${docType}`
                                const dialogKey = `${monthYear}-${docType}`
                                const isUploading = uploading[uploadKey]
                                const docCount = uploadedDocs.length

                                return (
                                  <TableCell key={docType} className="text-center align-middle">
                                    <div className="flex items-center justify-center gap-2">
                                      {/* Show count badge if documents exist */}
                                      {docCount > 0 ? (
                                        <Dialog 
                                          open={openDialog[dialogKey] || false}
                                          onOpenChange={(open) => setOpenDialog(prev => ({ ...prev, [dialogKey]: open }))}
                                        >
                                          <DialogTrigger asChild>
                                            <Badge 
                                              variant="secondary" 
                                              className="cursor-pointer hover:bg-secondary/80 px-3 py-1"
                                            >
                                              <File className="h-3 w-3 mr-1" />
                                              {docCount} {docCount === 1 ? 'Document' : 'Documents'}
                                            </Badge>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                              <DialogTitle>
                                                Documents - {docType} ({formatMonthYear(monthYear)})
                                              </DialogTitle>
                                              <DialogDescription>
                                                Manage all uploaded documents for this month and document type
                                              </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                              {uploadedDocs.map((doc) => {
                                                const deleteKey = `${doc.id}`
                                                const isDeleting = deleting[deleteKey]
                                                const replaceKey = `${doc.id}`
                                                const isReplacing = replacing[replaceKey]
                                                const isRejected = !!doc.is_rejected

                                                return (
                                                  <Card
                                                    key={doc.id}
                                                    className={`p-3 ${isRejected ? 'border-destructive/60 bg-destructive/5' : ''}`}
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <FileText
                                                          className={`h-5 w-5 shrink-0 ${isRejected ? 'text-destructive' : 'text-muted-foreground'}`}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                          <p
                                                            className={`font-medium text-sm truncate ${isRejected ? 'text-destructive' : ''}`}
                                                          >
                                                            {extractFileName(doc.document_url!)}
                                                          </p>
                                                          {doc.modified_time && (
                                                            <p className="text-xs text-muted-foreground">
                                                              Uploaded: {new Date(doc.modified_time).toLocaleString()}
                                                            </p>
                                                          )}
                                                          {isRejected && doc.reason && (
                                                            <p className="text-xs text-destructive mt-1">
                                                              Reason: {doc.reason}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-2 shrink-0">
                                                        {isRejected ? (
                                                          <>
                                                            <input
                                                              id={`replace-input-${doc.id}`}
                                                              type="file"
                                                              className="hidden"
                                                              onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                  void handleReplace(doc, e.target.files[0])
                                                                  e.target.value = ''
                                                                }
                                                              }}
                                                              disabled={isReplacing}
                                                              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                                            />
                                                            <Button
                                                              variant="destructive"
                                                              size="sm"
                                                              className="h-8"
                                                              disabled={isReplacing}
                                                              onClick={() => {
                                                                const input = document.getElementById(`replace-input-${doc.id}`) as HTMLInputElement | null
                                                                input?.click()
                                                              }}
                                                            >
                                                              {isReplacing ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                              ) : (
                                                                <>
                                                                  <Upload className="h-4 w-4 mr-1" />
                                                                  Replace
                                                                </>
                                                              )}
                                                            </Button>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Button
                                                              variant="outline"
                                                              size="sm"
                                                              onClick={() => handleDownload(doc.document_url!)}
                                                              className="h-8"
                                                            >
                                                              <Download className="h-4 w-4 mr-1" />
                                                              Download
                                                            </Button>
                                                            <Button
                                                              variant="destructive"
                                                              size="sm"
                                                              onClick={() => handleDelete(doc.id.toString(), monthYear, docType)}
                                                              disabled={isDeleting}
                                                              className="h-8"
                                                            >
                                                              {isDeleting ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                              ) : (
                                                                <>
                                                                  <Trash2 className="h-4 w-4 mr-1" />
                                                                  Delete
                                                                </>
                                                              )}
                                                            </Button>
                                                          </>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </Card>
                                                )
                                              })}
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                      ) : null}
                                      
                                      {/* Always show upload icon on the right */}
                                      <div className="flex items-center justify-center">
                                        <label className="cursor-pointer">
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(monthYear, docType, e)}
                                            disabled={isUploading}
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                          />
                                          {isUploading ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                          ) : (
                                            <Upload className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                                          )}
                                        </label>
                                      </div>
                                    </div>
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
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

