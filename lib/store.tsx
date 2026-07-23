"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react"
import type {
  User,
  Project,
  POCReview,
  Action,
  KDADecision,
  AuditEntry,
  RiskIssue,
  POCSession,
  AuditType,
} from "./types"
import type {
  DashboardSummaryResponse,
  PortfolioProject,
  PortfolioResponse,
  ProjectDetailResponse,
  SessionsListResponse,
  SessionDetailResponse,
  AuditPageResponse,
} from "./api-types"
import { loadUsers, createUser as createUserDb, updateUserDb, deleteUserDb } from "./users-db"
import { setAuthToken, clearAuthToken, getAuthHeaders } from "./auth-token"

import {
  CLASSIFICATION_THRESHOLDS as INITIAL_CLASSIFICATION_THRESHOLDS,
  POC_CADENCE as INITIAL_POC_CADENCE,
} from "./constants"
import {
  loadAllConfig,
  saveClusters,
  saveStrategicObjectives,
  saveChecklistTemplate,
  saveActionCategories,
} from "./config-db"
import {
  persistEntity,
  fetchDashboardSummary,
  fetchPortfolio,
  fetchProjectDetail,
  fetchSessions,
  fetchSessionDetail,
  fetchAuditPage,
} from "./data-db"
import { createLoadingManager, type LoadingManager } from "./loading-state"

// ── Config types ───────────────────────────────────────────
export interface StrategicObjective {
  id: string
  label: string
  description: string
}

export interface ChecklistSection {
  section: string
  items: string[]
}

export interface ActionCategoryItem {
  value: string
  label: string
}

export interface ClassificationThreshold {
  contractValue: number
  riskComplexity: string
  reputationalRisk: string
}

export interface POCCadenceItem {
  label: string
  frequency: string
  quarters: number[]
}

// ── Auth Context ───────────────────────────────────────────
interface AuthContextType {
  currentUser: User
  setCurrentUser: (user: User) => void
  isAuthenticated: boolean
  mustChangePassword: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (userId: string) => Promise<{ success: boolean; error?: string }>
  users: User[]
  usersLoaded: boolean
  addUser: (user: Omit<User, "id">) => Promise<(User & { temporaryPassword?: string }) | null>
  updateUser: (id: string, updates: Partial<User>) => void
  deleteUser: (id: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

const EMPTY_USER: User = { id: "", name: "", email: "", role: "PM" }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [usersLoaded, setUsersLoaded] = useState(true)
  const loadDone = useRef(false)

  // Restore session from localStorage on mount
  // NOTE: Do NOT set mustChangePassword here -- only set it during active login.
  // If the user already has a session, they already passed the change-password gate.
  useEffect(() => {
    const stored = localStorage.getItem("gov_session")
    const token = localStorage.getItem("gov_auth_token")
    if (stored && token) {
      try {
        // Check if token is expired by decoding the payload
        const payload = JSON.parse(atob(token.split(".")[1]))
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token expired — clear session and force re-login
          localStorage.removeItem("gov_session")
          localStorage.removeItem("gov_auth_token")
          return
        }
        const user = JSON.parse(stored) as User
        setCurrentUser(user)
        setIsAuthenticated(true)
      } catch {
        localStorage.removeItem("gov_session")
        localStorage.removeItem("gov_auth_token")
      }
    } else {
      // No valid token — clear stale session
      localStorage.removeItem("gov_session")
      localStorage.removeItem("gov_auth_token")
    }
  }, [])

  // Load users from API when authenticated, with a timeout fallback
  useEffect(() => {
    if (loadDone.current) return
    if (!isAuthenticated) return
    loadDone.current = true

    // Ensure usersLoaded is set even if the fetch hangs
    const timeout = setTimeout(() => {
      setUsersLoaded((prev) => {
        if (!prev) console.warn("User load timed out, enabling login with seed users")
        return true
      })
    }, 5000)

    loadUsers()
      .then((dbUsers) => {
        clearTimeout(timeout)
        console.log("[v0] Users loaded from API:", dbUsers.length, "users")
        setUsers(dbUsers)
        // Keep current user in sync with DB version (including passwordChanged flag)
        setCurrentUser((prev) => {
          if (!prev.id) return prev
          const match = dbUsers.find((u) => u.id === prev.id)
          if (match) {
            localStorage.setItem("gov_session", JSON.stringify(match))
            return match
          }
          return prev
        })
        setUsersLoaded(true)
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error("[v0] Failed to load users from Supabase:", err)
        setUsersLoaded(true)
      })
  }, [isAuthenticated])

