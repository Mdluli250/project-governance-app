"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  FolderKanban,
  CalendarCheck,
  Settings,
  Users,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  LogOut,
} from "lucide-react"
import { useTheme } from "next-themes"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/store"
import type { UserRole } from "@/lib/types"

const roleLabels: Record<UserRole, string> = {
  PM: "Project Manager",
  POC_MEMBER: "POC Member",
  POC_CHAIR: "POC Chair",
  ADMIN: "Admin",
}

const roleBadgeColors: Record<UserRole, string> = {
  PM: "bg-accent/15 text-accent border-accent/30",
  POC_MEMBER: "bg-primary/15 text-primary border-primary/30",
  POC_CHAIR: "bg-rag-amber/15 text-rag-amber border-rag-amber/30",
  ADMIN: "bg-rag-green/15 text-rag-green border-rag-green/30",
}

const governanceNav = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Portfolio Register",
    url: "/portfolio",
    icon: FolderKanban,
  },
]

const committeeNav = [
  {
    title: "POC Sessions",
    url: "/sessions",
    icon: CalendarCheck,
  },
]

const adminNav = [
  {
    title: "Configuration",
    url: "/configuration",
    icon: Settings,
    disabled: false,
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
    disabled: false,
  },
  {
    title: "Help",
    url: "/help",
    icon: HelpCircle,
    disabled: false,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentUser, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  if (!currentUser.id) return null

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">SSoc Governance</span>
                  <span className="text-xs text-sidebar-foreground/60">
                    Project Management Framework
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Logged-in User */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full cursor-default hover:bg-transparent">
              <div className="flex items-center gap-2 truncate">
                <div className="flex size-6 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {currentUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex flex-col items-start truncate">
                  <span className="truncate text-xs font-medium">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-sidebar-foreground/60">
                    {roleLabels[currentUser.role]}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Governance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {governanceNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Committees</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {committeeNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url || pathname.startsWith("/sessions")}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.disabled ? (
                    <SidebarMenuButton
                      tooltip={`${item.title} (Phase 2)`}
                      disabled
                      className="opacity-40 cursor-not-allowed"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url || pathname.startsWith(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1">
              <Badge variant="outline" className={roleBadgeColors[currentUser.role]}>
                {roleLabels[currentUser.role]}
              </Badge>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <Sun className="size-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-sidebar-foreground/60 hover:text-destructive"
                  onClick={logout}
                >
                  <LogOut className="size-3.5" />
                  <span className="sr-only">Sign out</span>
                </Button>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
