import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

// #region agent log

// #endregion

type UploadedEvidence = {
  id: string
  filename: string
  sha256_hash: string
  file_size_bytes: number
  investigation_id?: string
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date().toISOString())
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentHash, setCurrentHash] = useState<string | null>(null)
  const [isStartingDemo, setIsStartingDemo] = useState(false)
  const [uploadedEvidence, setUploadedEvidence] = useState<UploadedEvidence[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // #region agent log
  useEffect(() => {
    console.log('[EvidenceIntake] evidence list render', { count: uploadedEvidence.length, items: uploadedEvidence });
    
  }, [uploadedEvidence]);
  // #endregion

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toISOString()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleStartDemo = async () => {
      if (isStartingDemo || isUploading) return;
      setIsStartingDemo(true);
      console.log("[Demo] Flagship Demo Clicked");
      await new Promise(r => setTimeout(r, 800));
      console.log("[Demo] Initializing Replay State...");
      navigate('/investigate/demo?mode=judge');
  };

  const processFile = async (file: File) => {
    if (isUploading) return;
    // #region agent log
    console.log('[EvidenceIntake] upload start', { filename: file.name, size: file.size });
    
    // #endregion
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
        setCurrentHash("CALCULATING...");
        // Mock processing delay for UI cinematic feel
        await new Promise(r => setTimeout(r, 600));
        setUploadProgress(40);
        setCurrentHash("Hashing file chunks...");
        
        const formData = new FormData();
        formData.append("file", file);
        
        // @ts-ignore
        const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const uploadUrl = `${baseUrl}/api/v1/investigations/upload`;
        
        setUploadProgress(60);
        const invRes = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });
        
        // #region agent log
        console.log('[EvidenceIntake] API response received', { status: invRes.status, ok: invRes.ok, url: uploadUrl });
        
        // #endregion
        
        if (!invRes.ok) {
            const errData = await invRes.json().catch(() => ({}));
            throw new Error(errData.detail || "Failed to upload evidence and start investigation");
        }
        const invData = await invRes.json();
        
        // #region agent log
        console.log('[EvidenceIntake] upload success', invData);
        
        // #endregion
        
        const evidenceEntry: UploadedEvidence = {
          id: invData.evidence_id || invData.id,
          filename: file.name,
          sha256_hash: invData.sha256_hash || 'pending',
          file_size_bytes: file.size,
          investigation_id: invData.id,
        };
        setUploadedEvidence(prev => {
          const next = [...prev, evidenceEntry];
          // #region agent log
          console.log('[EvidenceIntake] evidence state update', { prevCount: prev.length, nextCount: next.length, evidenceEntry });
          
          // #endregion
          return next;
        });
        if (invData.sha256_hash) setCurrentHash(invData.sha256_hash);
        
        setUploadProgress(100);
        await new Promise(r => setTimeout(r, 400));
        
        const navTarget = `/investigate/${invData.id}?mode=live`;
        // #region agent log
        console.log('[EvidenceIntake] navigating to investigation', { navTarget, investigationId: invData.id });
        
        // #endregion
        navigate(navTarget);
    } catch (err: any) {
        console.error("Upload failed:", err);
        // #region agent log
        
        // #endregion
        setIsUploading(false);
        setUploadProgress(0);
        setCurrentHash(`UPLOAD FAILED: ${err.message}`);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };


  return (
    <div className="min-h-screen bg-truva-canvas text-white relative overflow-hidden font-sans selection:bg-truva-accent/30 flex flex-col justify-center">
      {/* Deep Cinematic Background */}
      <div className="absolute inset-0 bg-cinematic-mesh animate-mesh-spin opacity-40 pointer-events-none"></div>
      <div className="absolute inset-0 bg-tactical-grid-glow opacity-50 pointer-events-none mix-blend-screen"></div>
      <div className="scanline"></div>
      
      {/* Floating telemetry dots */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-truva-cyan rounded-full shadow-[0_0_10px_#00F2FE] animate-float opacity-50 pointer-events-none" style={{animationDelay: '0s'}}></div>
      <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-truva-accent rounded-full shadow-[0_0_15px_#0066FF] animate-float opacity-30 pointer-events-none" style={{animationDelay: '2s'}}></div>
      <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-truva-confirm rounded-full shadow-[0_0_8px_#00E676] animate-float opacity-40 pointer-events-none" style={{animationDelay: '4s'}}></div>

      <div className="max-w-[90rem] w-full mx-auto relative z-20 px-8 py-12">
        
        {/* Top Operational Telemetry Header */}
        <div className="flex justify-between items-start mb-16 border-b border-white/10 pb-6 relative">
          <div className="absolute bottom-0 left-0 w-1/3 h-px bg-gradient-to-r from-truva-cyan to-transparent"></div>
          
          <div className="flex flex-col gap-2">
            <h1 className="text-7xl font-black tracking-tighter hero-text-glow leading-none flex items-center">
              TRUVA<span className="text-transparent bg-clip-text bg-gradient-to-r from-truva-cyan to-truva-accent ml-1">-IR</span>
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="h-px w-12 bg-truva-cyan/50"></div>
              <p className="text-truva-cyan font-mono text-sm uppercase tracking-[0.4em] font-bold">Autonomous DFIR Command Center</p>
            </div>
            <p className="text-gray-400 font-mono text-[10px] uppercase tracking-widest opacity-70 ml-16 mt-1">Self-correcting reasoning for machine-speed threats</p>
          </div>

          <div className="flex flex-col items-end gap-3 font-mono text-xs text-gray-400 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3 w-full justify-between">
              <span>AGENT NETWORK</span>
              <div className="flex items-center gap-2 text-truva-confirm">
                <span className="w-2 h-2 rounded-full bg-truva-confirm animate-heartbeat shadow-[0_0_8px_#00E676]"></span> ACTIVE
              </div>
            </div>
            <div className="flex items-center gap-3 w-full justify-between">
              <span>SANDBOX ISO</span>
              <div className="flex items-center gap-2 text-truva-confirm">
                <span className="w-2 h-2 rounded-full bg-truva-confirm animate-heartbeat shadow-[0_0_8px_#00E676]" style={{animationDelay: '0.75s'}}></span> SECURE
              </div>
            </div>
            <div className="h-px w-full bg-white/10 my-1"></div>
            <div className="text-truva-cyan tracking-widest font-bold">{currentTime}</div>
          </div>
        </div>

        {/* Cinematic Main Console */}
        <div className="grid grid-cols-12 gap-10">
          
          {/* Left Column: Quick Actions & Stats */}
          <div className="col-span-4 flex flex-col gap-8">
            <button 
              onClick={handleStartDemo}
              disabled={isStartingDemo || isUploading}
              className={`group relative glass-panel-heavy p-8 text-left transition-all duration-700 hover:shadow-[0_0_50px_rgba(0,242,254,0.3)] hover:border-truva-cyan/50 overflow-hidden transform hover:-translate-y-1 ${isStartingDemo ? 'opacity-80 scale-[0.98]' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-truva-cyan/10 to-truva-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <div className="absolute -inset-x-full top-0 h-px bg-gradient-to-r from-transparent via-truva-cyan to-transparent group-hover:animate-[scan-line_2s_linear_infinite]"></div>
              
              <div className="relative z-10 flex justify-between items-start">
                <div className="pr-4">
                  <span className="text-truva-cyan text-[10px] font-mono uppercase tracking-[0.4em] mb-3 flex items-center gap-2 font-bold drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]">
                    <span className="w-1.5 h-1.5 bg-truva-cyan rounded-full animate-ping"></span> Evaluator Demo
                  </span>
                  <h3 className="text-3xl font-black tracking-tight mb-3 text-white flex items-center gap-3 group-hover:text-truva-cyan transition-colors">
                    Flagship Demo
                    <svg className="w-6 h-6 text-truva-cyan group-hover:translate-x-3 transition-transform duration-300 drop-shadow-[0_0_10px_rgba(0,242,254,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed font-mono group-hover:text-gray-300 transition-colors">Launch the definitive Process Hollowing autonomous investigation trace showcasing contradiction handling.</p>
                </div>
                <div className={`${isStartingDemo ? 'bg-truva-warn/20 border-truva-warn text-truva-warn shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-truva-cyan/10 border border-truva-cyan/30 text-truva-cyan group-hover:bg-truva-cyan group-hover:text-black group-hover:shadow-[0_0_15px_rgba(0,242,254,0.8)]'} px-3 py-1 rounded text-[10px] font-mono tracking-widest font-bold transition-all uppercase`}>
                  {isStartingDemo ? 'INITIALIZING...' : 'READY'}
                </div>
              </div>
            </button>

            <div className="glass-panel p-8 flex flex-col gap-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-truva-accent/20 rounded-full blur-[40px] pointer-events-none"></div>
               <h4 className="text-gray-400 text-[10px] font-mono uppercase tracking-[0.3em] border-b border-white/10 pb-3 font-bold">Global Telemetry</h4>
               
               <div className="space-y-4">
                 <div className="flex justify-between items-center group">
                   <span className="text-sm text-gray-400 font-mono group-hover:text-white transition-colors">Active Cases</span>
                   <span className="text-3xl font-black text-truva-cyan drop-shadow-[0_0_10px_rgba(0,242,254,0.5)]">0</span>
                 </div>
                 <div className="flex justify-between items-center group">
                   <span className="text-sm text-gray-400 font-mono group-hover:text-white transition-colors">Verified Findings</span>
                   <span className="text-3xl font-black text-truva-confirm drop-shadow-[0_0_10px_rgba(0,230,118,0.5)]">0</span>
                 </div>
                 <div className="flex justify-between items-center group">
                   <span className="text-sm text-gray-400 font-mono group-hover:text-white transition-colors">Total Playbacks</span>
                   <span className="text-3xl font-black text-white">1</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Right Column: Evidence Intake Console */}
          <div className="col-span-8">
            <div className="h-full glass-panel-heavy rounded-2xl p-10 relative overflow-hidden group">
               {/* Ambient Backdrop Sweep */}
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-truva-accent/10 via-black/50 to-black pointer-events-none"></div>
               
               {/* Decorative corner brackets */}
               <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-truva-cyan/50 rounded-tl-xl pointer-events-none"></div>
               <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-truva-cyan/50 rounded-tr-xl pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-truva-cyan/50 rounded-bl-xl pointer-events-none"></div>
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-truva-cyan/50 rounded-br-xl pointer-events-none"></div>

               <div className="relative z-10 flex flex-col h-full">
                 <div className="flex items-center justify-between mb-10">
                   <div>
                     <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                       Evidence Intake Console
                       <span className="w-2 h-2 bg-truva-cyan animate-ping rounded-full ml-2"></span>
                     </h2>
                     <p className="text-truva-cyan/70 mt-2 text-sm font-mono tracking-wider">Mount raw memory dumps into the secure analysis environment.</p>
                   </div>
                   <div className={`text-[10px] font-mono border-2 px-4 py-2 rounded font-bold transition-all ${isUploading ? 'text-truva-cyan border-truva-cyan/30 bg-truva-cyan/10 animate-pulse' : 'text-truva-warn border-truva-warn/30 bg-truva-warn/10'}`}>
                     {isUploading ? (
                       uploadProgress < 40 ? 'UPLOADING EVIDENCE...' :
                       uploadProgress < 60 ? 'CALCULATING HASH...' :
                       uploadProgress < 100 ? 'INITIALIZING INVESTIGATION...' : 'LAUNCHING SANDBOX...'
                     ) : 'AWAITING ARTIFACT'}
                   </div>
                 </div>
                 
                 {uploadedEvidence.length > 0 && (
                   <div className="mb-6 w-full space-y-2">
                     <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] text-truva-cyan font-bold">Ingested Artifacts ({uploadedEvidence.length})</h4>
                     {uploadedEvidence.map((ev) => (
                       <div key={ev.id} className="bg-black/50 border border-truva-cyan/20 rounded-lg p-3 font-mono text-xs flex justify-between items-center gap-4">
                         <span className="text-white truncate">{ev.filename}</span>
                         <span className="text-truva-cyan shrink-0">{ev.sha256_hash.slice(0, 12)}…</span>
                         {ev.investigation_id && (
                           <button
                             onClick={(e) => { e.stopPropagation(); navigate(`/investigate/${ev.investigation_id}?mode=live`); }}
                             className="shrink-0 px-3 py-1 bg-truva-cyan/20 border border-truva-cyan/50 text-truva-cyan rounded text-[10px] uppercase tracking-widest font-bold hover:bg-truva-cyan hover:text-black transition-colors"
                           >
                             Analyze
                           </button>
                         )}
                       </div>
                     ))}
                   </div>
                 )}

                 <div 
                   onDrop={handleFileDrop}
                   onDragOver={handleDragOver}
                   onClick={() => !isUploading && fileInputRef.current?.click()}
                   className={`flex-1 rounded-xl flex flex-col items-center justify-center p-8 bg-black/40 border-2 border-dashed transition-all cursor-pointer ${isUploading ? 'border-truva-cyan/50 shadow-[inset_0_0_50px_rgba(0,242,254,0.1)]' : 'border-gray-600/50 hover:border-truva-cyan/50 hover:bg-white/5'}`}
                 >
                   <input 
                     ref={fileInputRef}
                     type="file" 
                     className="hidden" 
                     onChange={handleFileInput} 
                     accept=".mem,.raw,.dmp" 
                   />
                   
                   {isUploading ? (
                     <div className="w-full max-w-md flex flex-col items-center gap-6">
                       <div className="relative w-24 h-24">
                         <div className="absolute inset-0 border-4 border-truva-cyan/20 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-truva-cyan rounded-full border-t-transparent animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-truva-cyan">
                           {uploadProgress}%
                         </div>
                       </div>
                       <div className="w-full">
                         <div className="flex justify-between text-xs font-mono mb-2 text-gray-400">
                           <span>{currentHash || "Validating block integrity..."}</span>
                         </div>
                         <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-truva-cyan transition-all duration-300" style={{width: `${uploadProgress}%`}}></div>
                         </div>
                       </div>
                     </div>
                   ) : (
                     <>
                       <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                         <svg className="w-8 h-8 text-gray-400 group-hover:text-truva-cyan transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                       </div>
                       <h3 className="text-white font-bold tracking-wider mb-2">DRAG & DROP MEMORY DUMP</h3>
                       <p className="text-gray-500 text-sm font-mono text-center">
                         Supported formats: .mem, .raw, .dmp<br/>
                         Max size: 32GB
                       </p>
                     </>
                   )}
                 </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
