import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/epu_logo.png';
import { useLanguage } from '../context/LanguageContext';
import { Sun, Moon, Globe, Menu, X, Wind, ShieldAlert, Compass, Calendar, Info } from 'lucide-react';

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  currentUser?: { name: string; email: string } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  currentUser,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // 'home' ứng với path gốc "/", các trang khác lấy tên từ path (bỏ dấu "/")
  const activePage = location.pathname === '/' ? 'home' : location.pathname.replace('/', '');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', path: '/', labelKey: 'nav.home', icon: Wind },
    { id: 'maps', path: '/maps', labelKey: 'nav.maps', icon: Compass },
    { id: 'forecast', path: '/forecast', labelKey: 'nav.forecast', icon: Calendar },
    { id: 'alerts', path: '/alerts', labelKey: 'nav.alerts', icon: ShieldAlert },
    { id: 'about', path: '/about', labelKey: 'nav.about', icon: Info },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      id="main-header"
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${isScrolled
        ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-xs'
        : 'bg-transparent border-b border-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Brand Logo - Cột trái */}
        <div
          onClick={() => handleNavClick('/')}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0 justify-self-start"
        >
          <img
            src={logoImg}
            alt="Air VN"
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-sky-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Air
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-orange-500 text-white">
                VN
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links - Cột giữa (Capsule mờ bo tròn hoàn toàn) */}
        <nav className="hidden lg:flex items-center justify-center p-1 rounded-full bg-white/60 dark:bg-slate-900/ backdrop-blur-md border border-slate-200/70 dark:border-slate-800/70 shadow-xs gap-1 justify-self-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`flex items-center justify-center gap-2 px-3.5 xl:px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${isActive
                  ? 'bg-slate-100 dark:bg-slate-800 text-orange-500 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                  }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Right Controls - Cột phải (Tối giản, không viền, không nền riêng) */}
        <div className="hidden lg:flex items-center justify-end gap-1.5 justify-self-end">
          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            title="Đổi ngôn ngữ / Change Language"
          >
            <Globe className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="whitespace-nowrap">{lang.toUpperCase()}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Mobile Hamburger Button & Controls */}
        <div className="flex lg:hidden items-center justify-end gap-1 justify-self-end">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleLang}
            className="px-2 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer"
          >
            {lang.toUpperCase()}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-6 space-y-2 shadow-2xl animate-in slide-in-from-top duration-200">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer ${isActive
                    ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>

        </div>
      )}
    </header>
  );
};
