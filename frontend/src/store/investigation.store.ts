import { create } from 'zustand'
import { fallbackTrace } from './fallbackTrace'

interface InvestigationState {
  findings: any[];
  agentStates: Record<string, string>;
  pluginExecutions: any[];
  overallConfidence: number;
  iterationHistory: any[];
  currentIteration: number;
  status: 'PLANNING' | 'COMPLETED' | 'FAILED';
  
  // Judge Mode State
  isJudgeMode: boolean;
  engineState: 'IDLE' | 'INTRO_PLAYING' | 'INTRO_COMPLETE' | 'REPLAY_INITIALIZING' | 'REPLAY_RUNNING';
  playbackSpeed: number;
  isPaused: boolean;
  currentTime: number;
  
  // Actions
  addFinding: (finding: any) => void;
  setAgentState: (agent: string, status: string) => void;
  addPluginExecution: (plugin: any) => void;
  setOverallConfidence: (conf: number) => void;
  setIterationHistory: (history: any[]) => void;
  setCurrentIteration: (iteration: number) => void;
  setEngineState: (state: 'IDLE' | 'INTRO_PLAYING' | 'INTRO_COMPLETE' | 'REPLAY_INITIALIZING' | 'REPLAY_RUNNING') => void;
  setStatus: (status: 'PLANNING' | 'COMPLETED' | 'FAILED') => void;
  resetStore: () => void;
  
  replayEvents: any[];
  
  // Judge Actions
  toggleJudgeMode: () => void;
  setPlaybackSpeed: (speed: number) => void;
  togglePause: () => void;
  seekToTime: (time: number) => void;
  loadReplay: (investigationId: string) => Promise<void>;
  processReplayTick: (elapsedMs: number) => void;
}

export const useInvestigationStore = create<InvestigationState>((set, get) => ({
  findings: [],
  agentStates: {
    planner: 'idle',
    executor: 'idle',
    verifier: 'idle',
    reporter: 'idle'
  },
  pluginExecutions: [],
  overallConfidence: 0.0,
  iterationHistory: [],
  currentIteration: 1,
  status: 'PLANNING',
  
  isJudgeMode: false,
  engineState: 'IDLE',
  playbackSpeed: 1.0,
  isPaused: false,
  currentTime: 0,
  replayEvents: [],
  
  addFinding: (finding) => set((state) => ({ findings: [...state.findings, finding] })),
  setAgentState: (agent, status) => set((state) => ({
    agentStates: { ...state.agentStates, [agent]: status }
  })),
  addPluginExecution: (plugin) => set((state) => {
    const name = plugin.name || plugin.plugin;
    const status = plugin.status || (plugin.exit_code !== undefined ? 'COMPLETED' : 'RUNNING');
    const existingIdx = state.pluginExecutions.findIndex(p => p.name === name);
    if (existingIdx >= 0) {
      const updated = [...state.pluginExecutions];
      updated[existingIdx] = {
        ...updated[existingIdx],
        ...plugin,
        name,
        status,
        timestamp: plugin.timestamp || updated[existingIdx].timestamp || Date.now()
      };
      return { pluginExecutions: updated };
    } else {
      return {
        pluginExecutions: [
          ...state.pluginExecutions,
          { ...plugin, name, status, timestamp: plugin.timestamp || Date.now() }
        ]
      };
    }
  }),
  setOverallConfidence: (conf) => set({ overallConfidence: conf }),
  setIterationHistory: (history) => set({ iterationHistory: history }),
  setCurrentIteration: (iteration) => set({ currentIteration: iteration }),
  setEngineState: (state) => set({ engineState: state }),
  setStatus: (status) => set({ status }),
  resetStore: () => set({
    findings: [],
    agentStates: {
      planner: 'idle',
      executor: 'idle',
      verifier: 'idle',
      reporter: 'idle'
    },
    pluginExecutions: [],
    overallConfidence: 0.0,
    iterationHistory: [],
    currentIteration: 1,
    status: 'PLANNING',
    isJudgeMode: false,
    engineState: 'IDLE',
    playbackSpeed: 1.0,
    isPaused: false,
    currentTime: 0,
    replayEvents: []
  }),
  
  toggleJudgeMode: () => set((state) => ({ isJudgeMode: !state.isJudgeMode })),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  seekToTime: (time) => set({ currentTime: time }),
  
  loadReplay: async (investigationId) => {
      try {
          // @ts-ignore
          const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
          const res = await fetch(`${baseUrl}/api/v1/investigations/${investigationId}/replay`);
          if (!res.ok) throw new Error("Replay not found");
          const data = await res.json();
          set({ 
              replayEvents: data.events, 
              currentTime: 0,
              findings: [],
              pluginExecutions: [],
              overallConfidence: 0.0,
              agentStates: { planner: 'idle', executor: 'idle', verifier: 'idle', reporter: 'idle' },
              status: 'COMPLETED'
          });
      } catch (err) {
          console.error("Failed to load replay from API. Falling back to safe deterministic trace.", err);
          set({
              replayEvents: fallbackTrace.events,
              currentTime: 0,
              findings: [],
              pluginExecutions: [],
              overallConfidence: 0.0,
              agentStates: { planner: 'idle', executor: 'idle', verifier: 'idle', reporter: 'idle' },
              status: 'COMPLETED'
          });
      }
  },
  
  processReplayTick: (elapsedMs) => {
      const state = get();
      if (state.isPaused || state.replayEvents.length === 0) return;
      
      const newTime = state.currentTime + elapsedMs;
      const eventsToProcess = state.replayEvents.filter(e => e.offset_ms > state.currentTime && e.offset_ms <= newTime);
      
      eventsToProcess.forEach(event => {
          if (event.type === 'agent:state_change') {
              set((s) => ({ agentStates: { ...s.agentStates, [event.payload.agent]: event.payload.status } }));
          } else if (event.type === 'plugin:running') {
              get().addPluginExecution({ plugin: event.payload.plugin, status: 'RUNNING' });
          } else if (event.type === 'plugin:completed') {
              get().addPluginExecution({ ...event.payload, status: 'COMPLETED' });
          } else if (event.type === 'finding:created') {
              set((s) => ({ findings: [...s.findings, event.payload] }));
          } else if (event.type === 'investigation:confidence') {
              set({ overallConfidence: event.payload });
          } else if (event.type === 'judge:moment') {
              // Custom event to trigger UI animations
              // We can dispatch a custom DOM event so the UI components can listen to it
              window.dispatchEvent(new CustomEvent('judge:moment', { detail: event.payload }));
          }
      });
      
      set({ currentTime: newTime });
  }
}))
