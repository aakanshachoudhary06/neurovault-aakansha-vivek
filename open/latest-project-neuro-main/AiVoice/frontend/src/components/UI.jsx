import { useRef, useState } from "react";
import { useChat } from "../hooks/useChat";

const useSpeechRecognition = (onResult, onEnd) => {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  const start = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognition.onend = () => {
      setListening(false);
      if (onEnd) onEnd();
    };
    recognition.onerror = (e) => {
      setListening(false);
      if (onEnd) onEnd();
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { start, stop, listening };
};

export const UI = ({ hidden, ...props }) => {
  const { chat, loading, message } = useChat();
  const [voiceMode, setVoiceMode] = useState(false);
  const [firstMic, setFirstMic] = useState(true);
  const [micActive, setMicActive] = useState(false);

  // Speech recognition hook
  const { start, stop, listening } = useSpeechRecognition(
    (transcript) => {
      if (transcript && transcript.trim()) {
        chat(transcript);
      }
      setMicActive(false);
    },
    () => setMicActive(false)
  );

  // Handle mic button click
  const handleMicClick = () => {
    if (firstMic) {
      chat(""); // Send empty message to trigger backend open message
      setFirstMic(false);
      setVoiceMode(true);
      setTimeout(() => setMicActive(true), 500); // slight delay for UX
      setTimeout(() => start(), 700);
    } else if (!micActive) {
      setMicActive(true);
      start();
    } else {
      setMicActive(false);
      stop();
    }
  };

  if (hidden) return null;

  return (
    <>
      {/* NeuroChirp Brand Box - Center Top */}
      <div className="fixed top-0 left-0 right-0 z-30 flex flex-col items-center mt-6 pointer-events-none select-none">
        <div className="relative flex flex-col items-center justify-center px-10 py-5 rounded-3xl bg-white/10 backdrop-blur-xl shadow-xl border-4 border-transparent animate-gradient-border" style={{ borderImage: 'linear-gradient(90deg, #1ECBE1, #7F5AF0, #EF88D8, #1ECBE1) 1' }}>
          <h1 className="nv-heading text-4xl font-black tracking-wide text-center drop-shadow-lg" style={{ fontFamily: 'Playfair Display, serif' }}>NeuroChirp</h1>
          <div className="mt-2 text-lg font-semibold text-blue-200 tracking-wide text-center" style={{ textShadow: '0 0 8px #1ECBE1' }}>
            Speak. Feel. Remember.
          </div>
        </div>
      </div>

      {/* Large Mic Button - Bottom Center */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center items-end pb-16 pointer-events-none">
        <button
          className={`pointer-events-auto flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-cyan-400/30 to-purple-500/30 shadow-2xl border-4 border-cyan-300/40 backdrop-blur-xl transition-all duration-200 ${micActive || listening ? 'ring-8 ring-cyan-400/40 animate-pulse' : ''}`}
          style={{ boxShadow: '0 0 64px 8px #1ECBE1, 0 0 0 8px #7F5AF0', outline: 'none' }}
          aria-label={micActive || listening ? 'Stop listening' : 'Start voice conversation'}
          onClick={handleMicClick}
          tabIndex={0}
        >
          <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="27" cy="27" r="26" fill="#0A0E17" fillOpacity="0.7" stroke="#1ECBE1" strokeWidth="2" />
            <rect x="21" y="13" width="12" height="24" rx="6" fill="#1ECBE1" stroke="#7F5AF0" strokeWidth="2" />
            <path d="M15 29v2a12 12 0 0 0 24 0v-2" stroke="#EF88D8" strokeWidth="2" />
            <line x1="27" y1="41" x2="27" y2="47" stroke="#FAF9FF" strokeWidth="2" />
            <line x1="21" y1="47" x2="33" y2="47" stroke="#FAF9FF" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </>
  );
};

// Add animated gradient border CSS
// In index.css or a global style file, add:
// @keyframes gradient-border {
//   0% { border-image-source: linear-gradient(90deg, #1ECBE1, #7F5AF0, #EF88D8, #1ECBE1); }
//   100% { border-image-source: linear-gradient(270deg, #1ECBE1, #7F5AF0, #EF88D8, #1ECBE1); }
// }
// .animate-gradient-border { animation: gradient-border 6s linear infinite alternate; }
