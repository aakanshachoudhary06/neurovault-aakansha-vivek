import React from 'react';
import PremiumHero from '../components/PremiumHero';
import VoiceMemoryEngine from '../components/VoiceMemoryEngine';
import HowItWorks from '../components/HowItWorks';
import SmartAIAgent from '../components/SmartAIAgent';
import AccessAnywhere from '../components/AccessAnywhere';
import FinalCTA from '../components/FinalCTA';

export default function LandingPage() {
  return (
    <main className="relative z-10">
      <PremiumHero />
      <VoiceMemoryEngine />
      <HowItWorks />
      <SmartAIAgent />
      <AccessAnywhere />
      <FinalCTA />
    </main>
  );
}