  const DEFAULT_PASSWORD = "12345678"

  // Passwords stored in memory per user id (maps id -> password)
  // Users who haven't changed their password use the default
  const passwordMapRef = useRef<Record<string, string>>({})

  // Track users whose passwords were explicitly reset by admin in this session
  const adminResetUsersRef = useRef<Set<string>>(new Set())

    const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: "Email and password are required." }
    }
    
    try {
      // Call the API endpoint instead of checking locally
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        return { success: false, error: data.error || "Invalid email or password." }
      }

      const data = await response.json()
      
      // If API returns user object, set it
      if (data.user) {
        const user: User = {
          id: data.user.id,
          name: data.user.name || "",
          email: data.user.email,
          role: data.user.role || "PM",
          cluster: data.user.cluster,
          impactArea: data.user.impactArea,
        }
        
        // Store JWT token for authenticated API calls
        if (data.token) {
          setAuthToken(data.token)
        }
        
        setCurrentUser(user)
        setIsAuthenticated(true)
        setMustChangePassword(!data.user.passwordChanged)
        localStorage.setItem("gov_session", JSON.stringify(user))
        return { success: true }
      }

      return { success: false, error: "Login failed." }
    } catch (error) {
      console.error("[v0] Login error:", error)
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  const changePassword = useCallback(async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters." }
    }
    if (newPassword === DEFAULT_PASSWORD) {
      return { success: false, error: "New password cannot be the same as the default password." }
    }
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id: currentUser.id, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return { success: false, error: data.error || "Failed to change password." }
      }
      // Store new password locally and update user state
      passwordMapRef.current[currentUser.id] = newPassword
      const updatedUser = { ...currentUser, passwordChanged: true }
      setCurrentUser(updatedUser)
      setUsers((prev) => prev.map((u) => u.id === currentUser.id ? { ...u, passwordChanged: true } : u))
      setMustChangePassword(false)
      localStorage.setItem("gov_session", JSON.stringify(updatedUser))
      return { success: true }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [currentUser])

  const resetPassword = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id: userId, resetToDefault: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return { success: false, error: data.error || "Failed to reset password." }
      }
      // Clear stored password and track that this user was admin-reset
      delete passwordMapRef.current[userId]
      adminResetUsersRef.current.add(userId)
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, passwordChanged: false } : u))
      return { success: true }
    } catch {
      return { success: false, error: "Network error. Please try again." }
    }
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(EMPTY_USER)
    setIsAuthenticated(false)
    setMustChangePassword(false)
    clearAuthToken()
    localStorage.removeItem("gov_session")
  }, [])

  const addUser = useCallback(async (user: Omit<User, "id">): Promise<(User & { temporaryPassword?: string }) | null> => {
    try {
      const created = await createUserDb(user)
      setUsers((prev) => [...prev, created])
      return created
    } catch (err) {
      console.error("Failed to persist user:", err)
      // Fallback: still add locally
      const fallback: User = { ...user, id: `local-${Date.now()}` }
      setUsers((prev) => [...prev, fallback])
      return fallback
    }
  }, [])

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    )
    // Also keep currentUser in sync
    setCurrentUser((prev) =>
      prev.id === id ? { ...prev, ...updates } : prev
    )
    updateUserDb(id, updates).catch((err) =>
      console.error("Failed to persist user update:", err)
    )
  }, [])

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
    deleteUserDb(id).catch((err) =>
      console.error("Failed to persist user delete:", err)
    )
  }, [])

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, isAuthenticated, mustChangePassword, login, logout, changePassword, resetPassword, users, usersLoaded, addUser, updateUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Data Context ───────────────────────────────────────────
interface DataContextType {
  // Existing monolithic state (kept for backwards compat during migration)
  projects: Project[]
  reviews: POCReview[]
  actions: Action[]
  kdaDecisions: KDADecision[]
  auditLog: AuditEntry[]
  risks: RiskIssue[]
  sessions: POCSession[]
  dataLoaded: boolean

