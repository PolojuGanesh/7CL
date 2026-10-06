import { useEffect } from "react";
import AuctionBoard from "./components/AuctionBoard.jsx";
import Features from "./components/Features.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import LeagueStats from "./components/LeagueStats.jsx";
import LoginPage from "./components/auth/LoginPage.jsx";
import RegisterPage from "./components/auth/RegisterPage.jsx";
import LiveAuctionPage from "./components/auction/LiveAuctionPage.jsx";
import { RoomProvider } from "./contexts/RoomContext.jsx";
import { useAuth } from "./contexts/useAuth.js";
import { RoomProviderStatus } from "./components/auction/RoomProviderStatus.jsx";
import {
  HistoryPage,
  LeaderboardPage,
  OverviewPage,
  PlayersPage,
  SettingsPage,
  TeamPage,
} from "./components/auction/RoomPages.jsx";
import "./App.css";

function RedirectTo({ path }) {
  useEffect(() => {
    window.location.replace(path);
  }, [path]);

  return <RoomProviderStatus message="Redirecting…" />;
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const { user, loading, sessionError } = useAuth();

  if (loading)
    return <RoomProviderStatus message="Checking your 7CL session…" />;
  if (sessionError)
    return (
      <RoomProviderStatus
        message={`Could not connect to 7CL: ${sessionError}`}
        action={
          <button
            className="button button-gold"
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        }
      />
    );

  const isAuthenticationPage = path === "/login" || path === "/register";
  if (user && isAuthenticationPage) return <RedirectTo path="/overview" />;
  if (!user && !isAuthenticationPage && path !== "/") return <RedirectTo path="/login" />;

  if (path === "/login") return <LoginPage />;
  if (path === "/register") return <RegisterPage />;

  if (path === "/")
    return (
      <main>
        <Header />
        <Hero />
        <LeagueStats />
        <Features />
        <HowItWorks />
        <AuctionBoard />
        <Footer />
      </main>
    );

  return (
    <RoomProvider>
      {path === "/auction" && <LiveAuctionPage />}
      {path === "/overview" && <OverviewPage />}
      {path === "/team" && <TeamPage />}
      {path === "/players" && <PlayersPage />}
      {path === "/leaderboard" && <LeaderboardPage />}
      {path === "/history" && <HistoryPage />}
      {path === "/settings" && <SettingsPage />}
      {![
        "/auction",
        "/overview",
        "/team",
        "/players",
        "/leaderboard",
        "/history",
        "/settings",
      ].includes(path) && (
        <RoomProviderStatus
          message="Page not found."
          action={
            <a className="button button-gold" href="/overview">
              Go to dashboard
            </a>
          }
        />
      )}
    </RoomProvider>
  );
}

export default App;
