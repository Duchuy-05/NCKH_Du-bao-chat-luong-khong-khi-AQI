import { Suspense, lazy, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { NotificationProvider } from "./context/NotificationContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { NotificationToast } from "./components/NotificationToast";
import { AuthModal } from "./components/AuthModal";
import { TermsModal } from "./components/TermsModal";
import { PrivacyModal } from "./components/PrivacyModal";
import { StationDetailModal } from "./components/StationDetailModal";
import type { AirStation } from "./types/airQuality.types";

// Lazy load: mỗi trang chỉ được tải (và render) khi người dùng thực sự
// truy cập route tương ứng, thay vì gộp tất cả vào 1 bundle duy nhất.
const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const Maps = lazy(() => import("./pages/Maps").then((m) => ({ default: m.Maps })));
const Forecast = lazy(() => import("./pages/Forecast").then((m) => ({ default: m.Forecast })));
const HealthAlerts = lazy(() => import("./pages/HealthAlerts").then((m) => ({ default: m.HealthAlerts })));
const AboutUs = lazy(() => import("./pages/AboutUs").then((m) => ({ default: m.AboutUs })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500">
      Đang tải trang...
    </div>
  );
}

function MainApp() {
  const navigate = useNavigate();
  const [selectedStationForModal, setSelectedStationForModal] = useState<AirStation | null>(null);

  // Auth state & modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // Legal modals
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleOpenAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLoginSuccess = (user: { name: string; email: string }) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleSelectStation = (station: AirStation) => {
    setSelectedStationForModal(station);
  };

  const goTo = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top sticky Navigation Header */}
      <Header onOpenAuth={handleOpenAuth} currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Page Body - chỉ route khớp URL mới được render */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  onSelectStation={handleSelectStation}
                  onNavigateToMaps={() => goTo("/maps")}
                  onNavigateToForecast={() => goTo("/forecast")}
                  onNavigateToAlerts={() => goTo("/alerts")}
                />
              }
            />
            <Route path="/maps" element={<Maps onSelectStation={handleSelectStation} />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/alerts" element={<HealthAlerts />} />
            <Route path="/about" element={<AboutUs />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <Footer onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} />

      {/* Dialog Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        onLoginSuccess={handleLoginSuccess}
      />

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      <StationDetailModal station={selectedStationForModal} onClose={() => setSelectedStationForModal(null)} />

      {/* Real-time Notification Toast banner */}
      <NotificationToast />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <MainApp />
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;