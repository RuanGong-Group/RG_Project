/**
 * 应用主组件
 */

import { createBrowserRouter, RouterProvider, RouteObject, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import TodayPlan from './pages/TodayPlan';
import SessionLearning from './pages/SessionLearning';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import BookWordsTest from './pages/BookWordsTest';
import BookDetail from './pages/BookDetail';
import VideoPlayerPage from './pages/VideoPlayerPage';
import OAuthCallback from './pages/OAuthCallback';

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/oauth/callback', element: <OAuthCallback /> },
  { path: '/', element: <ProtectedRoute><Home /></ProtectedRoute> },
  { path: '/today-plan', element: <ProtectedRoute><TodayPlan /></ProtectedRoute> },
  { path: '/learn', element: <ProtectedRoute><SessionLearning /></ProtectedRoute> }, // 重定向旧路由到新组件
  { path: '/session-learn', element: <ProtectedRoute><SessionLearning /></ProtectedRoute> },
  { path: '/stats', element: <ProtectedRoute><Stats /></ProtectedRoute> },
  { path: '/settings', element: <ProtectedRoute><Settings /></ProtectedRoute> },
  { path: '/books/:bookId', element: <ProtectedRoute><BookDetail /></ProtectedRoute> },
  { path: '/test-shuffle', element: <ProtectedRoute><BookWordsTest /></ProtectedRoute> },
  { path: '/daily-video', element: <ProtectedRoute><VideoPlayerPage /></ProtectedRoute> },
];

const router = createBrowserRouter(routes, {
  future: {
    v7_relativeSplatPath: true,
  },
});

export default function App() {
  return <RouterProvider router={router} />;
}
