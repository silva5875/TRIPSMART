import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageViewTracker from "@/components/PageViewTracker";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";

import Planner from "./pages/Planner";
import TravelHistory from "./pages/TravelHistory";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import ActivityDetail from "./pages/ActivityDetail";
import RouteGenerator from "./pages/RouteGenerator";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <TooltipProvider>
      <ErrorBoundary>
        <CookieConsentProvider>
          <Toaster />
          <Sonner />
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-bold">
            Pular para o conteúdo principal
          </a>
          <BrowserRouter>
            <AuthProvider>
              <PageViewTracker />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/redefinir-senha" element={<ResetPassword />} />

                <Route path="/planejar" element={<Planner />} />
                <Route path="/historico" element={<TravelHistory />} />
                <Route path="/comunidade" element={<Community />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/atividade/:cityId/:spotId" element={<ActivityDetail />} />
                <Route path="/gerador" element={<RouteGenerator />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
          <CookieConsentBanner />
        </CookieConsentProvider>
      </ErrorBoundary>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
