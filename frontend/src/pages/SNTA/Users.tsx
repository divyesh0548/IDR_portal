"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Sidebar } from "@/components/layout/Sidebar"
import { Navbar } from "@/components/layout/Navbar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Plus, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

type UserRole = "SNTA" | "Client"

type UserFormState = {
  name: string
  email: string
  designation: string
  mobile: string
  userCode: string
  userRole: UserRole | ""
}

type FieldErrors = Partial<Record<keyof UserFormState, string>>

interface User {
  id: number
  name: string
  email_id: string
  designation: string | null
  mob_no: string | null
  user_code: string | null
  role: string
  plaza_name: string | null
  created_at: string
}

const ROLES: UserRole[] = ["SNTA", "Client"]

function validate(values: UserFormState): FieldErrors {
  const e: FieldErrors = {}

  if (!values.name.trim()) e.name = "Name is required."
  if (!values.email.trim()) e.email = "Email is required."
  else if (!/^\S+@\S+\.\S+$/.test(values.email)) e.email = "Enter a valid email."

  if (!values.designation.trim()) e.designation = "Designation is required."

  if (!values.mobile.trim()) e.mobile = "Mobile is required."
  else if (!/^[0-9+()\-\s]+$/.test(values.mobile)) e.mobile = "Mobile can contain digits and + ( ) - spaces only."
  else if (values.mobile.replace(/[^\d]/g, "").length < 10) e.mobile = "Mobile must have at least 10 digits."

  if (!values.userCode.trim()) e.userCode = "User Code is required."
  if (!values.userRole) e.userRole = "User Role is required."

  return e
}

export default function Users() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  const [values, setValues] = React.useState<UserFormState>({
    name: "",
    email: "",
    designation: "",
    mobile: "",
    userCode: "",
    userRole: "",
  })
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [singleSubmitMsg, setSingleSubmitMsg] = React.useState<string>("")

  const [excelFile, setExcelFile] = React.useState<File | null>(null)
  const [bulkMsg, setBulkMsg] = React.useState<string>("")
  const excelInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const data = await api.getAllUsers()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  function setField<K extends keyof UserFormState>(key: K, v: UserFormState[K]) {
    setValues((prev) => ({ ...prev, [key]: v }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setSingleSubmitMsg("")
  }

  async function submitSingle(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) return

    try {
      await api.createUser({
        name: values.name,
        designation: values.designation,
        email_id: values.email,
        mob_no: values.mobile,
        user_code: values.userCode,
        role: values.userRole || "Client",
      })
      setValues({
        name: "",
        email: "",
        designation: "",
        mobile: "",
        userCode: "",
        userRole: "",
      })
      setErrors({})
      setSingleSubmitMsg("")
      toast.success("User created successfully.")
      setShowCreateForm(false)
      fetchUsers() // Refresh the user list
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user."
      setSingleSubmitMsg(message)
      toast.error(message)
    }
  }

  function onExcelChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setExcelFile(f)
    setBulkMsg(f ? `Selected: ${f.name}` : "")
  }

  async function submitBulk() {
    if (!excelFile) {
      const message = "Please select an Excel file first."
      setBulkMsg(message)
      toast.error(message)
      return
    }

    try {
      const data = await api.bulkCreateUsers(excelFile)
      setBulkMsg(data?.message ?? "Users created successfully.")
      setExcelFile(null)
      if (excelInputRef.current) {
        excelInputRef.current.value = ""
      }
      toast.success("Users created successfully.")
      fetchUsers() // Refresh the user list
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bulk upload failed."
      setBulkMsg(message)
      toast.error(message)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
        <Navbar title="Users" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto space-y-6">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">Users</h2>
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>

            {/* Create User Form */}
            {showCreateForm && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Create user</CardTitle>
                    <CardDescription>Single user creation using shadcn UI components.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={submitSingle} className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={values.name}
                          onChange={(e) => setField("name", e.target.value)}
                          aria-invalid={!!errors.name}
                          required
                        />
                        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={values.email}
                          onChange={(e) => setField("email", e.target.value)}
                          aria-invalid={!!errors.email}
                          required
                        />
                        {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          value={values.designation}
                          onChange={(e) => setField("designation", e.target.value)}
                          aria-invalid={!!errors.designation}
                          required
                        />
                        {errors.designation ? (
                          <p className="text-sm text-destructive">{errors.designation}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="mobile">Mobile</Label>
                        <Input
                          id="mobile"
                          inputMode="tel"
                          value={values.mobile}
                          onChange={(e) => setField("mobile", e.target.value)}
                          aria-invalid={!!errors.mobile}
                          required
                        />
                        {errors.mobile ? <p className="text-sm text-destructive">{errors.mobile}</p> : null}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="userCode">User Code</Label>
                        <Input
                          id="userCode"
                          value={values.userCode}
                          onChange={(e) => setField("userCode", e.target.value)}
                          aria-invalid={!!errors.userCode}
                          required
                        />
                        {errors.userCode ? <p className="text-sm text-destructive">{errors.userCode}</p> : null}
                      </div>

                      <div className="grid gap-2">
                        <Label>User Role</Label>
                        <Select
                          value={values.userRole}
                          onValueChange={(v) => setField("userRole", v as UserRole)}
                        >
                          <SelectTrigger aria-invalid={!!errors.userRole}>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.userRole ? <p className="text-sm text-destructive">{errors.userRole}</p> : null}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Button type="submit">Create user</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setValues({
                              name: "",
                              email: "",
                              designation: "",
                              mobile: "",
                              userCode: "",
                              userRole: "",
                            })
                            setErrors({})
                            setSingleSubmitMsg("")
                          }}
                        >
                          Reset
                        </Button>
                        {singleSubmitMsg ? (
                          <p className="text-sm text-muted-foreground">{singleSubmitMsg}</p>
                        ) : null}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Bulk user creation</CardTitle>
                    <CardDescription>
                      Upload an Excel file using shadcn Input type="file". (Parsing should happen on the server.)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="excel">Upload Excel</Label>
                      <Input
                        id="excel"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={onExcelChange}
                        ref={excelInputRef}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Button type="button" onClick={submitBulk} disabled={!excelFile}>
                        Upload file
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setExcelFile(null)
                          setBulkMsg("")
                          if (excelInputRef.current) {
                            excelInputRef.current.value = ""
                          }
                        }}
                      >
                        Clear
                      </Button>
                    </div>

                    {bulkMsg ? <p className="text-sm text-muted-foreground">{bulkMsg}</p> : null}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>List of all users in the system</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading users...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Designation</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>User Code</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Plaza</TableHead>
                          <TableHead>Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email_id}</TableCell>
                            <TableCell>{user.designation || "-"}</TableCell>
                            <TableCell>{user.mob_no || "-"}</TableCell>
                            <TableCell>{user.user_code || "-"}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>{user.plaza_name || "-"}</TableCell>
                            <TableCell>{formatDate(user.created_at)}</TableCell>
                          </TableRow>
                        ))}
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

