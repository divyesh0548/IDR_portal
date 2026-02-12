import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import Login from "@/pages/Login"
import SNTADashboard from "@/pages/SNTA/SNTA_dashboard"
import ChangePassword from "@/pages/ChangePassword"
import Users from "@/pages/SNTA/Users"
import ClientDashboard from "@/pages/Client/Client_Dashboard"
import ClientDocumentRequests from "@/pages/Client/ClientDocumentRequests"
import ClientDocumentDetail from "@/pages/Client/ClientDocumentDetail"
import Profile from "@/pages/Profile"
import RunMaster from "@/pages/SNTA/RunMaster"
import IDR from "@/pages/SNTA/IDR"
import IDRTable from "@/pages/SNTA/IDRTable"
import PlazaCreation from "@/pages/SNTA/PlazaCreation"
import ScopeCreation from "@/pages/SNTA/ScopeCreation"
import SubmittedRequests from "@/pages/SNTA/SubmittedRequests"
import RequestDetail from "@/pages/SNTA/RequestDetail"

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            {/* SNTA Routes */}
              <Route
                path="/snta/dashboard"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <SNTADashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/users"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/plaza-creation"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <PlazaCreation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/scope-creation"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <ScopeCreation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/run_master"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <RunMaster />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/idr"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <IDR />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/idr/table"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <IDRTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/submitted-requests"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <SubmittedRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/snta/submitted-requests/detail"
                element={
                  <ProtectedRoute requiredRole="snta">
                    <RequestDetail />
                  </ProtectedRoute>
                }
              />
            {/* Client Routes */}
              <Route
                path="/client/dashboard"
                element={
                  <ProtectedRoute requiredRole="client">
                    <ClientDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/document-requests"
                element={
                  <ProtectedRoute requiredRole="client">
                    <ClientDocumentRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/document-requests/:req_id"
                element={
                  <ProtectedRoute requiredRole="client">
                    <ClientDocumentDetail />
                  </ProtectedRoute>
                }
              />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
