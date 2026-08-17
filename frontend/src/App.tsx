import { useState } from "react";
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
import { Home } from "./pages/Home";
import { Maps } from "./pages/Maps";
import { Forecast } from "./pages/Forecast";
import { HealthAlerts } from "./pages/HealthAlerts";
import { AboutUs } from "./pages/AboutUs";
import type { AirStation } from "./types/airQuality.types";

function MainApp() {
  const [activePage, setActivePage] = useState<string>("home");
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top sticky Navigation Header */}
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenAuth={handleOpenAuth}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activePage === "home" && (
          <Home
            onSelectStation={handleSelectStation}
            onNavigateToMaps={() => {
              setActivePage("maps");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onNavigateToForecast={() => {
              setActivePage("forecast");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onNavigateToAlerts={() => {
              setActivePage("alerts");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {activePage === "maps" && <Maps onSelectStation={handleSelectStation} />}

        {activePage === "forecast" && <Forecast />}

        {activePage === "alerts" && <HealthAlerts />}

        {activePage === "about" && <AboutUs />}
      </main>

      {/* Footer */}
      <Footer
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        setActivePage={setActivePage}
      />

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
    <ThemeProvider>
      <LanguageProvider>
        <NotificationProvider>
          <MainApp />
        </NotificationProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
