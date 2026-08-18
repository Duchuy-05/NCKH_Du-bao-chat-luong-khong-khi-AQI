import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Wind, Mail, Phone, MapPin, Send, CheckCircle2, Shield, FileText, ArrowRight, Heart } from 'lucide-react';

interface FooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const navigate = useNavigate();
  const setActivePage = (page: string) => {
    navigate(page === 'home' ? '/' : `/${page}`);
  };
  const { lang, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setIsSubscribed(true);
    setTimeout(() => {
      setEmail('');
    }, 4000);
  };

  return (
    <footer
      id="main-footer"
      className="w-full bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-16 pb-12 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/60">
          {/* Brand & About Column */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={() => {
                setActivePage('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-sky-500 flex items-center justify-center text-white shadow-md">
                <Wind className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white">AirVision</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-orange-500 text-white">VN</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              {t('footer.about')}
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>{t('footer.address')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{t('footer.hotline')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t('footer.email')}</span>
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t('footer.quick_links')}
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => {
                    setActivePage('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>{t('nav.home')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActivePage('maps');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>{t('nav.maps')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActivePage('forecast');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>{t('nav.forecast')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActivePage('alerts');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>{t('nav.alerts')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActivePage('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3 text-slate-600" />
                  <span>{t('nav.about')}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Legal and Standards Column */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {lang === 'vi' ? 'Tiêu chuẩn & Pháp lý' : 'Standards & Legal'}
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={onOpenTerms}
                  className="hover:text-sky-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('footer.terms')}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenPrivacy}
                  className="hover:text-sky-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('footer.privacy')}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              {t('footer.newsletter_title')}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.newsletter_desc')}
            </p>

            {isSubscribed ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t('footer.newsletter_success')}</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('footer.newsletter_placeholder')}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
                >
                  <span>{t('footer.newsletter_btn')}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{t('footer.rights')}</p>
          <div className="flex items-center gap-4">
            <button onClick={onOpenTerms} className="hover:text-slate-300 transition-colors cursor-pointer">
              {t('footer.terms')}
            </button>
            <span>•</span>
            <button onClick={onOpenPrivacy} className="hover:text-slate-300 transition-colors cursor-pointer">
              {t('footer.privacy')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
