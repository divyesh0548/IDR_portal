import { useState, useEffect, useRef } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Menu, Search, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

interface Client {
  id: number
  email_id: string
  name: string
}

interface PlazaAssignment {
  plaza_name: string
  email_id: string
  created_at: string
}

export default function PlazaCreation() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [plazaName, setPlazaName] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<string>("")
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [plazaAssignments, setPlazaAssignments] = useState<PlazaAssignment[]>([])
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch clients and plaza assignments on component mount
  useEffect(() => {
    fetchClients()
    fetchPlazaAssignments()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setSearchQuery("")
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen])

  const fetchClients = async () => {
    setIsLoadingClients(true)
    try {
      const data = await api.getClients()
      setClients(data.clients || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
      toast.error("Failed to load client emails")
    } finally {
      setIsLoadingClients(false)
    }
  }

  const fetchPlazaAssignments = async () => {
    setIsLoadingAssignments(true)
    try {
      const data = await api.getPlazaAssignments()
      setPlazaAssignments(data.assignments || [])
    } catch (error) {
      console.error("Error fetching plaza assignments:", error)
      toast.error("Failed to load plaza assignments")
    } finally {
      setIsLoadingAssignments(false)
    }
  }

  // Filter clients based on search query
  const filteredClients = clients.filter((client) =>
    client.email_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!plazaName.trim()) {
      toast.error("Plaza name is required")
      return
    }

    if (!selectedEmail) {
      toast.error("Please select an email ID")
      return
    }

    setIsSubmitting(true)

    try {
      // Convert plaza name to lowercase before saving
      await api.assignPlaza({
        plaza_name: plazaName.trim().toLowerCase(),
        email_id: selectedEmail,
      })
      
      toast.success("Plaza assigned successfully!")
      
      // Reset form and refresh client list to update dropdown
      setPlazaName("")
      setSelectedEmail("")
      fetchClients() // Refresh to remove the assigned client from dropdown
      fetchPlazaAssignments() // Refresh plaza assignments table
    } catch (error) {
      console.error("Error assigning plaza:", error)
      toast.error(error instanceof Error ? error.message : "Failed to assign plaza")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedClient = clients.find((c) => c.email_id === selectedEmail)

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
        <Navbar title="Plaza Creation" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Create Plaza</CardTitle>
                <CardDescription>
                  Create a new plaza by providing the plaza name and selecting a client email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Plaza Name */}
                  <div className="space-y-2">
                    <Label htmlFor="plaza-name">Plaza Name</Label>
                    <Input
                      id="plaza-name"
                      type="text"
                      placeholder="Enter plaza name"
                      value={plazaName}
                      onChange={(e) => setPlazaName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Email ID Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="email-id">Email ID</Label>
                    <div className="relative" ref={dropdownRef}>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={isLoadingClients}
                      >
                        <span className="text-muted-foreground">
                          {selectedEmail
                            ? selectedClient
                              ? `${selectedClient.email_id}${selectedClient.name ? ` (${selectedClient.name})` : ""}`
                              : selectedEmail
                            : "Select email ID..."}
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
                                placeholder="Search email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            {filteredClients.length === 0 ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                {isLoadingClients ? "Loading..." : "No clients found"}
                              </div>
                            ) : (
                              <div className="p-1">
                                {filteredClients.map((client) => {
                                  const isSelected = selectedEmail === client.email_id
                                  return (
                                    <div
                                      key={client.id}
                                      className={cn(
                                        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent",
                                        isSelected && "bg-accent"
                                      )}
                                      onClick={() => {
                                        setSelectedEmail(client.email_id)
                                        setIsDropdownOpen(false)
                                        setSearchQuery("")
                                      }}
                                    >
                                      <div className="flex h-4 w-4 items-center justify-center rounded border">
                                        {isSelected && <Check className="h-3 w-3" />}
                                      </div>
                                      <div className="flex flex-col">
                                        <span>{client.email_id}</span>
                                        {client.name && (
                                          <span className="text-xs text-muted-foreground">
                                            {client.name}
                                          </span>
                                        )}
                                      </div>
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

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Plaza"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Plaza Assignments Table */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Plazas</CardTitle>
                <CardDescription>
                  List of all plazas with their associated email IDs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAssignments ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading assignments...
                  </div>
                ) : plazaAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No plaza assignments found
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left font-semibold">Plaza Name</th>
                          <th className="border p-2 text-left font-semibold">Email ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plazaAssignments.map((assignment, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="border p-2">
                              {assignment.plaza_name
                                .replace(/_/g, ' ')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(' ')}
                            </td>
                            <td className="border p-2">{assignment.email_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

