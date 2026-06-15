import React, { useState } from 'react';
import { exportInvestigationJSON, exportInvestigationMarkdown, exportInvestigationPDF } from '../../utils/exportUtils';

interface BenchmarkOverlayProps {
  investigationId: string;
  findings: any[];
  overallConfidence: number;
  report?: any;
  onClose: () => void;
}

export const BenchmarkOverlay: React.FC<BenchmarkOverlayProps> = ({ 
  investigationId, 
  findings, 
  overallConfidence,
  report,
  onClose 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const totalFindings = findings.length;
  const hallucinations = findings.filter(f => f.is_hallucination).length;
  const truePositives = totalFindings - hallucinations;
  const accuracy = totalFindings > 0 ? (truePositives / totalFindings) * 100 : 0;

  const exportData = {
    investigationId,
    overallConfidence,
    findings,
    report
  };

  const handlePdfExport = async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Yield thread to allow React to render "Generating Report..."
      await new Promise(resolve => setTimeout(resolve, 50));
      exportInvestigationPDF(exportData, `TRUVA_Report.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      setExportError("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="max-w-4xl w-full bg-[#0a0f18] border border-truva-cyan/30 rounded-2xl shadow-[0_0_50px_rgba(0,242,254,0.1)] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <svg className="w-6 h-6 text-truva-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              FORENSIC BENCHMARK
            </h2>
            <p className="text-gray-400 font-mono text-xs mt-1 uppercase tracking-widest">ID: {investigationId}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Main Stat Card */}
          <div className="md:col-span-4 bg-black/40 rounded-xl p-8 border border-white/5 flex items-center justify-between relative overflow-hidden group">
            <div className={`absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-screen pointer-events-none`}></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-truva-cyan rounded-full blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity duration-1000"></div>
            
            <div>
              <h3 className="text-gray-400 font-mono text-sm tracking-widest uppercase mb-2">Net Autonomous Accuracy</h3>
              <div className="text-6xl font-black text-white">{accuracy.toFixed(1)}<span className="text-3xl text-truva-cyan">%</span></div>
            </div>
            
            <div className="text-right">
              <h3 className="text-gray-400 font-mono text-sm tracking-widest uppercase mb-2">System Confidence</h3>
              <div className="text-4xl font-bold text-white">{(overallConfidence * 100).toFixed(1)}<span className="text-xl text-gray-500">%</span></div>
            </div>
          </div>

          {/* Sub Stats */}
          <div className="bg-[#0f1524] rounded-xl p-6 border border-white/5">
            <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-2">Total Extractions</div>
            <div className="text-3xl font-bold text-white">{totalFindings}</div>
          </div>
          
          <div className="bg-emerald-950/20 rounded-xl p-6 border border-emerald-500/20">
            <div className="text-emerald-500/70 text-xs font-mono uppercase tracking-widest mb-2">True Positives</div>
            <div className="text-3xl font-bold text-emerald-400">{truePositives}</div>
          </div>

          <div className="bg-red-950/20 rounded-xl p-6 border border-red-500/20">
            <div className="text-red-500/70 text-xs font-mono uppercase tracking-widest mb-2">Hallucinations Caught</div>
            <div className="text-3xl font-bold text-red-500">{hallucinations}</div>
          </div>

          <div className="bg-[#0f1524] rounded-xl p-6 border border-white/5 flex flex-col justify-center">
             <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-2">Execution Mode</div>
             <div className="text-sm font-bold text-truva-cyan">Agentic Graph (Replay)</div>
          </div>

        </div>

        {/* Footer / Exports */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex flex-col gap-4">
          {exportError && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded text-sm font-mono flex items-center justify-between">
              <span>{exportError}</span>
              <button onClick={() => setExportError(null)} className="text-red-400 hover:text-white">✕</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-mono">TRUVA-IR Autonomous Forensic Verification System</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => exportInvestigationJSON(exportData, `truva_report_${investigationId.substring(0,8)}.json`)}
                disabled={isExporting}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono uppercase tracking-widest rounded transition-colors disabled:opacity-50"
              >
                JSON
              </button>
              <button 
                onClick={() => exportInvestigationMarkdown(exportData, `truva_report_${investigationId.substring(0,8)}.md`)}
                disabled={isExporting}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono uppercase tracking-widest rounded transition-colors disabled:opacity-50"
              >
                Markdown
              </button>
              <button 
                onClick={handlePdfExport}
                disabled={isExporting}
                className="px-6 py-2 bg-truva-cyan hover:bg-[#00d0ff] text-black font-bold text-xs font-mono uppercase tracking-widest rounded shadow-[0_0_15px_rgba(0,242,254,0.3)] hover:shadow-[0_0_25px_rgba(0,242,254,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    Generating Report...
                  </>
                ) : (
                  "Download PDF Report"
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