  // Per-page data fetching (new)
  dashboardSummary: DashboardSummaryResponse | null
  loadDashboard: () => Promise<void>

  portfolioProjects: PortfolioProject[] | null
  portfolioActionSummaries: Record<string, { open: number; overdue: number }> | null
  portfolioReviewSummaries: Record<string, { nextReviewDate: string | null }> | null
  loadPortfolio: () => Promise<void>

  projectDetailCache: Map<string, ProjectDetailResponse>
  loadProjectDetail: (id: string) => Promise<void>

  sessionsData: SessionsListResponse | null
  loadSessions: () => Promise<void>
  loadSessionDetail: (id: string) => Promise<SessionDetailResponse>

  auditPageCache: Map<string, { entries: AuditEntry[]; nextCursor: string | null }>
  loadAuditPage: (projectId: string, cursor?: string) => Promise<AuditPageResponse>

  // Loading and error states
  loadingStates: Record<string, boolean>
  errors: Record<string, string | null>
  retry: (key: string) => void

  // Cache invalidation
  invalidateDashboard: () => void
  invalidatePortfolio: () => void
  invalidateProjectDetail: (id: string) => void

  // Config state
  clusters: string[]
  impactAreas: Record<string, string[]>
  strategicObjectives: StrategicObjective[]
  checklistTemplate: ChecklistSection[]
  actionCategories: ActionCategoryItem[]
  classificationThresholds: Record<string, ClassificationThreshold>
  pocCadence: Record<string, POCCadenceItem>
  configLoaded: boolean
  updateProject: (id: string, updates: Partial<Project>) => void
  addProject: (project: Project) => void
  addAction: (action: Action) => void
  updateAction: (id: string, updates: Partial<Action>) => void
  addReview: (review: POCReview) => void
  updateReview: (id: string, updates: Partial<POCReview>) => void
  addKDADecision: (decision: KDADecision) => void
  addRisk: (risk: RiskIssue) => void
  updateRisk: (id: string, updates: Partial<RiskIssue>) => void
  addSession: (session: POCSession) => void
  updateSession: (id: string, updates: Partial<POCSession>) => void
  deleteSession: (id: string) => Promise<boolean>
  deleteProject: (id: string) => Promise<boolean>
  addAuditEntry: (entry: Omit<AuditEntry, "id" | "timestamp">) => void
  getProjectById: (id: string) => Project | undefined
  getReviewsForProject: (projectId: string) => POCReview[]
  getActionsForProject: (projectId: string) => Action[]
  getKDAForProject: (projectId: string) => KDADecision[]
  getAuditForProject: (projectId: string) => AuditEntry[]
  getRisksForProject: (projectId: string) => RiskIssue[]
  // Config mutators
  setClusters: (clusters: string[]) => void
  setImpactAreas: (areas: Record<string, string[]>) => void
  setStrategicObjectives: (objectives: StrategicObjective[]) => void
  setChecklistTemplate: (template: ChecklistSection[]) => void
  setActionCategories: (categories: ActionCategoryItem[]) => void
  setClassificationThresholds: (thresholds: Record<string, ClassificationThreshold>) => void
  setPocCadence: (cadence: Record<string, POCCadenceItem>) => void
}

const DataContext = createContext<DataContextType | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}

let _auditId = 100

