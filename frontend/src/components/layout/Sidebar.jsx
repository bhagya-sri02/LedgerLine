import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Send,
  History,
  ShieldAlert,
  Scale,
  Sparkles,
  Database,
  X,
} from 'lucide-react';

export const Sidebar = ({ isOpenMobile, onCloseMobile }) => {
  const { isAdmin, isAuditor, isAccountHolder } = useAuth();

  const navItemClass = ({ isActive }) =>
    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-semibold'
        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
    }`;

  return (
    <aside
      className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed lg:sticky top-0 z-40 shrink-0 select-none transition-transform duration-200 ease-in-out ${
        isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div>
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
          <NavLink to="/" onClick={onCloseMobile} className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">LedgerLine</span>
              <span className="block text-[10px] font-mono tracking-wider text-blue-400 uppercase -mt-1">Core Ledger</span>
            </div>
          </NavLink>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
              title="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-5 space-y-6">
          {/* Account Holder Navigation */}
          {(!isAdmin && !isAuditor || isAccountHolder) && (
            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Banking</p>
              <nav className="space-y-1">
                <NavLink to="/dashboard" className={navItemClass}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink to="/accounts" className={navItemClass}>
                  <Wallet className="w-4 h-4" />
                  <span>My Accounts</span>
                </NavLink>
                <NavLink to="/deposit" className={navItemClass}>
                  <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                  <span>Deposit Funds</span>
                </NavLink>
                <NavLink to="/withdraw" className={navItemClass}>
                  <ArrowUpCircle className="w-4 h-4 text-amber-400" />
                  <span>Withdraw Funds</span>
                </NavLink>
                <NavLink to="/transfer" className={navItemClass}>
                  <Send className="w-4 h-4 text-blue-400" />
                  <span>Transfer Funds</span>
                </NavLink>
                <NavLink to="/transactions" className={navItemClass}>
                  <History className="w-4 h-4" />
                  <span>Transactions</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Admin Navigation */}
          {isAdmin && (
            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Administration</p>
              <nav className="space-y-1">
                <NavLink to="/admin" className={navItemClass}>
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <span>Admin Console</span>
                </NavLink>
              </nav>
            </div>
          )}

          {/* Auditor Navigation */}
          {isAuditor && (
            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Auditor Controls</p>
              <nav className="space-y-1">
                <NavLink to="/auditor" className={navItemClass}>
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>Auditor & Reconcile</span>
                </NavLink>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-800 flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="text-xs">
            <p className="text-slate-300 font-medium">Core Ledger Engine</p>
            <p className="text-[11px] font-mono text-slate-400">MySQL 8 | Double-Entry</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
