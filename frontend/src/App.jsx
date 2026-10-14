import React, { useState } from 'react';
import { Logo } from './components/Logo';
import { LoginForm } from './components/LoginForm';
import { MemoryVisualPanel } from './components/MemoryVisualPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { Button } from './components/Button';
import { ArrowLeft, UserPlus, ShieldCheck } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Dashboard } from './pages/Dashboard';

function AppContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentView, setCurrentView] = useState('login');

  if (currentView === 'dashboard') {
    return <Dashboard onSignOut={() => setCurrentView('login')} />;
  }


  return (
    <div className={`min-h-screen flex flex-col justify-between selection:bg-[#ffb72b] selection:text-[#1a2c35] transition-colors duration-300 relative overflow-hidden
      ${
        isDark 
          ? 'bg-[#062024] text-white' 
          : 'bg-[#ffb72b] text-[#1a2c35]'
      }
    `}>
      {/* Cartoon Background Waves / Contours */}
      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-30 overflow-hidden">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M 0,30 Q 300,70 600,20 T 1200,40 L 1200,0 L 0,0 Z"
            fill={isDark ? '#021012' : '#ffffff'}
          />
        </svg>
      </div>

      {/* Top Header Navigation bar */}
      <header className="w-full px-6 py-3 max-w-7xl mx-auto flex items-center justify-between relative z-20">
        <Logo size="md" />

        <div className="flex items-center gap-4">
          {/* Chunky Top CTA like "Let's Go" in Chunky Duck */}
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="hidden sm:inline-flex items-center justify-center font-chunky font-black px-5 py-2 rounded-2xl btn-3d-yellow text-sm cursor-pointer"
          >
            Explore Vault
          </button>

          {/* Chunky Duck vertical slider Theme toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-4 lg:p-6 relative z-10 animate-page-enter">
        <div className="w-full max-w-6xl mx-auto">
          {currentView !== 'register' ? (
            /* Split Screen 3D Card Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch animate-page-enter">
              {/* Left Column: Visual Map / Memory World */}
              <div className="lg:col-span-6 flex flex-col order-2 lg:order-1">
                <MemoryVisualPanel />
              </div>

              {/* Right Column: Chunky 3D Login Card */}
              <div className="lg:col-span-6 flex flex-col justify-center order-1 lg:order-2">
                <div className={`rounded-3xl p-5 sm:p-7 border-4 border-[#1a2c35] transition-all duration-300
                  ${
                    isDark
                      ? 'bg-[#0d292e] shadow-[0_12px_0_0_#041a1d,0_12px_0_4px_#1a2c35]'
                      : 'bg-white shadow-[0_12px_0_0_#a35d10,0_12px_0_4px_#1a2c35]'
                  }
                `}>
                  {/* Card Title & Chunky Headline */}
                  <div className="mb-5">
                    <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-chunky uppercase leading-none ${isDark ? 'text-white' : 'text-[#1a2c35]'}`}>
                      Stay Curious. <br />
                      <span className={isDark ? 'text-[#ffb72b]' : 'text-[#02a896]'}>Go Further.</span>
                    </h1>
                    <p className={`text-xs sm:text-sm font-semibold mt-2 ${isDark ? 'text-neutral-300' : 'text-[#1a2c35]/80'}`}>
                      Bold creativity for your personal geographic memory vault.
                    </p>
                  </div>

                  {/* Login Form Component */}
                  <LoginForm 
                    onNavigateRegister={() => setCurrentView('register')}
                    onLoginSuccess={() => setCurrentView('dashboard')}
                  />

                  {/* Trust Footer */}
                  <div className={`mt-4 flex items-center justify-center gap-2 text-xs font-bold ${isDark ? 'text-neutral-400' : 'text-[#1a2c35]/60'}`}>
                    <ShieldCheck className="w-4 h-4 text-[#02a896] dark:text-[#ffb72b]" />
                    <span>End-to-end encrypted geographic vault</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Placeholder Registration Page with Chunky 3D look */
            <div className={`max-w-xl mx-auto rounded-3xl p-8 sm:p-12 border-4 border-[#1a2c35] text-center animate-fadeIn
              ${
                isDark
                  ? 'bg-[#0d292e] shadow-[0_12px_0_0_#041a1d,0_12px_0_4px_#1a2c35]'
                  : 'bg-white shadow-[0_12px_0_0_#a35d10,0_12px_0_4px_#1a2c35]'
              }
            `}>
              <div className="w-18 h-18 bg-[#ffb72b] rounded-3xl border-3 border-[#1a2c35] shadow-[0_6px_0_0_#a35d10,0_6px_0_3px_#1a2c35] mx-auto flex items-center justify-center mb-6">
                <UserPlus className="w-9 h-9 text-[#1a2c35]" />
              </div>

              <h2 className={`text-3xl sm:text-4xl font-black font-chunky uppercase mb-3 ${isDark ? 'text-white' : 'text-[#1a2c35]'}`}>
                Create your Vault Account
              </h2>
              <p className={`text-sm sm:text-base font-semibold mb-8 ${isDark ? 'text-neutral-300' : 'text-[#1a2c35]/80'}`}>
                Registration flow ready for FastAPI authentication. Return to test the sign-in experience.
              </p>

              <div className="p-4 rounded-2xl border-3 border-[#1a2c35] bg-[#fffae8] text-[#1a2c35] text-sm font-bold shadow-[0_4px_0_0_#e2d7c5] mb-8">
                💡 <span className="font-black">Next Milestone:</span> FastAPI User Signup, OAuth2 JWT token authentication, and email verification.
              </div>

              <Button
                variant={isDark ? 'yellow' : 'teal'}
                size="md"
                onClick={() => setCurrentView('login')}
                className="w-full"
              >
                <span className="flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5 stroke-3" />
                  <span>Back to Sign In</span>
                </span>
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer with playful Chunky styling */}
      <footer className="w-full py-3 px-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs font-bold gap-3 relative z-20">
        <div className={isDark ? 'text-neutral-400' : 'text-[#1a2c35]/80'}>
          © {new Date().getFullYear()} Map Your Memories. Bold creativity. Intelligent performance.
        </div>
        <div className="flex items-center gap-6">
          <span className="hover:underline transition-colors cursor-pointer">Privacy Map</span>
          <span className="hover:underline transition-colors cursor-pointer">Security Protocol</span>
          <span className="hover:underline transition-colors cursor-pointer">Help Center</span>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