export function DataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [reviews, setReviews] = useState<POCReview[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [kdaDecisions, setKDADecisions] = useState<KDADecision[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [risks, setRisks] = useState<RiskIssue[]>([])
  const [sessions, setSessions] = useState<POCSession[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const dataLoadDone = useRef(false)

  // ── Per-page state slices (new, additive) ──────────────────
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryResponse | null>(null)
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[] | null>(null)
  const [portfolioActionSummaries, setPortfolioActionSummaries] = useState<Record<string, { open: number; overdue: number }> | null>(null)
  const [portfolioReviewSummaries, setPortfolioReviewSummaries] = useState<Record<string, { nextReviewDate: string | null }> | null>(null)
  const [projectDetailCache, setProjectDetailCache] = useState<Map<string, ProjectDetailResponse>>(new Map())
  const [sessionsData, setSessionsData] = useState<SessionsListResponse | null>(null)
  const [auditPageCache, setAuditPageCache] = useState<Map<string, { entries: AuditEntry[]; nextCursor: string | null }>>(new Map())

  // ── Loading state manager integration ──────────────────────
  const loadingManagerRef = useRef<LoadingManager | null>(null)
  if (!loadingManagerRef.current) {
    loadingManagerRef.current = createLoadingManager()
  }
  const loadingManager = loadingManagerRef.current

  // Subscribe to loading manager state changes to trigger React re-renders
  const loadingStates = useSyncExternalStore(
    loadingManager.subscribe,
    loadingManager.getLoadingStates,
    loadingManager.getLoadingStates
  )
  const errors = useSyncExternalStore(
    loadingManager.subscribe,
    loadingManager.getErrors,
    loadingManager.getErrors
  )

  // Stale markers for cache invalidation
  const staleCachesRef = useRef<Set<string>>(new Set())

  // Cleanup loading manager on unmount
  useEffect(() => {
    return () => {
      loadingManagerRef.current?.destroy()
    }
  }, [])

  // ── Per-page loading methods ───────────────────────────────

  const loadDashboard = useCallback(async () => {
    const key = "dashboard"
    const opId = loadingManager.startLoading(key)
    try {
      const data = await fetchDashboardSummary()
      setDashboardSummary(data)
      staleCachesRef.current.delete(key)
      loadingManager.endLoading(key, opId)
    } catch (err) {
      loadingManager.setError(key, opId, err instanceof Error ? err.message : "Failed to load dashboard")
    }
  }, [loadingManager])

  const loadPortfolio = useCallback(async () => {
    const key = "portfolio"
    const opId = loadingManager.startLoading(key)
    try {
      const data: PortfolioResponse = await fetchPortfolio()
      setPortfolioProjects(data.projects)
      setPortfolioActionSummaries(data.actionSummaries)
      setPortfolioReviewSummaries(data.reviewSummaries)
      staleCachesRef.current.delete(key)
      loadingManager.endLoading(key, opId)
    } catch (err) {
      loadingManager.setError(key, opId, err instanceof Error ? err.message : "Failed to load portfolio")
    }
  }, [loadingManager])

  const loadProjectDetail = useCallback(async (id: string) => {
    const key = `project-detail-${id}`
    // Check cache: skip fetch if data exists and isn't stale
    if (projectDetailCache.has(id) && !staleCachesRef.current.has(key)) {
      return
    }
    const opId = loadingManager.startLoading(key)
    try {
      const data = await fetchProjectDetail(id)
      setProjectDetailCache((prev) => {
        const next = new Map(prev)
        next.set(id, data)
        return next
      })
      staleCachesRef.current.delete(key)
      loadingManager.endLoading(key, opId)
    } catch (err) {
      loadingManager.setError(key, opId, err instanceof Error ? err.message : "Failed to load project detail")
    }
  }, [loadingManager, projectDetailCache])

  const loadSessions = useCallback(async () => {
    const key = "sessions"
    const opId = loadingManager.startLoading(key)
    try {
      const data = await fetchSessions()
      setSessionsData(data)
      staleCachesRef.current.delete(key)
      loadingManager.endLoading(key, opId)
    } catch (err) {
      loadingManager.setError(key, opId, err instanceof Error ? err.message : "Failed to load sessions")
    }
  }, [loadingManager])

  const loadSessionDetailFn = useCallback(async (id: string): Promise<SessionDetailResponse> => {
    const key = `session-detail-${id}`
    const opId = loadingManager.startLoading(key)
    try {
      const data = await fetchSessionDetail(id)
      // Merge the fetched session into the sessions state so the detail page can find it
      const sessionEntry: POCSession = {
        id: data.session.id,
        date: data.session.date,
        committeeType: data.session.committeeType,
        projectIds: data.session.projectIds,
        status: data.session.status,
        attendees: data.session.attendees,
      }
      setSessions((prev) => {
        const exists = prev.some((s) => s.id === id)
        return exists
          ? prev.map((s) => (s.id === id ? { ...s, ...sessionEntry } : s))
          : [...prev, sessionEntry]
      })

      // Also load full project details for each project in the session
      // so the workspace page can access them via the projects array
      const projectFetches = data.session.projectIds.map(async (pid) => {
        try {
          const detail = await fetchProjectDetail(pid)
          setProjects((prev) => {
            const exists = prev.some((p) => p.id === pid)
            return exists
              ? prev.map((p) => (p.id === pid ? detail.project : p))
              : [...prev, detail.project]
          })
          // Also merge related entities into state
          setReviews((prev) => {
            const filtered = prev.filter((r) => r.projectId !== pid)
            return [...filtered, ...detail.reviews]
          })
          setActions((prev) => {
            const filtered = prev.filter((a) => a.projectId !== pid)
            return [...filtered, ...detail.actions]
          })
          setRisks((prev) => {
            const filtered = prev.filter((r) => r.projectId !== pid)
            return [...filtered, ...detail.risks]
          })
          setKDADecisions((prev) => {
            const filtered = prev.filter((k) => k.projectId !== pid)
            return [...filtered, ...detail.kdaDecisions]
          })
        } catch {
          // Individual project load failure is non-fatal
        }
      })
      await Promise.all(projectFetches)

      loadingManager.endLoading(key, opId)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load session detail"
      loadingManager.setError(key, opId, msg)
      throw err
    }
  }, [loadingManager])

  const loadAuditPageFn = useCallback(async (projectId: string, cursor?: string): Promise<AuditPageResponse> => {
    const key = `audit-${projectId}`
    const opId = loadingManager.startLoading(key)
    try {
      const data = await fetchAuditPage(projectId, cursor)
      setAuditPageCache((prev) => {
        const next = new Map(prev)
        const existing = next.get(projectId)
        if (cursor && existing) {
          // Append new entries for "Load More" behavior
          next.set(projectId, {
            entries: [...existing.entries, ...data.entries],
            nextCursor: data.nextCursor,
          })
        } else {
          // First page or refresh
          next.set(projectId, {
            entries: data.entries,
            nextCursor: data.nextCursor,
          })
        }
        return next
      })
      loadingManager.endLoading(key, opId)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load audit page"
      loadingManager.setError(key, opId, msg)
      throw err
    }
  }, [loadingManager])

  // ── Cache invalidation ─────────────────────────────────────

  const invalidateDashboard = useCallback(() => {
    staleCachesRef.current.add("dashboard")
  }, [])

  const invalidatePortfolio = useCallback(() => {
    staleCachesRef.current.add("portfolio")
  }, [])

  const invalidateProjectDetail = useCallback((id: string) => {
    staleCachesRef.current.add(`project-detail-${id}`)
  }, [])

  // ── Retry support ──────────────────────────────────────────

  const retryFn = useCallback((key: string) => {
    loadingManager.retry(key)
  }, [loadingManager])

  // Register fetch functions for retry support
  useEffect(() => {
    loadingManager.registerFetch("dashboard", loadDashboard)
    loadingManager.registerFetch("portfolio", loadPortfolio)
    loadingManager.registerFetch("sessions", loadSessions)
  }, [loadingManager, loadDashboard, loadPortfolio, loadSessions])

  // ── Mark data as loaded — per-page endpoints now handle data fetching ─
  useEffect(() => {
    if (dataLoadDone.current) return
    if (!isAuthenticated) return
    dataLoadDone.current = true
    setDataLoaded(true)
  }, [isAuthenticated])

  // Config state -- always starts empty, loaded from Supabase only.
  // No hardcoded seed data is used as initial state.
  const [clusters, setClusters] = useState<string[]>([])
  const [impactAreas, setImpactAreas] = useState<Record<string, string[]>>({})
  const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>([])
  const [checklistTemplate, setChecklistTemplate] = useState<ChecklistSection[]>([])
  const [actionCategories, setActionCategories] = useState<ActionCategoryItem[]>([])
  const [classificationThresholds, setClassificationThresholds] = useState<Record<string, ClassificationThreshold>>(
    JSON.parse(JSON.stringify(INITIAL_CLASSIFICATION_THRESHOLDS))
  )
  const [pocCadence, setPocCadence] = useState<Record<string, POCCadenceItem>>(
    JSON.parse(JSON.stringify(INITIAL_POC_CADENCE))
  )
  const [configLoaded, setConfigLoaded] = useState(false)
  const initialLoadDone = useRef(false)

  // Refs to always have latest state for async saves
  const clustersRef = useRef(clusters)
  const impactAreasRef = useRef(impactAreas)
  useEffect(() => { clustersRef.current = clusters }, [clusters])
  useEffect(() => { impactAreasRef.current = impactAreas }, [impactAreas])

  // ── Load config from Supabase when authenticated ───────────────────
  useEffect(() => {
    if (initialLoadDone.current) return
    if (!isAuthenticated) return
    initialLoadDone.current = true

    let retryCount = 0
    const maxRetries = 3

    function attemptLoad() {
      loadAllConfig()
        .then((cfg) => {
          // Always apply DB config -- no fallback to hardcoded constants
          setClusters(cfg.clusters)
          clustersRef.current = cfg.clusters
          setImpactAreas(cfg.impactAreas)
          impactAreasRef.current = cfg.impactAreas
          setStrategicObjectives(cfg.strategicObjectives)
          setChecklistTemplate(cfg.checklistTemplate)
          setActionCategories(cfg.actionCategories)
          setConfigLoaded(true)
        })
        .catch((err) => {
          console.error("Failed to load config:", err)
          retryCount++
          if (retryCount <= maxRetries) {
            console.log(`Retrying config load (attempt ${retryCount}/${maxRetries})...`)
            setTimeout(attemptLoad, retryCount * 2000)
          }
        })
    }

    attemptLoad()
  }, [isAuthenticated])

  // Debounced cluster save to handle rapid setClusters + setImpactAreas calls
  const clusterSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const configLoadedRef = useRef(false)
  useEffect(() => { configLoadedRef.current = configLoaded }, [configLoaded])

  function scheduleClusterSave() {
    if (!configLoadedRef.current) return // Never save before config is loaded from DB
    if (clusterSaveTimer.current) clearTimeout(clusterSaveTimer.current)
    clusterSaveTimer.current = setTimeout(() => {
      saveClusters(clustersRef.current, impactAreasRef.current).catch((err) =>
        console.error("Failed to save clusters:", err)
      )
    }, 100)
  }

  // ── Persisting wrappers ─────────────────────────────────
  // IMPORTANT: These only save to DB AFTER config has been loaded from Supabase.
  // This prevents empty initial state from overwriting real DB data.
  const persistClusters = useCallback(
    (newClusters: string[]) => {
      setClusters(newClusters)
      clustersRef.current = newClusters
      scheduleClusterSave()
    },
    []
  )

  const persistImpactAreas = useCallback(
    (newAreas: Record<string, string[]>) => {
      setImpactAreas(newAreas)
      impactAreasRef.current = newAreas
      scheduleClusterSave()
    },
    []
  )

  const persistStrategicObjectives = useCallback(
    (newObjectives: StrategicObjective[]) => {
      setStrategicObjectives(newObjectives)
      if (!configLoadedRef.current) return // Guard: don't overwrite DB before load
      saveStrategicObjectives(newObjectives).catch((err) =>
        console.error("Failed to save strategic objectives:", err)
      )
    },
    []
  )

  const persistChecklistTemplate = useCallback(
    (newTemplate: ChecklistSection[]) => {
      setChecklistTemplate(newTemplate)
      if (!configLoadedRef.current) return
      saveChecklistTemplate(newTemplate).catch((err) =>
        console.error("Failed to save checklist template:", err)
      )
    },
    []
  )

  const persistActionCategories = useCallback(
    (newCategories: ActionCategoryItem[]) => {
      setActionCategories(newCategories)
      if (!configLoadedRef.current) return
      saveActionCategories(newCategories).catch((err) =>
        console.error("Failed to save action categories:", err)
      )
    },
    []
  )

  const addAuditEntry = useCallback(
    (entry: Omit<AuditEntry, "id" | "timestamp">) => {
      const newEntry: AuditEntry = {
        ...entry,
        id: `au${++_auditId}`,
        timestamp: new Date().toISOString(),
      }
      setAuditLog((prev) => [newEntry, ...prev])
      persistEntity("audit", "insert", newEntry as unknown as Record<string, unknown>)
    },
    []
  )

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>) => {
      const lastUpdated = new Date().toISOString().split("T")[0]
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ...updates, lastUpdated } : p
        )
      )
      persistEntity("project", "upsert", { id, ...updates, lastUpdated } as unknown as Record<string, unknown>)
      invalidateDashboard()
      invalidatePortfolio()
      invalidateProjectDetail(id)
    },
    [invalidateDashboard, invalidatePortfolio, invalidateProjectDetail]
  )

  const addProject = useCallback((project: Project) => {
    setProjects((prev) => [...prev, project])
    persistEntity("project", "upsert", project as unknown as Record<string, unknown>)
    invalidateDashboard()
    invalidatePortfolio()
  }, [invalidateDashboard, invalidatePortfolio])

  const addAction = useCallback((action: Action) => {
    setActions((prev) => [...prev, action])
    persistEntity("action", "insert", action as unknown as Record<string, unknown>)
    invalidateDashboard()
    invalidatePortfolio()
    invalidateProjectDetail(action.projectId)
  }, [invalidateDashboard, invalidatePortfolio, invalidateProjectDetail])

  const updateAction = useCallback((id: string, updates: Partial<Action>) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)))
    persistEntity("action", "update", { id, ...updates } as unknown as Record<string, unknown>)
    invalidateDashboard()
    invalidatePortfolio()
    // Invalidate project detail if projectId is available in updates
    if (updates.projectId) {
      invalidateProjectDetail(updates.projectId)
    }
  }, [invalidateDashboard, invalidatePortfolio, invalidateProjectDetail])

  const addReview = useCallback((review: POCReview) => {
    setReviews((prev) => [...prev, review])
    persistEntity("review", "insert", review as unknown as Record<string, unknown>)
    invalidateDashboard()
    invalidatePortfolio()
    invalidateProjectDetail(review.projectId)
  }, [invalidateDashboard, invalidatePortfolio, invalidateProjectDetail])

  const updateReview = useCallback((id: string, updates: Partial<POCReview>) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    persistEntity("review", "update", { id, ...updates } as unknown as Record<string, unknown>)
    invalidateDashboard()
    invalidatePortfolio()
    if (updates.projectId) {
      invalidateProjectDetail(updates.projectId)
    }
  }, [invalidateDashboard, invalidatePortfolio, invalidateProjectDetail])

  const addKDADecision = useCallback((decision: KDADecision) => {
    setKDADecisions((prev) => [...prev, decision])
    persistEntity("kda", "insert", decision as unknown as Record<string, unknown>)
    invalidateProjectDetail(decision.projectId)
  }, [invalidateProjectDetail])

  const addRisk = useCallback((risk: RiskIssue) => {
    setRisks((prev) => [...prev, risk])
    persistEntity("risk", "insert", risk as unknown as Record<string, unknown>)
    invalidateProjectDetail(risk.projectId)
  }, [invalidateProjectDetail])

  const updateRisk = useCallback((id: string, updates: Partial<RiskIssue>) => {
    setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    persistEntity("risk", "update", { id, ...updates } as unknown as Record<string, unknown>)
    if (updates.projectId) {
      invalidateProjectDetail(updates.projectId)
    }
  }, [invalidateProjectDetail])

  const addSession = useCallback((session: POCSession) => {
    setSessions((prev) => [...prev, session])
    persistEntity("session", "insert", session as unknown as Record<string, unknown>)
    invalidateDashboard()
    invalidatePortfolio()
  }, [invalidateDashboard, invalidatePortfolio])

  const updateSession = useCallback((id: string, updates: Partial<POCSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    persistEntity("session", "update", { id, ...updates } as unknown as Record<string, unknown>)
    invalidateDashboard()
    invalidatePortfolio()
  }, [invalidateDashboard, invalidatePortfolio])

  const deleteSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ entity: "session", action: "delete", data: { id } }),
      })
      if (!res.ok) {
        return false
      }
      setSessions((prev) => prev.filter((s) => s.id !== id))
      invalidateDashboard()
      invalidatePortfolio()
      return true
    } catch {
      return false
    }
  }, [invalidateDashboard, invalidatePortfolio])

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ entity: "project", action: "delete", data: { id } }),
      })
      if (!res.ok) {
        return false
      }
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setPortfolioProjects((prev) => prev ? prev.filter((p) => p.id !== id) : prev)
      invalidateDashboard()
      invalidatePortfolio()
      return true
    } catch {
      return false
    }
  }, [invalidateDashboard, invalidatePortfolio])

  const getProjectById = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  )
  const getReviewsForProject = useCallback(
    (projectId: string) =>
      reviews.filter((r) => r.projectId === projectId).sort((a, b) => b.reviewDate.localeCompare(a.reviewDate)),
    [reviews]
  )
  const getActionsForProject = useCallback(
    (projectId: string) => actions.filter((a) => a.projectId === projectId),
    [actions]
  )
  const getKDAForProject = useCallback(
    (projectId: string) => kdaDecisions.filter((k) => k.projectId === projectId),
    [kdaDecisions]
  )
  const getAuditForProject = useCallback(
    (projectId: string) =>
      auditLog
        .filter((a) => a.projectId === projectId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [auditLog]
  )
  const getRisksForProject = useCallback(
    (projectId: string) => risks.filter((r) => r.projectId === projectId),
    [risks]
  )

  return (
    <DataContext.Provider
      value={{
        projects,
        reviews,
        actions,
        kdaDecisions,
        auditLog,
        risks,
        sessions,
        dataLoaded,
        // Per-page state (new)
        dashboardSummary,
        loadDashboard,
        portfolioProjects,
        portfolioActionSummaries,
        portfolioReviewSummaries,
        loadPortfolio,
        projectDetailCache,
        loadProjectDetail,
        sessionsData,
        loadSessions,
        loadSessionDetail: loadSessionDetailFn,
        auditPageCache,
        loadAuditPage: loadAuditPageFn,
        // Loading and error states
        loadingStates,
        errors,
        retry: retryFn,
        // Cache invalidation
        invalidateDashboard,
        invalidatePortfolio,
        invalidateProjectDetail,
        // Config
        clusters,
        impactAreas,
        strategicObjectives,
        checklistTemplate,
        actionCategories,
        classificationThresholds,
        pocCadence,
        configLoaded,
        updateProject,
        addProject,
        addAction,
        updateAction,
        addReview,
        updateReview,
        addKDADecision,
        addRisk,
        updateRisk,
        addSession,
        updateSession,
        deleteSession,
        deleteProject,
        addAuditEntry,
        getProjectById,
        getReviewsForProject,
        getActionsForProject,
        getKDAForProject,
        getAuditForProject,
        getRisksForProject,
        setClusters: persistClusters,
        setImpactAreas: persistImpactAreas,
        setStrategicObjectives: persistStrategicObjectives,
        setChecklistTemplate: persistChecklistTemplate,
        setActionCategories: persistActionCategories,
        setClassificationThresholds,
        setPocCadence,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

