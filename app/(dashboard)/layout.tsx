"use client"

import React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useAuth } from "@/lib/store"
import { LoginScreen } from "@/components/login-screen"
import { ChangePasswordScreen } from "@/components/change-password-screen"

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/portfolio": "Portfolio Register",
  "/sessions": "POC Sessions",
}

function getBreadcrumbs(pathname: string) {
  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/" }]
  }

  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/" },
  ]

  if (segments[0] === "portfolio") {
    crumbs.push({ label: "Portfolio Register", href: "/portfolio" })
  } else if (segments[0] === "projects") {
    crumbs.push({ label: "Portfolio Register", href: "/portfolio" })
    if (segments[1]) {
      crumbs.push({ label: "Project Detail", href: pathname })
    }
  } else if (segments[0] === "sessions") {
    crumbs.push({ label: "POC Sessions", href: "/sessions" })
    if (segments[1]) {
      crumbs.push({ label: "Session Workspace", href: pathname })
    }
  }

  return crumbs
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)
  const { isAuthenticated, mustChangePassword } = useAuth()

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  if (mustChangePassword) {
    return <ChangePasswordScreen />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1
                return (
                  <React.Fragment key={crumb.href}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
