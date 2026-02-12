import { useEffect, useMemo, useState } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { UserSidebar } from "@/components/layout/UserSidebar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Menu } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import toast from "react-hot-toast"

type ProfileFormState = {
  name: string
  email: string
  designation: string
  mobile: string
  userCode: string
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [values, setValues] = useState<ProfileFormState>({
    name: user?.name ?? "",
    email: user?.email_id ?? "",
    designation: user?.designation ?? "",
    mobile: user?.mob_no ?? "",
    userCode: user?.user_code ?? "",
  })

  useEffect(() => {
    setValues({
      name: user?.name ?? "",
      email: user?.email_id ?? "",
      designation: user?.designation ?? "",
      mobile: user?.mob_no ?? "",
      userCode: user?.user_code ?? "",
    })
  }, [user])

  const isSnta = useMemo(() => user?.role?.toLowerCase() === "snta", [user])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    try {
      const data = await api.updateProfile({
        name: values.name,
        email_id: values.email,
        designation: values.designation,
        mob_no: values.mobile,
        user_code: values.userCode,
      })
      if (data?.user) {
        updateUser(data.user)
      }
      toast.success("Profile updated successfully.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:block shrink-0">
        {isSnta ? (
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        ) : (
          <UserSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        )}
      </aside>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {isSnta ? (
            <Sidebar isCollapsed={false} onToggle={() => setIsMobileMenuOpen(false)} />
          ) : (
            <UserSidebar isCollapsed={false} onToggle={() => setIsMobileMenuOpen(false)} />
          )}
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar title="Profile" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>View and update your account details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSave} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      value={values.name}
                      onChange={(e) => setValues({ ...values, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={values.email}
                      disabled
                      onChange={(e) => setValues({ ...values, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="profile-designation">Designation</Label>
                    <Input
                      id="profile-designation"
                      value={values.designation}
                      onChange={(e) => setValues({ ...values, designation: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="profile-mobile">Mobile</Label>
                    <Input
                      id="profile-mobile"
                      inputMode="tel"
                      value={values.mobile}
                      onChange={(e) => setValues({ ...values, mobile: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="profile-usercode">User Code</Label>
                    <Input
                      id="profile-usercode"
                      value={values.userCode}
                      disabled
                      onChange={(e) => setValues({ ...values, userCode: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setValues({
                          name: user?.name ?? "",
                          email: user?.email_id ?? "",
                          designation: user?.designation ?? "",
                          mobile: user?.mob_no ?? "",
                          userCode: user?.user_code ?? "",
                        })
                      }
                    >
                      Reset
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
