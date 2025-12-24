import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./components/Home";
import Auth from "./components/Auth";
import MainLayout from "./components/layouts/MainLayout";
import { authService } from "./services/authService";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import "./App.css";

// Admin Components
import AdminDashboard from "./components/admin/Dashboard";
import CertificatePublish from "./components/admin/CertificatePublish";
import CertificateManage from "./components/admin/CertificateManage";
import CertificateRuleManage from "./components/admin/CertificateRuleManage";
import NFTManagement from "./components/admin/NFTManagement";
import Profile from "./components/admin/Profile";

// Student Components
import StudentDashboard from "./components/student/Dashboard";
import CertificateList from "./components/student/CertificateList";
import CertificateDetail from "./components/student/CertificateDetail";
import StudentCertificateManage from "./components/student/CertificateManage";
import CertificateReceive from "./components/student/CertificateReceive";
import CertificateMyList from "./components/student/CertificateMyList";
import PointsPersonal from "./components/student/PointsPersonal";
import PointsRanking from "./components/student/PointsRanking";
import ActivityList from "./components/student/ActivityList";
import WalletConnect from "./components/student/WalletConnect";

// Activity Admin Components
import ActivityPublish from "./components/activity_admin/ActivityPublish";
import ActivityManage from "./components/activity_admin/ActivityManage";

// 受保护的路由组件
const ProtectedRoute = ({ children, requiredRole }) => {
  const isLoggedIn = authService.isLoggedIn();
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  // 如果指定了所需角色，则检查用户角色
  if (requiredRole) {
    const currentUser = authService.getCurrentUser();
    const userRole = currentUser?.user?.role || "";

    // 管理员路由要求管理员角色
    if (requiredRole === "admin" && userRole !== "管理员" && userRole !== "admin") {
      return <Navigate to="/student/dashboard" replace />;
    }

    // 活动管理员路由要求活动管理员角色
    if (requiredRole === "activity_admin" && userRole !== "活动管理员" && userRole !== "管理员" && userRole !== "admin") {
      return <Navigate to="/student/dashboard" replace />;
    }

    // 学生路由要求学生角色
    if (requiredRole === "student") {
      // 管理员和活动管理员不能访问学生 Dashboard
      if (userRole === "管理员" || userRole === "admin") {
         return <Navigate to="/admin/dashboard" replace />;
      }
      if (userRole === "活动管理员") {
         return <Navigate to="/activity-admin/activities" replace />;
      }
    }
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />

          {/* 重定向到合适的仪表盘 */}
          <Route
            path="/dashboard"
            element={
              authService.isLoggedIn() ? (
                (() => {
                  const currentUser = authService.getCurrentUser();
                  const userRole = currentUser?.user?.role || "";
                  if (userRole === "管理员" || userRole === "admin") {
                    return <Navigate to="/admin/dashboard" replace />;
                  } else if (userRole === "活动管理员") {
                    return <Navigate to="/activity-admin/activities" replace />;
                  } else {
                    return <Navigate to="/student/dashboard" replace />;
                  }
                })()
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />

          {/* 管理员路由 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="certificate-publish" element={<CertificatePublish />} />
            <Route path="certificate-manage" element={<CertificateManage />} />
            <Route path="certificate-rule-manage" element={<CertificateRuleManage />} />
            <Route path="nft-management" element={<NFTManagement />} />
            <Route path="activities" element={<ActivityManage />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* 活动管理员路由 */}
          <Route
            path="/activity-admin"
            element={
              <ProtectedRoute requiredRole="activity_admin">
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="activities" replace />} />
            <Route path="activities" element={<ActivityManage />} />
            <Route path="activity-publish" element={<ActivityPublish />} />
            <Route path="certificate-rule-manage" element={<CertificateRuleManage />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* 学生路由 */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="certificate-receive" element={<CertificateReceive />} />
            <Route path="certificates" element={<CertificateList />} />
            <Route path="certificates/:id" element={<CertificateDetail />} />
            <Route path="certificate-my-list" element={<CertificateMyList />} />
            <Route path="certificate-manage" element={<StudentCertificateManage />} />
            <Route path="points-personal" element={<PointsPersonal />} />
            <Route path="points-ranking" element={<PointsRanking />} />
            <Route path="activities" element={<ActivityList />} />
            <Route path="wallet-connect" element={<WalletConnect />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* 404页面 */}
          <Route path="*" element={<div>页面不存在</div>} />
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

