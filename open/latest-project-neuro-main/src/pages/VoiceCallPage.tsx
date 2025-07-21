import React from 'react';

export default function VoiceCallPage() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center">
      <iframe
        src="http://localhost:5173"
        title="AI Voice"
        style={{
          width: '100vw',
          height: '100vh',
          border: 'none',
          minHeight: '100vh',
          minWidth: '100vw',
          background: 'black'
        }}
        allow="microphone; camera"
      />
    </div>
  );
} 