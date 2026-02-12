import { useNavigate, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Building2,
  FolderOpen
} from "lucide-react"

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/snta/dashboard" },
  { icon: PlayCircle, label: "Run Master", path: "/snta/run_master" },
  { icon: FileText, label: "User", path: "/snta/users" },
  { icon: Building2, label: "Plaza Creation", path: "/snta/plaza-creation" },
  { icon: FolderOpen, label: "Scope Creation", path: "/snta/scope-creation" },
  { icon: Settings, label: "Settings", path: "/snta/settings" },
]

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div
      className={cn(
        "relative border-r bg-card transition-all duration-300 flex flex-col h-screen",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle Button Header - Same height as Navbar (h-16) */}
      <div className="flex items-center justify-between h-16 px-4 border-b shrink-0">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold">IDR</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn("cursor-pointer", isCollapsed ? "mx-auto" : "ml-auto")}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto">

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start cursor-pointer",
                  isCollapsed ? "px-2" : "px-4"
                )}
                onClick={() => navigate(item.path)}
              >
                <Icon className={cn("h-4 w-4", isCollapsed ? "mx-auto" : "mr-2")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

