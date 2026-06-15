export const fallbackTrace = {
  events: [
    { offset_ms: 100, type: "agent:state_change", payload: { agent: "planner", status: "active" } },
    { offset_ms: 500, type: "plugin:running", payload: { name: "windows.pslist.PsList", status: "RUNNING" } },
    { offset_ms: 1000, type: "plugin:completed", payload: { name: "windows.pslist.PsList", status: "COMPLETED" } },
    { offset_ms: 1500, type: "finding:created", payload: {
        id: "f1", title: "Suspicious svchost.exe parent PID mismatch",
        severity: "HIGH", confidence_score: 0.6,
        is_hallucination: false, mitre_techniques: ["T1055.012"],
        reasoning_chain: { interpretation: "svchost.exe typically spawned by services.exe, not cmd.exe", confidence_justification: "Requires verification against active handles." }
    }},
    { offset_ms: 2000, type: "investigation:confidence", payload: 0.6 },
    { offset_ms: 2500, type: "agent:state_change", payload: { agent: "verifier", status: "active" } },
    { offset_ms: 3500, type: "plugin:running", payload: { name: "windows.malfind.Malfind", status: "RUNNING" } },
    { offset_ms: 5000, type: "plugin:completed", payload: { name: "windows.malfind.Malfind", status: "COMPLETED" } },
    { offset_ms: 5500, type: "finding:created", payload: {
        id: "f2", title: "Injected Page PAGE_EXECUTE_READWRITE found",
        severity: "CRITICAL", confidence_score: 0.95,
        is_hallucination: false, mitre_techniques: ["T1055"],
        reasoning_chain: { interpretation: "Memory segment with MZ header in svchost.exe", confidence_justification: "Confirmed by cross-referencing pslist and malfind." }
    }},
    { offset_ms: 6000, type: "investigation:confidence", payload: 0.95 },
    { offset_ms: 6500, type: "judge:moment", payload: { type: "CONTRADICTION", message: "Wait, the VAD tag does not match standard PE injection. Checking hollowed process characteristics." } },
    { offset_ms: 7000, type: "investigation:confidence", payload: 0.4 },
    { offset_ms: 7500, type: "finding:created", payload: {
        id: "f3", title: "False Positive PE Injection",
        severity: "LOW", confidence_score: 0.1,
        is_hallucination: true, mitre_techniques: [],
        reasoning_chain: { interpretation: "JIT compiler page initially flagged as malicious", confidence_justification: "VAD analysis confirmed legitimate .NET behavior." }
    }},
    { offset_ms: 8500, type: "investigation:confidence", payload: 0.85 }
  ]
};
