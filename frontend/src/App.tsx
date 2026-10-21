import { Suspense, lazy, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { TermsModal } from "./components/TermsModal";
import { PrivacyModal } from "./components/PrivacyModal";

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
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-page)] text-[var(--text-primary)] transition-colors">
      {/* Top sticky Navigation Header */}
      <Header />

      {/* Main Page Body - chỉ route khớp URL mới được render */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <Home />
              }
            />
            <Route path="/maps" element={<Maps />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/alerts" element={<HealthAlerts />} />
            <Route path="/about" element={<AboutUs />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <Footer onOpenTerms={() => setIsTermsOpen(true)} onOpenPrivacy={() => setIsPrivacyOpen(true)} />

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <MainApp />
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
