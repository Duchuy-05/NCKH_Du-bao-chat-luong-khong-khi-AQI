import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Sun, Moon, Globe, Menu, X, Wind, ShieldAlert, User, LogIn, Compass, Calendar, Info, MapPin } from 'lucide-react';

interface HeaderProps {
  activePage: string;
  setActivePage: (page: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  currentUser?: { name: string; email: string } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  onOpenAuth,
  currentUser,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', labelKey: 'nav.home', icon: Wind },
    { id: 'maps', labelKey: 'nav.maps', icon: Compass },
    { id: 'forecast', labelKey: 'nav.forecast', icon: Calendar },
    { id: 'alerts', labelKey: 'nav.alerts', icon: ShieldAlert },
    { id: 'about', labelKey: 'nav.about', icon: Info },
  ];

  const handleNavClick = (pageId: string) => {
    setActivePage(pageId);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-sky-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                AirVision
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-orange-500 text-white">
                VN
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              Chất lượng không khí & Thời tiết
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links - Centered & Expanded to Fill Space */}
        <nav className="hidden lg:flex items-center justify-center flex-1 max-w-3xl mx-2 gap-2 xl:gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center justify-center gap-2 px-3.5 xl:px-4 py-2 rounded-xl text-[15px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-orange-500 dark:text-orange-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400'}`} />
                <span className="whitespace-nowrap">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Right Controls */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            title="Đổi ngôn ngữ / Change Language"
          >
            <Globe className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="whitespace-nowrap">{lang.toUpperCase()}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User / Auth Buttons */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-slate-200 dark:border-slate-700 shrink-0">
              <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate whitespace-nowrap">
                {currentUser.name}
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors ml-1 whitespace-nowrap shrink-0 cursor-pointer font-semibold"
                title="Đăng xuất"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2.5 border-l border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => onOpenAuth('login')}
                className="text-xs font-bold px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 flex items-center justify-center cursor-pointer"
              >
                <span className="whitespace-nowrap">{t('nav.login')}</span>
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs hover:shadow transition-all whitespace-nowrap shrink-0 flex items-center justify-center cursor-pointer"
              >
                <span className="whitespace-nowrap">{t('nav.register')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleLang}
            className="px-2 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {lang.toUpperCase()}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium cursor-pointer ${
                    isActive
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

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {currentUser ? (
              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {currentUser.name}
                </span>
                <button
                  onClick={() => {
                    onLogout?.();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-xs text-red-500 font-semibold cursor-pointer"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('nav.login')}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                  className="w-full py-2.5 rounded-xl bg-orange-500 text-xs font-semibold text-white cursor-pointer hover:bg-orange-600"
                >
                  {t('nav.register')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
