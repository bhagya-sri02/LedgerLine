import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Shield, BookOpen, Layers, Menu } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export const Navbar = ({ title, onToggleSidebar }) => {
  const { user, logout, isAdmin, isAuditor } = useAuth();

  const getRoleBadge = () => {
    if (isAdmin) return <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">ADMIN</span>;
    if (isAuditor) return <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-200">AUDITOR</span>;
    return <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">ACCOUNT HOLDER</span>;
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-slate-800">{title || 'Dashboard'}</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Role badge */}
        <div className="hidden sm:flex items-center">
          {getRoleBadge()}
        </div>

        {/* User profile dropdown / info */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-xs">
            {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="hidden md:block text-left text-xs">
            <p className="font-semibold text-slate-800">{user?.username}</p>
            <p className="text-slate-500 truncate max-w-[140px]">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
