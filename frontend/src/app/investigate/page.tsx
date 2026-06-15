import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useInvestigationStore } from '@/store/investigation.store'
import { io } from 'socket.io-client'
import { IntroSequence } from './IntroSequence'
import { BenchmarkOverlay } from './BenchmarkOverlay'

import ReactFlow, { Background, Controls, Edge, Node } from 'reactflow';
import 'reactflow/dist/style.css';

export default function InvestigatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const queryParams = new URLSearchParams(location.search)
  const isDemoMode = queryParams.get('mode') === 'judge'

  const { 
    findings, 
    agentStates, 
    pluginExecutions,
    overallConfidence, 
    isJudgeMode,
    engineState,
    isPaused,
    playbackSpeed,
    toggleJudgeMode,
    togglePause,
    setPlaybackSpeed,
    addFinding, 
    setAgentState,
    addPluginExecution,
    setOverallConfidence,
    setEngineState,
    status,
    setStatus,
    resetStore
  } = useInvestigationStore()

  const [selectedFinding, setSelectedFinding] = useState<any>(null)
  const [judgeMoment, setJudgeMoment] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date().toISOString())
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [showBenchmark, setShowBenchmark] = useState(false)
  const [telemetryTimeout, setTelemetryTimeout] = useState(false)

  useEffect(() => {
    if (isJudgeMode || pluginExecutions.length > 0) return;
    const timer = setTimeout(() => {
      setTelemetryTimeout(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isJudgeMode, pluginExecutions.length]);

  useEffect(() => {
    resetStore();
  }, [id, resetStore]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toISOString()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
      if (isDemoMode && engineState === 'IDLE') {
          setEngineState('INTRO_PLAYING');
          if (!isJudgeMode) toggleJudgeMode();
          
          // HARD FAILSAFE: Force intro complete if stuck
          setTimeout(() => {
             const state = useInvestigationStore.getState();
             if (state.engineState === 'INTRO_PLAYING') {
                 console.warn("[Failsafe] Intro stuck. Forcing transition.");
                 state.setEngineState('INTRO_COMPLETE');
             }
          }, 15000);
      }
  }, [isDemoMode, engineState, isJudgeMode, toggleJudgeMode, setEngineState]);

  // Check if investigation is already completed on load
  useEffect(() => {
    if (isJudgeMode || !id) return;
    
    // @ts-ignore
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    
    fetch(`${baseUrl}/api/v1/investigations/${id}`)
      .then(res => {
         if (!res.ok) throw new Error("Failed to fetch status");
         return res.json();
      })
      .then(data => {
         setStatus(data.status);
         if (data.status === 'COMPLETED') {
             console.log("[LiveMode] Investigation already completed. Transitioning to replay.");
             if (!isJudgeMode) toggleJudgeMode();
             setEngineState('INTRO_COMPLETE');
         }
      })
      .catch(err => console.error("Error fetching investigation status:", err));
  }, [id, isJudgeMode, toggleJudgeMode, setEngineState, setStatus]);

  // Live Mode WebSocket Stream
  useEffect(() => {
    if (isJudgeMode) return;
    // @ts-ignore
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(baseUrl)
    
    socket.on('connect', () => {
        setWsStatus('connected');
        socket.emit('subscribe', { investigation_id: id });
    });
    
    socket.on('disconnect', () => setWsStatus('disconnected'));
    socket.on('agent:state_change', (data) =>
      setAgentState(data.agent, data.status)
    )

    socket.on('finding:created', (finding) =>
      addFinding(finding)
    )

    socket.on('investigation:confidence', (conf) =>
      setOverallConfidence(conf)
    )

    socket.on('plugin:running', (data) =>
      addPluginExecution(data)
    )

    socket.on('plugin:completed', (data) =>
      addPluginExecution(data)
    )

    socket.on('report:complete', (report) => {
      console.log('REPORT COMPLETE', report)
    })

    socket.on('investigation:completed', (data) => {
      setStatus(data.status || 'COMPLETED');
    });
    
    return () => { socket.disconnect() }
  }, [id, isJudgeMode, setAgentState, addFinding, setOverallConfidence, addPluginExecution, setStatus])

  // State Machine: Intro -> Initialization
  useEffect(() => {
    if (engineState !== 'INTRO_COMPLETE') return;
    
    console.log("[ReplayEngine] State: REPLAY_INITIALIZING");
    setEngineState('REPLAY_INITIALIZING');
    
    useInvestigationStore.getState().loadReplay(id as string).then(() => {
        console.log("[ReplayEngine] State: REPLAY_RUNNING");
        setEngineState('REPLAY_RUNNING');
    }).catch((e) => {
        console.error("[ReplayEngine] Initialization failed. Triggering SAFE FALLBACK.", e);
        setEngineState('REPLAY_RUNNING'); 
    });
  }, [engineState, id, setEngineState])

  // State Machine: Running Tick Engine
  useEffect(() => {
    if (engineState !== 'REPLAY_RUNNING') return;
    
    console.log("[ReplayEngine] Tick engine mounted and running");
    const intervalMs = 100;
    const interval = setInterval(() => {
      const state = useInvestigationStore.getState();
      state.processReplayTick(intervalMs * state.playbackSpeed);
    }, intervalMs);
    
    return () => {
      console.log("[ReplayEngine] Tick engine unmounted");
      clearInterval(interval);
    };
  }, [engineState])
  
  useEffect(() => {
      const handleJudgeMoment = (e: any) => {
          setJudgeMoment(e.detail);
          setTimeout(() => setJudgeMoment(null), 5000);
      };
      window.addEventListener('judge:moment', handleJudgeMoment);
      return () => window.removeEventListener('judge:moment', handleJudgeMoment);
  }, []);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-truva-confirm shadow-truva-confirm';
    if (conf >= 0.5) return 'text-truva-warn shadow-truva-warn';
    return 'text-truva-crit shadow-truva-crit';
  };

  const getConfidenceGlow = (conf: number) => {
    if (conf >= 0.8) return 'drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]';
    if (conf >= 0.5) return 'drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]';
    return 'drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]';
  };

  const nodes: Node[] = [
    { id: 'planner', position: { x: 50, y: 50 }, data: { label: 'LangGraph: Planner Agent' }, style: { width: 220, background: agentStates.planner === 'active' ? '#0f62fe' : '#1e293b', color: 'white', border: agentStates.planner === 'active' ? '2px solid #00f2fe' : '1px solid #334155', borderRadius: 8, padding: 10, fontSize: '12px' } },
    { id: 'executor', position: { x: 50, y: 150 }, data: { label: 'LangGraph: Executor Agent' }, style: { width: 220, background: agentStates.executor === 'active' ? '#0f62fe' : '#1e293b', color: 'white', border: agentStates.executor === 'active' ? '2px solid #00f2fe' : '1px solid #334155', borderRadius: 8, padding: 10, fontSize: '12px' } },
    { id: 'verifier', position: { x: 50, y: 250 }, data: { label: 'LangGraph: Verifier Agent' }, style: { width: 220, background: agentStates.verifier === 'active' ? '#0f62fe' : '#1e293b', color: 'white', border: agentStates.verifier === 'active' ? '2px solid #00f2fe' : '1px solid #334155', borderRadius: 8, padding: 10, fontSize: '12px' } }
  ];

  const edges: Edge[] = [
    { id: 'e-p-e', source: 'planner', target: 'executor', animated: agentStates.executor === 'active', style: { stroke: '#0f62fe', strokeWidth: 2 } },
    { id: 'e-e-v', source: 'executor', target: 'verifier', animated: agentStates.verifier === 'active', style: { stroke: '#0f62fe', strokeWidth: 2 } }
  ];

  findings.forEach((f, i) => {
      nodes.push({
          id: `finding-${i}`,
          position: { x: 350, y: 50 + (i * 90) },
          data: { label: f.title },
          style: {
              width: 250,
              background: f.is_hallucination ? '#3f3f46' : (f.severity === 'CRITICAL' ? '#7f1d1d' : '#0f1524'),
              color: 'white',
              border: f.is_hallucination ? '1px solid #ef4444' : '1px solid #3b82f6',
              borderRadius: 8,
              padding: 10,
              fontSize: '11px',
              opacity: f.is_hallucination ? 0.5 : 1
          }
      });
      edges.push({
          id: `e-v-f${i}`,
          source: 'verifier',
          target: `finding-${i}`,
          animated: !f.is_hallucination,
          style: { stroke: f.is_hallucination ? '#ef4444' : '#3b82f6', strokeWidth: 2 }
      });
  });

  return (
    <div className={`min-h-screen bg-truva-canvas text-white p-4 font-sans relative overflow-hidden transition-all duration-1000 ${judgeMoment?.type === 'CONTRADICTION' ? 'animate-shudder' : ''}`}>
      {/* Deep Ambient Environment */}
      <div className={`absolute inset-0 bg-cinematic-mesh animate-mesh-spin transition-opacity duration-1000 ${judgeMoment?.type === 'CONTRADICTION' ? 'opacity-0' : 'opacity-20 pointer-events-none'}`}></div>
      {judgeMoment?.type === 'CONTRADICTION' && <div className="absolute inset-0 bg-cinematic-crit opacity-50 pointer-events-none"></div>}
      <div className="absolute inset-0 bg-tactical-grid opacity-30 pointer-events-none mix-blend-screen"></div>
      <div className="scanline"></div>
      
      {/* Floating telemetry dots */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-truva-cyan rounded-full shadow-[0_0_10px_#00F2FE] animate-float opacity-30 pointer-events-none" style={{animationDelay: '0s'}}></div>
      <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-truva-accent rounded-full shadow-[0_0_15px_#0066FF] animate-float opacity-20 pointer-events-none" style={{animationDelay: '2s'}}></div>

      {/* Reactive background glow based on confidence/contradiction */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] rounded-full blur-[150px] pointer-events-none transition-all duration-1000 opacity-20 ${judgeMoment?.type === 'CONTRADICTION' ? 'bg-red-600 opacity-40 scale-110' : overallConfidence > 0.8 ? 'bg-truva-confirm' : 'bg-truva-accent'}`}></div>

      {isDemoMode && (engineState === 'IDLE' || engineState === 'INTRO_PLAYING') && (
        <IntroSequence onComplete={() => setEngineState('INTRO_COMPLETE')} />
      )}
      
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between mb-8 glass-panel-heavy p-5 rounded-2xl shadow-2xl border-b-2 border-b-white/5">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors group">
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight hero-text-glow">TRUVA<span className="text-truva-cyan">-IR</span> OS // <span className="text-gray-400 font-mono text-xl ml-2">{id}</span></h1>
            <p className="text-[10px] text-truva-cyan uppercase tracking-[0.4em] font-bold mt-2 animate-pulse flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-truva-cyan animate-ping"></span> Live Telemetry Link Established
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="font-mono text-sm text-truva-cyan tracking-widest font-bold">{currentTime}</div>
          
          {/* Judge Mode Controls & Benchmark */}
          <div className="flex items-center gap-4 bg-black/60 px-5 py-3 rounded-xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <button 
              onClick={() => setShowBenchmark(true)}
              className="px-4 py-1.5 bg-truva-cyan/10 hover:bg-truva-cyan/20 border border-truva-cyan/50 text-truva-cyan text-[10px] font-mono tracking-widest uppercase rounded flex items-center gap-2 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              View Benchmark
            </button>
            <label className="flex items-center cursor-pointer gap-3 pl-4 border-l border-white/10">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isJudgeMode} onChange={toggleJudgeMode} disabled={isDemoMode} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isJudgeMode ? 'bg-purple-600' : 'bg-gray-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isJudgeMode ? 'translate-x-4' : ''}`}></div>
              </div>
              <span className={`text-xs font-mono uppercase tracking-widest ${isJudgeMode ? 'text-purple-400 font-bold' : 'text-gray-500'}`}>Judge Mode</span>
            </label>
            
            {isJudgeMode && (
              <div className="flex items-center gap-3 border-l border-white/10 pl-4 ml-2">
                <button onClick={togglePause} className="px-4 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 rounded border border-purple-500/30 text-[10px] font-bold font-mono uppercase tracking-[0.2em] transition-all text-purple-300 hover:text-white">
                  {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
                </button>
                <select 
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-black/50 border border-purple-500/30 text-purple-300 text-[10px] font-mono tracking-widest rounded px-2 py-1 outline-none focus:border-purple-500 transition-colors"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1.0x</option>
                  <option value={2}>2.0x</option>
                  <option value={5}>5.0x</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            {Object.entries(agentStates).map(([agent, state]) => (
              <div key={agent} className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-500 ${state === 'active' ? 'bg-truva-cyan/10 border-truva-cyan/50 shadow-[0_0_20px_rgba(0,242,254,0.3)] scale-105' : 'bg-white/5 border-white/5 opacity-50'}`}>
                <div className={`w-2 h-2 rounded-full ${state === 'active' ? 'bg-truva-cyan animate-ping' : 'bg-gray-600'}`}></div>
                <span className={`capitalize text-[10px] font-mono tracking-widest ${state === 'active' ? 'text-truva-cyan font-bold' : 'text-gray-500'}`}>{agent}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="relative z-20 grid grid-cols-12 gap-8 h-[calc(100vh-160px)]">
        {/* Left Column: Reasoning Visualizer & Explanation */}
        <div className="col-span-8 flex flex-col gap-8">
          
          {/* Agent Reasoning Graph */}
          <div className={`flex-1 flex flex-col glass-panel-heavy rounded-2xl p-6 relative overflow-hidden transition-all duration-700 ${judgeMoment?.type === 'CONTRADICTION' ? 'border-red-500/80 shadow-[inset_0_0_100px_rgba(239,68,68,0.4),0_0_50px_rgba(239,68,68,0.3)]' : 'border-t-truva-cyan/30'}`}>
            
            <div className="absolute top-8 right-8 flex flex-col items-end z-10 bg-black/80 p-5 rounded-xl border border-white/10 backdrop-blur-xl shadow-2xl">
              <span className="text-[10px] text-gray-400 uppercase tracking-[0.4em] font-bold mb-3 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${getConfidenceColor(overallConfidence)} animate-pulse`}></span>
                System Confidence
              </span>
              <span className={`text-6xl font-mono font-light tracking-tighter ${getConfidenceColor(overallConfidence)} ${getConfidenceGlow(overallConfidence)} transition-all duration-1000`}>
                {(overallConfidence * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="absolute top-8 left-8 z-10 bg-black/50 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
               <h3 className="text-truva-cyan text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>
                 Autonomous Reasoning Topology
               </h3>
            </div>

            {/* Cinematic Judge Moment Overlay */}
            {judgeMoment && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
                <div className="absolute inset-0 bg-cinematic-crit opacity-30 animate-pulse"></div>
                <div className={`border-l-4 p-10 rounded-r-2xl max-w-3xl shadow-[0_0_100px_rgba(239,68,68,0.4)] relative overflow-hidden bg-gradient-to-r from-red-900/50 to-black/80 border-red-500 scale-105 transition-transform`}>
                   <div className="absolute top-0 left-0 w-full h-1 bg-red-500/80 animate-scan-line shadow-[0_0_20px_#EF4444]"></div>
                   <h2 className="text-xl font-black uppercase tracking-[0.5em] mb-6 flex items-center gap-4 text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                     <svg className="w-8 h-8 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                     SELF-CORRECTION TRIGGERED: {judgeMoment.type}
                   </h2>
                   <div className="h-px w-full bg-red-500/30 mb-6"></div>
                   <p className="text-white text-2xl font-mono leading-relaxed tracking-wide">{judgeMoment.message}</p>
                </div>
              </div>
            )}

            <div className="flex-1 w-full rounded-xl relative overflow-hidden mt-16 group pt-8 flex flex-col">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-truva-accent/10 via-transparent to-transparent pointer-events-none transition-all duration-1000 group-hover:from-truva-cyan/20"></div>
              
              {/* Living Intelligence Layer Particles */}
              <div className="absolute top-1/3 left-1/3 text-[8px] font-mono text-truva-cyan/30 tracking-widest pointer-events-none animate-pulse" style={{animationDuration: '3s'}}>Correlating PE Headers...</div>
              <div className="absolute bottom-1/3 right-1/3 text-[8px] font-mono text-truva-accent/30 tracking-widest pointer-events-none animate-pulse" style={{animationDuration: '4s', animationDelay: '1s'}}>Awaiting Graph Edges</div>
              <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-truva-confirm/50 rounded-full animate-float shadow-[0_0_10px_#00E676] pointer-events-none" style={{animationDuration: '5s'}}></div>
              <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-truva-cyan/50 rounded-full animate-float shadow-[0_0_15px_#00F2FE] pointer-events-none" style={{animationDuration: '7s'}}></div>

              <div className="flex-1 relative w-full">
                <ReactFlow nodes={nodes} edges={edges} fitView>
                  <Background color="rgba(255,255,255,0.05)" gap={20} size={2} />
                  <Controls className="bg-black/80 border-white/10 fill-white" />
                </ReactFlow>
              </div>
            </div>
          </div>

          {/* Analyst Explanation Panel */}
          <div className="h-64 glass-panel-heavy rounded-2xl p-6 overflow-y-auto relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-truva-accent/10 rounded-full blur-[40px] pointer-events-none"></div>
            <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-5 pb-3 border-b border-white/10 flex items-center gap-3">
              <span className="w-2 h-2 bg-truva-cyan rounded-full animate-pulse shadow-[0_0_8px_#00F2FE]"></span> 
              Forensic Detail Layer
            </h3>
            {selectedFinding ? (
              <div className="space-y-5 font-mono text-sm relative z-10">
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <span className="text-truva-cyan block text-[10px] uppercase tracking-[0.2em] mb-2 font-bold">Hypothesis / Expected Outcome</span>
                  <p className="text-gray-300 leading-relaxed">Identify unlinked processes indicative of process hollowing.</p>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <span className="text-purple-400 block text-[10px] uppercase tracking-[0.2em] mb-2 font-bold">Forensic Interpretation</span>
                  <p className="text-white leading-relaxed">{selectedFinding.reasoning_chain?.interpretation || "Analysis pending..."}</p>
                </div>
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <span className="text-truva-warn block text-[10px] uppercase tracking-[0.2em] mb-2 font-bold">Confidence Justification</span>
                  <p className="text-gray-300 leading-relaxed">{selectedFinding.reasoning_chain?.confidence_justification || "Awaiting cross-plugin correlation."}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-600 text-xs font-mono uppercase tracking-[0.3em] flex items-center gap-3">
                  <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  Select an intelligence node to inspect
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Traceability & Stream */}
        <div className="col-span-4 flex flex-col gap-8">
          
          {/* Live Telemetry Feed */}
          <div className="h-56 glass-panel-heavy rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700"></div>
            <h3 className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 pb-2 border-b border-white/10 flex items-center gap-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping shadow-[0_0_8px_#A855F7]"></span> 
              Live Operational Feed
            </h3>
                      <div className="flex-1 overflow-hidden relative mb-2">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none z-10"></div>
               <div className={`space-y-3 font-mono text-[10px] text-gray-400 absolute bottom-0 w-full ${pluginExecutions.length > 0 ? 'animate-[scroll-up_10s_linear_infinite]' : ''}`}>
                 {pluginExecutions.length === 0 && !telemetryTimeout && <p className="text-gray-500 italic">Awaiting execution trace...</p>}
                 {pluginExecutions.length === 0 && telemetryTimeout && (
                     <div className="bg-truva-warn/10 border border-truva-warn/30 p-4 rounded-xl relative z-20 pointer-events-auto">
                       <p className="mb-2 text-truva-warn font-bold flex items-center gap-2">
                         <span className="w-2 h-2 bg-truva-warn rounded-full animate-ping"></span> 
                         TELEMETRY TIMEOUT
                       </p>
                       <p className="text-gray-400 mb-4 text-[9px] leading-relaxed">The backend analysis pipeline failed to stream execution telemetry within 15 seconds. Ensure Docker is running and the LangGraph worker initialized.</p>
                       <button onClick={() => window.location.reload()} className="bg-truva-warn/20 text-truva-warn border border-truva-warn/50 hover:bg-truva-warn hover:text-black px-4 py-2 font-bold rounded w-full transition-colors cursor-pointer">
                         RELOAD & RETRY
                       </button>
                     </div>
                 )}
                 {pluginExecutions.map((p, i) => (
                   <div key={i} className="flex gap-4 items-start">
                     <span className="text-truva-cyan shrink-0">[{new Date(p.timestamp || Date.now()).toLocaleTimeString('en-US', { hour12: false })}]</span>
                     <span className="text-white flex-1">{p.name}</span>
                     <span className={`shrink-0 ${p.status === 'RUNNING' ? 'text-truva-warn animate-pulse font-bold' : 'text-truva-confirm'}`}>{p.status}</span>
                   </div>
                 ))}
               </div>
            </div>
            
            <div className="mt-2 pt-3 border-t border-white/10 flex justify-between text-[9px] uppercase tracking-[0.2em] font-bold relative z-20 bg-black/50 p-2 rounded">
               <span className="text-gray-500">WS LINK: <span className={`${wsStatus === 'connected' ? 'text-truva-confirm drop-shadow-[0_0_5px_#00E676]' : 'text-red-500 animate-pulse'} ml-1`}>{wsStatus}</span></span>
               <span className="text-gray-500">MODE: <span className="text-white ml-1">{isJudgeMode ? 'REPLAY' : 'LIVE'}</span></span>
            </div>
          </div>

          <div className="flex-1 glass-panel-heavy rounded-2xl p-6 overflow-y-auto relative">
            <div className="sticky top-0 bg-black/80 backdrop-blur-xl z-20 flex justify-between items-center mb-6 border-b border-white/10 pb-4 -mx-6 px-6 -mt-6 pt-6 shadow-lg">
               <h3 className="text-white text-[10px] font-bold uppercase tracking-[0.4em] flex items-center gap-3">
                 <svg className="w-4 h-4 text-truva-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                 Intelligence Stream
               </h3>
               <span className="text-[10px] font-mono bg-truva-cyan/10 text-truva-cyan border border-truva-cyan/30 px-3 py-1 rounded-full font-bold">{findings.length} ARTIFACTS</span>
            </div>
            
            <div className="space-y-5 relative z-10">
              {findings.map((f, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedFinding(f)}
                  className={`border-l-4 p-5 rounded-r-xl cursor-pointer transition-all duration-300 bg-black/60 relative overflow-hidden group hover:-translate-y-1 ${selectedFinding?.id === f.id ? 'border-truva-cyan bg-truva-cyan/10 shadow-[inset_4px_0_0_rgba(0,242,254,1),0_4px_20px_rgba(0,242,254,0.15)]' : 'border-white/10 hover:bg-white/10 hover:border-white/40'} ${f.is_hallucination ? 'opacity-40 grayscale border-red-500' : ''}`}
                >
                  {selectedFinding?.id === f.id && <div className="absolute inset-0 bg-gradient-to-r from-truva-cyan/10 to-transparent pointer-events-none"></div>}
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className={`${f.is_hallucination ? 'text-red-500 line-through bg-red-500/20' : f.severity === 'CRITICAL' ? 'text-red-400 bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'text-truva-warn bg-truva-warn/20'} font-bold text-[9px] uppercase tracking-[0.3em] px-3 py-1 rounded border border-current/30`}>
                      {f.severity} {f.is_hallucination && "REJECTED"}
                    </span>
                    <span className="text-gray-300 text-[10px] font-mono flex items-center gap-1.5 font-bold">
                      <svg className={`w-3.5 h-3.5 ${f.is_hallucination ? 'text-red-500' : 'text-truva-cyan'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {(f.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className={`text-white text-sm font-medium leading-relaxed tracking-wide relative z-10 ${f.is_hallucination ? 'line-through text-gray-500' : ''}`}>{f.title}</p>
                  
                  {f.mitre_techniques && f.mitre_techniques.length > 0 && (
                     <div className="mt-5 flex gap-2 flex-wrap relative z-10">
                        {f.mitre_techniques.map((t: string) => (
                          <span key={t} className="text-[9px] bg-truva-cyan/20 text-truva-cyan px-2.5 py-1 rounded border border-truva-cyan/40 uppercase tracking-[0.2em] font-mono font-bold shadow-[0_0_5px_rgba(0,242,254,0.2)]">{t}</span>
                        ))}
                     </div>
                  )}
                </div>
              ))}
              {findings.length === 0 && (
                status === 'COMPLETED' ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-truva-confirm/10 border border-truva-confirm/30 flex items-center justify-center text-truva-confirm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <p className="text-truva-confirm text-[10px] font-mono uppercase tracking-[0.4em] font-bold">No findings identified</p>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 border-2 border-truva-cyan/20 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-10 h-10 border-2 border-truva-cyan border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-truva-cyan text-[10px] font-mono uppercase tracking-[0.4em] font-bold animate-pulse">Listening for Telemetry...</p>
                  </div>
                )
              )}
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Render Benchmark Overlay */}
      {showBenchmark && (
        <BenchmarkOverlay 
          investigationId={id || 'DEMO'} 
          findings={findings} 
          overallConfidence={overallConfidence} 
          onClose={() => setShowBenchmark(false)} 
        />
      )}
    </div>
  )
}
