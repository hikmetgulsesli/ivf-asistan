import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  Video,
  Settings,
  Database,
  LogOut,
  Sun,
  Moon,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  onLogout: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/articles', icon: FileText, label: 'Articles' },
  { to: '/faqs', icon: HelpCircle, label: 'FAQs' },
  { to: '/videos', icon: Video, label: 'Videos' },
  { to: '/cache', icon: Database, label: 'Cache' },
  { to: '/chat-test', icon: MessageSquare, label: 'Chat Test' },
  { to: '/api-docs', icon: BookOpen, label: 'API Docs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ onLogout }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-64 h-screen bg-[var(--card)] border-r border-[var(--border)] flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
            IVF Asistan
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Admin Panel</p>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors duration-150"
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text)] hover:bg-[var(--surface)]'
              }`
            }
            end={item.to === '/'}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border)]">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
