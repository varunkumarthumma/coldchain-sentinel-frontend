import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { CommodityProfilesPage } from './pages/CommodityProfilesPage';
import { SensorsPage } from './pages/SensorsPage';
import { AlertsPage } from './pages/AlertsPage';
import { RiskAssessmentPage } from './pages/RiskAssessmentPage';

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
        {/* Left Enterprise Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Right Main Application Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Main Scrollable Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/facilities" element={<FacilitiesPage />} />
                <Route path="/commodity-profiles" element={<CommodityProfilesPage />} />
                <Route path="/sensors" element={<SensorsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/risk-assessment" element={<RiskAssessmentPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
