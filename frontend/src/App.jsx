import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import TravelMap from './components/TravelMap';
import Login from './pages/Login';
import Register from './pages/Register';
import Journal from './pages/Journal';
import Rallies from './pages/Rallies';
import Community from './pages/Community';
import Garage from './pages/Garage';
import Expenses from './pages/Expenses';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-emerald-primary border-t-transparent rounded-full" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-emerald-primary border-t-transparent rounded-full" /></div>;
  const isAdmin = user?.role && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(user.role);
  return isAdmin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={
        <PrivateRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<TravelMap />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/rallies" element={<Rallies />} />
              <Route path="/community" element={<Community />} />
              <Route path="/garage" element={<Garage />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            </Routes>
          </Layout>
        </PrivateRoute>
      } />
    </Routes>
  );
}
