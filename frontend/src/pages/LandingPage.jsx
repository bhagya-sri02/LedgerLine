import React from 'react';
import { Link } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">LedgerLine</span>
              <span className="block text-[10px] font-mono tracking-widest text-blue-400 uppercase">Core Banking Ledger</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center space-x-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Snovasys Fresher Hiring Challenge 2026 Core Ledger</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.15]">
            Enterprise-Grade <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">Double-Entry Financial</span> Engine
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Engineered with strict mathematical double-entry invariants, deterministic pessimistic row locking, database-level append-only immutability, and authoritative idempotency.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-blue-600/25 transition flex items-center justify-center space-x-2"
            >
              <span>Open an Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700/80 text-slate-200 font-semibold rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
            >
              <span>Sign In with Demo Credentials</span>
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <span className="text-xs font-mono text-blue-400 font-semibold">∑ DR = ∑ CR</span>
              <p className="text-xl font-bold text-white mt-1">100% Balanced</p>
              <p className="text-xs text-slate-400 mt-1">Zero-sum posting invariant</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <span className="text-xs font-mono text-emerald-400 font-semibold">PESSIMISTIC_WRITE</span>
              <p className="text-xl font-bold text-white mt-1">Deadlock-Free</p>
              <p className="text-xs text-slate-400 mt-1">Ascending primary key locks</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <span className="text-xs font-mono text-purple-400 font-semibold">APPEND-ONLY</span>
              <p className="text-xl font-bold text-white mt-1">MySQL Triggers</p>
              <p className="text-xs text-slate-400 mt-1">Immutable posted ledger</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 p-5 rounded-2xl backdrop-blur">
              <span className="text-xs font-mono text-amber-400 font-semibold">IDEMPOTENCY</span>
              <p className="text-xl font-bold text-white mt-1">Zero Duplication</p>
              <p className="text-xs text-slate-400 mt-1">SHA-256 payload cache</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 bg-slate-950/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">Bank-Grade Architectural Pillars</h2>
            <p className="text-slate-400 mt-3 text-sm">
              Built according to standard accounting principles where customer accounts are treated as Liability obligations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 border border-slate-800 p-7 rounded-2xl hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-5">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Double-Entry Ledger</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every transaction inserts at least two ledger entries. Balance updates and journal postings occur within the same atomic database transaction.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-7 rounded-2xl hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-5">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pessimistic Concurrency</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sorts accounts in ascending ID order before row locking, eliminating circular wait deadlocks during concurrent opposite transfers.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-7 rounded-2xl hover:border-slate-700 transition">
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Immutable Audit Trails</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Database-level triggers enforce append-only guarantees. Any direct SQL attempts to alter or delete posted entries are aborted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 LedgerLine. Snovasys Fresher Hiring Challenge 2026 Submission.</p>
          <div className="flex items-center space-x-6">
            <span className="font-mono text-slate-400">Java 21 | Spring Boot 3.3.5 | MySQL 8 | React</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
