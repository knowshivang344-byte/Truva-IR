# TRUVA-IR: 5-Minute SANS Hackathon Demo Script

*Preparation: Ensure `docker-compose up -d` is running. Run `python backend/scripts/generate_flagship_trace.py` once to seed the telemetry. Have `localhost:3000` open on the Dashboard.*

## [0:00 - 1:00] The Hook: Machine Speed Defense
**Presenter:** "Attackers operate at machine speed. As defenders, we are constantly drowning in alerts and complex artifacts—like memory dumps—that take hours to manually parse and correlate. We built **TRUVA-IR**, an autonomous memory forensics operating system powered by Gemini 2.5 Flash, to level the playing field."

*(Click the "SANS Hackathon Demo" button on the Dashboard. Do not click anything else. Let the Cinematic Intro Sequence play out.)*

**Presenter:** "What you're about to see is not simulated frontend magic. This is a deterministic replay of a real LangGraph orchestration execution, captured from our backend PostgreSQL database, played back millisecond-by-millisecond for this demonstration."

## [1:00 - 2:00] The Engine & Initial Hypothesis
*(The Judge Mode playback begins. The Reasoning Graph will start building.)*

**Presenter:** "TRUVA-IR orchestrates four specialized AI agents—a Planner, an Executor, a Verifier, and a Reporter. The system is currently ingesting an infected Windows memory dump."
"Notice the Planner agent waking up. It forms an initial hypothesis: *'This looks like a standard backdoor.'* It tells the Executor to run `pslist` inside our isolated Docker sandbox."

*(Point to the Finding Stream as the first finding appears)*
**Presenter:** "The Verifier parses the Volatility JSON. It sees `svchost.exe` running. No immediate malicious vectors. Watch our Overall Confidence score drop to 40%."

## [2:00 - 3:00] The Judge Moment: Contradiction & Self-Correction
*(Wait for the Red "Senior Analyst Insight: CONTRADICTION" modal to flash on screen)*

**Presenter:** "This is where TRUVA-IR separates itself from standard automation scripts. The Verifier agent caught a contradiction: *'We suspect malware, but we found nothing.'* Instead of hallucinating a threat to please the user, it rejects the finding and triggers a self-correction loop."

*(Point to the Agent States)*
**Presenter:** "The Planner wakes back up. It reads the iteration memory, realizes `pslist` wasn't enough, and pivots the investigation to look for injected memory. It executes `malfind`."

## [3:00 - 4:00] Validation & Narrative
*(Wait for the Green "Senior Analyst Insight: SELF_CORRECTION" modal to flash)*

**Presenter:** "The Executor runs `malfind`. The Verifier instantly parses the output and detects a Page_Execute_ReadWrite (RWX) memory segment inside `svchost.exe` without a backing file on disk. This is a definitive signature of Process Hollowing."
"Our confidence skyrockets to 95%. If you click on the finding, you can see the **Analyst Explanation Layer**—the AI explicitly justifies *why* this is forensically significant."

## [4:00 - 5:00] Export & Conclusion
*(Point to the Export buttons at the top right)*

**Presenter:** "Finally, judges love artifacts. We built a client-side PDF export engine that generates a court-ready, MITRE ATT&CK-mapped executive report instantly, without bloating our Docker backend."

*(Click the PDF Export button and open the downloaded PDF)*

**Presenter:** "TRUVA-IR proves that with rigorous validation, structured JSON outputs, and adversarial agent verification, we can deploy autonomous DFIR analysts that we actually trust."
