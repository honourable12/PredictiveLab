import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Database, Brain, User, LogOut } from 'lucide-react';

function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <nav className="bg-white w-64 min-h-screen p-4 shadow-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-indigo-600">ML Platform</h1>
        </div>
        <ul className="space-y-2">
          <li>
            <Link to="/app/dashboard" className="flex items-center p-2 text-gray-700 hover:bg-indigo-50 rounded-lg">
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/app/datasets" className="flex items-center p-2 text-gray-700 hover:bg-indigo-50 rounded-lg">
              <Database className="w-5 h-5 mr-3" />
              Datasets
            </Link>
          </li>
          <li>
            <Link to="/app/models" className="flex items-center p-2 text-gray-700 hover:bg-indigo-50 rounded-lg">
              <Brain className="w-5 h-5 mr-3" />
              Models
            </Link>
          </li>
          <li>
            <Link to="/app/profile" className="flex items-center p-2 text-gray-700 hover:bg-indigo-50 rounded-lg">
              <User className="w-5 h-5 mr-3" />
              Profile
            </Link>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center w-full p-2 text-gray-700 hover:bg-indigo-50 rounded-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </li>
        </ul>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;