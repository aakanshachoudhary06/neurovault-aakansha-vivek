import React from 'react';
import PremiumGraph from '../components/PremiumGraph';

export default function GraphPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0C10] via-[#0B0E11] to-[#000000]">
      <div className="pt-20 pb-32">
        <PremiumGraph />
      </div>
    </div>
  );
}