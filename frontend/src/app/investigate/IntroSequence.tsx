import React, { useEffect, useState, useRef } from 'react';

interface IntroSequenceProps {
  onComplete: () => void;
}

export const IntroSequence: React.FC<IntroSequenceProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Phase 0: Initial black screen
    const t1 = setTimeout(() => setPhase(1), 1000);
    // Phase 1: Attackers operate at machine speed
    const t2 = setTimeout(() => setPhase(2), 4000);
    // Phase 2: Defenders need trustworthy autonomous reasoning
    const t3 = setTimeout(() => setPhase(3), 7000);
    // Phase 3: TRUVA-IR focuses on validation over blind automation
    const t4 = setTimeout(() => setPhase(4), 10000);
    // Phase 4: Fade out and complete
    const t5 = setTimeout(() => {
      setPhase(5);
      setTimeout(() => onCompleteRef.current(), 1000);
    }, 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const skipIntro = () => {
    setPhase(5);
    setTimeout(() => onCompleteRef.current(), 300);
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-1000 ${phase === 5 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Glitch overlay effect */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-screen pointer-events-none"></div>

      <button onClick={skipIntro} className="absolute top-8 right-8 z-50 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors border border-gray-800 hover:border-gray-500 px-4 py-2 rounded">
        Skip Intro &gt;&gt;
      </button>

      <div className="max-w-3xl text-center space-y-12 px-8">
        
        <h1 className={`text-3xl md:text-5xl font-mono text-red-500 font-bold uppercase tracking-[0.2em] transition-all duration-1000 transform ${phase >= 1 ? 'opacity-100 translate-y-0 blur-none' : 'opacity-0 translate-y-8 blur-md'}`}>
          Attackers operate at machine speed.
        </h1>

        <h2 className={`text-2xl md:text-4xl font-sans text-gray-300 transition-all duration-1000 delay-500 transform ${phase >= 2 ? 'opacity-100 translate-y-0 blur-none' : 'opacity-0 translate-y-8 blur-md'}`}>
          Defenders need trustworthy autonomous reasoning.
        </h2>

        <div className={`transition-all duration-1000 delay-500 transform ${phase >= 3 ? 'opacity-100 translate-y-0 blur-none' : 'opacity-0 translate-y-8 blur-md'}`}>
            <h3 className="text-xl md:text-2xl font-sans text-truva-cyan font-semibold border-t border-b border-truva-cyan/30 py-4 inline-block px-12">
            TRUVA-IR focuses on <span className="text-white">validation</span> over <span className="text-white">blind automation</span>.
            </h3>
        </div>

      </div>
      
      {phase >= 4 && (
          <div className="absolute bottom-12 animate-pulse text-xs font-mono text-gray-500 uppercase tracking-widest">
              Initializing Autonomous Investigation Protocol...
          </div>
      )}
    </div>
  );
};
