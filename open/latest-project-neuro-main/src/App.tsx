import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FluidBackground from './components/FluidBackground';
import BottomNavigation from './components/BottomNavigation';
import LandingPage from './pages/LandingPage';
import AudioPage from './pages/AudioPage';
import SummaryPage from './pages/SummaryPage';
import GraphPage from './pages/GraphPage';
import ChatPage from './pages/ChatPage';
import MemoryPage from './pages/MemoryPage';
import VoiceCallPage from './pages/VoiceCallPage';

function App() {
  return (
    <Router>
      <div className="relative w-screen min-h-screen overflow-x-hidden bg-gradient-to-br from-[#081F5C] via-[#0B0E11] to-[#000000]">
        <Routes>
          <Route path="/" element={
            <>
              <FluidBackground />
              <LandingPage />
            </>
          } />
          <Route path="/audio" element={<AudioPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/voice-call" element={<VoiceCallPage />} />
        </Routes>
        
        <BottomNavigation />
      </div>
    </Router>
  );
}

export default App;