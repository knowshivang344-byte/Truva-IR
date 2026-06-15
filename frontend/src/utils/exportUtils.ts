import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Export as raw JSON
export const exportInvestigationJSON = (data: any, fileName = 'investigation-export.json') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export as formatted Markdown
export const exportInvestigationMarkdown = (data: any, fileName = 'investigation-report.md') => {
  const { investigationId, overallConfidence, findings, report } = data;
  
  let md = `# TRUVA-IR Autonomous Investigation Report\n`;
  md += `**Investigation ID:** ${investigationId}\n`;
  md += `**Overall Confidence:** ${((overallConfidence || 0) * 100).toFixed(0)}%\n\n`;
  
  if (report) {
      md += `## Executive Summary\n${report.executive_summary}\n\n`;
      if (report.mitre_attack_summary?.length > 0) {
          md += `### MITRE ATT&CK Mapping\n`;
          report.mitre_attack_summary.forEach((t: string) => md += `- ${t}\n`);
          md += `\n`;
      }
  }

  md += `## Validated Findings\n`;
  if (findings && findings.length > 0) {
      findings.forEach((f: any, idx: number) => {
        md += `### ${idx + 1}. [${f.severity || 'UNKNOWN'}] ${f.title || 'Untitled'}\n`;
        if (f.is_hallucination) md += `**REJECTED BY VERIFICATION ENGINE**\n`;
        md += `- **Confidence:** ${((f.confidence_score || 0) * 100).toFixed(0)}%\n`;
        if (f.reasoning_chain) {
            md += `- **Interpretation:** ${f.reasoning_chain.interpretation}\n`;
            md += `- **Forensic Significance:** ${f.reasoning_chain.forensic_significance}\n`;
        }
        md += `\n`;
      });
  } else {
      md += `*No findings available*\n`;
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export as PDF (Client-side)
export const exportInvestigationPDF = (data: any, fileName = 'TRUVA_Report.pdf') => {
  console.log('PDF export starting');
  console.log('Telemetry payload:', data);
  
  try {
      const investigationId = data?.investigationId || 'UNKNOWN-ID';
      const overallConfidence = data?.overallConfidence || 0;
      const findings = data?.findings || [];
      const report = data?.report || null;
      
      const doc = new jsPDF();
      
      // TRUVA-IR Branding Colors
      const cyan = [0, 242, 254] as [number, number, number];
      const darkBlue = [15, 21, 36] as [number, number, number];
      
      // Header
      doc.setFillColor(...darkBlue);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(...cyan);
      doc.setFont("helvetica", "bold");
      doc.text("TRUVA-IR", 14, 22);
      
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "normal");
      doc.text("Autonomous Forensic Report", 60, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Investigation ID: ${investigationId}`, 14, 32);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 32);

      // Benchmark Stats Section
      let yPos = 50;
      
      const totalFindings = findings.length;
      const hallucinations = findings.filter((f: any) => f.is_hallucination).length;
      const truePositives = totalFindings - hallucinations;
      const accuracy = totalFindings > 0 ? ((truePositives / totalFindings) * 100).toFixed(1) : "0.0";
      
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Benchmark Statistics", 14, yPos);
      
      yPos += 10;
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      doc.text(`System Confidence: ${(overallConfidence * 100).toFixed(1)}%`, 14, yPos);
      doc.text(`Net Autonomous Accuracy: ${accuracy}%`, 110, yPos);
      yPos += 7;
      doc.text(`Total Extractions: ${totalFindings}`, 14, yPos);
      doc.text(`True Positives: ${truePositives}`, 110, yPos);
      yPos += 7;
      doc.text(`Hallucinations Caught: ${hallucinations}`, 14, yPos);
      
      yPos += 15;
      
      if (report && report.executive_summary) {
          doc.setFontSize(14);
          doc.setTextColor(40, 40, 40);
          doc.setFont("helvetica", "bold");
          doc.text("Executive Summary", 14, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.setFont("helvetica", "normal");
          const splitText = doc.splitTextToSize(report.executive_summary || "No summary provided", 180);
          doc.text(splitText, 14, yPos);
          yPos += (splitText.length * 5) + 12;
      }

      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Validated Findings", 14, yPos);
      yPos += 8;

      if (totalFindings === 0) {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "italic");
          doc.text("No findings available for this investigation.", 14, yPos);
      } else {
          try {
              const tableData = findings.map((f: any) => [
                  f.severity || 'UNKNOWN',
                  f.title || 'Untitled Finding',
                  `${((f.confidence_score || 0) * 100).toFixed(0)}%`,
                  f.is_hallucination ? 'Rejected' : 'Confirmed'
              ]);

              autoTable(doc, {
                  startY: yPos,
                  head: [['Severity', 'Finding Title', 'Confidence', 'Status']],
                  body: tableData,
                  theme: 'grid',
                  headStyles: { fillColor: darkBlue, textColor: cyan },
                  alternateRowStyles: { fillColor: [245, 247, 250] },
                  styles: { fontSize: 9, cellPadding: 4 },
                  didParseCell: function (data: any) {
                      if (data.section === 'body' && data.column.index === 3) {
                          if (data.cell.raw === 'Rejected') {
                              data.cell.styles.textColor = [220, 53, 69]; // Red
                              data.cell.styles.fontStyle = 'bold';
                          } else if (data.cell.raw === 'Confirmed') {
                              data.cell.styles.textColor = [40, 167, 69]; // Green
                              data.cell.styles.fontStyle = 'bold';
                          }
                      }
                  }
              });
          } catch (tableErr) {
              console.error("AutoTable rendering failed. Falling back to plain text:", tableErr);
              // Graceful fallback if autoTable crashes
              doc.setFontSize(10);
              doc.setTextColor(60, 60, 60);
              doc.setFont("helvetica", "normal");
              let currentY = yPos;
              findings.forEach((f: any, i: number) => {
                  const line = `${i+1}. [${f.severity || 'UNKNOWN'}] ${f.title} - ${f.is_hallucination ? 'REJECTED' : 'CONFIRMED'}`;
                  doc.text(line, 14, currentY);
                  currentY += 6;
              });
          }
      }

      doc.save(fileName);
      console.log('PDF export completed successfully');
      
  } catch (err) {
      console.error("CRITICAL EXCEPTION IN PDF EXPORT:", err);
      throw err; // Re-throw to trigger toast in component
  }
};

