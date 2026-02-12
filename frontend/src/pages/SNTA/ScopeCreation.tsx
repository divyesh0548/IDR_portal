import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Menu, X } from "lucide-react"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

export default function ScopeCreation() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scopeName, setScopeName] = useState("")
  const [documentInput, setDocumentInput] = useState("")
  const [documents, setDocuments] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddDocument = () => {
    const trimmed = documentInput.trim()
    if (trimmed && !documents.includes(trimmed)) {
      setDocuments([...documents, trimmed])
      setDocumentInput("")
    } else if (documents.includes(trimmed)) {
      toast.error("Document already added")
    }
  }

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddDocument()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!scopeName.trim()) {
      toast.error("Scope name is required")
      return
    }

    if (documents.length === 0) {
      toast.error("Please add at least one required document")
      return
    }

    setIsSubmitting(true)

    try {
      // Join documents with comma separation
      const requiredDocuments = documents.join(", ")

      await api.createScope({
        scope_name: scopeName.trim(),
        required_documents: requiredDocuments,
      })

      toast.success("Scope created successfully!")

      // Reset form
      setScopeName("")
      setDocuments([])
      setDocumentInput("")
    } catch (error) {
      console.error("Error creating scope:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create scope")
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
        <Navbar title="Scope Creation" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Create Scope</CardTitle>
                <CardDescription>
                  Create a new scope by providing the scope name and required documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Scope Name */}
                  <div className="space-y-2">
                    <Label htmlFor="scope-name">Scope Name</Label>
                    <Input
                      id="scope-name"
                      type="text"
                      placeholder="Enter scope name"
                      value={scopeName}
                      onChange={(e) => setScopeName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Required Documents */}
                  <div className="space-y-2">
                    <Label htmlFor="required-documents">Required Documents</Label>
                    <div className="flex gap-2">
                      <Input
                        id="required-documents"
                        type="text"
                        placeholder="Enter document name and press Enter or click Add"
                        value={documentInput}
                        onChange={(e) => setDocumentInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <Button
                        type="button"
                        onClick={handleAddDocument}
                        disabled={!documentInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    {/* Document Tags */}
                    {documents.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 text-sm"
                          >
                            <span>{doc}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(index)}
                              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Add multiple documents by entering each name and clicking Add or pressing Enter
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Scope"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

