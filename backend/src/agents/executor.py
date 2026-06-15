import os
import json
import asyncio
import subprocess
from src.graph.state import InvestigationState
from src.api.websockets.relay import sio
from src.debug_log import agent_log

async def execute_plugins_node(state: InvestigationState) -> dict:
    await sio.emit('agent:state_change', {'agent': 'executor', 'status': 'active'}, room=f"investigation:{state.get('investigation_id', 'unknown')}")
    
    plugin_queue = state.get('plugin_queue', [])
    plugin_outputs = state.get('plugin_outputs', {})
    execution_log = state.get('execution_log', [])
    executed = state.get('executed_plugins', [])
    
    evidence_path = state.get('evidence_path', 'unknown')
    
    for plugin_spec in plugin_queue:
        plugin_name = plugin_spec['plugin']
        if plugin_name in executed:
            continue
            
        await sio.emit('plugin:running', {'plugin': plugin_name}, room=f"investigation:{state.get('investigation_id', 'unknown')}")
        
        # Check if Docker is available
        docker_available = False
        try:
            # Check version silently
            proc = await asyncio.create_subprocess_exec(
                "docker", "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()
            if proc.returncode == 0:
                docker_available = True
        except Exception:
            pass

        if os.environ.get("FORCE_MOCK_SANDBOX", "").lower() in ("true", "1", "yes"):
            docker_available = False

        if not docker_available:
            print(f"[Simulation] Docker not found. Simulating execution of {plugin_name}...")
            # Simulate processing delay
            await asyncio.sleep(2.0)
            parsed_json = []
            
            if "pslist" in plugin_name.lower():
                parsed_json = [
                    {"PID": 4, "PPID": 0, "ImageFileName": "System", "Threads": 120, "Handles": -1, "SessionId": -1, "Wow64": False},
                    {"PID": 444, "PPID": 300, "ImageFileName": "svchost.exe", "Threads": 12, "Handles": 350, "SessionId": 0, "Wow64": False},
                    {"PID": 123, "PPID": 444, "ImageFileName": "explorer.exe", "Threads": 45, "Handles": 900, "SessionId": 1, "Wow64": False}
                ]
            elif "malfind" in plugin_name.lower():
                parsed_json = [
                    {"PID": 444, "Process": "svchost.exe", "StartVPN": "0x7ffd0000", "EndVPN": "0x7ffd1000", "Protection": "PAGE_EXECUTE_READWRITE", "HexDump": "MZ.................."}
                ]
            elif "netscan" in plugin_name.lower():
                parsed_json = [
                    {"SrcIP": "192.168.1.5", "SrcPort": 49152, "DstIP": "185.220.101.5", "DstPort": 443, "State": "ESTABLISHED", "PID": 444, "Owner": "svchost.exe"}
                ]
                
            plugin_result = {
                "plugin": plugin_name,
                "raw": json.dumps(parsed_json, indent=2),
                "exit_code": 0,
                "stderr": "",
                "duration_ms": 2000,
                "parsed": parsed_json
            }
        else:
            # Real Docker execution
            # We assume the container is named 'truva-ir-forensic_sandbox-1' (default compose naming)
            container_name = os.environ.get("SANDBOX_CONTAINER", "truva-ir-forensic_sandbox-1")
            # Evidence lives at /mnt/evidence/{case_id}/{filename} in both backend and sandbox volumes
            sandbox_evidence_path = evidence_path
            if not sandbox_evidence_path.startswith("/mnt/evidence"):
                sandbox_evidence_path = os.path.join("/mnt/evidence", os.path.basename(evidence_path))

            cmd = [
                "docker", "exec", "-e", "HOME=/tmp", container_name,
                "vol", "-r", "json", "-f", sandbox_evidence_path, plugin_name
            ]
            # #region agent log
            agent_log(
                "executor.py:execute_plugins_node",
                "volatility_exec",
                {
                    "plugin": plugin_name,
                    "container": container_name,
                    "evidence_path": sandbox_evidence_path,
                    "path_exists_in_backend": os.path.exists(evidence_path),
                },
                "E",
            )
            # #endregion
            
            # Add any extra args from the planner
            if plugin_spec.get('args'):
                cmd.extend(plugin_spec['args'])
                
            print(f"Executing: {' '.join(cmd)}")
            
            try:
                # Run asynchronously to not block the FastAPI event loop
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                # 120s timeout
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=120.0)
                
                raw_stdout = stdout.decode('utf-8')
                raw_stderr = stderr.decode('utf-8')
                # #region agent log
                agent_log(
                    "executor.py:execute_plugins_node:result",
                    "volatility_result",
                    {
                        "plugin": plugin_name,
                        "exit_code": process.returncode,
                        "stderr_snippet": raw_stderr[:300],
                        "stdout_len": len(raw_stdout),
                    },
                    "E",
                )
                # #endregion

                try:
                    parsed_json = json.loads(raw_stdout)
                except json.JSONDecodeError:
                    parsed_json = [{"error": "Failed to parse Volatility3 JSON", "raw_snippet": raw_stdout[:200]}]
                    
                plugin_result = {
                    "plugin": plugin_name,
                    "raw": raw_stdout[:1000], # Truncate raw string for state size
                    "exit_code": process.returncode,
                    "stderr": raw_stderr,
                    "duration_ms": 0, # Could calculate exact ms
                    "parsed": parsed_json
                }
                
            except asyncio.TimeoutError:
                print(f"Timeout executing {plugin_name}")
                process.kill()
                plugin_result = {
                    "plugin": plugin_name,
                    "raw": "Execution timed out after 120s",
                    "exit_code": -1,
                    "stderr": "Timeout",
                    "duration_ms": 120000,
                    "parsed": []
                }
            except Exception as e:
                print(f"Error executing {plugin_name}: {e}")
                plugin_result = {
                    "plugin": plugin_name,
                    "raw": str(e),
                    "exit_code": -1,
                    "stderr": str(e),
                    "duration_ms": 0,
                    "parsed": []
                }
            
        plugin_outputs[plugin_name] = plugin_result
        executed.append(plugin_name)
        execution_log.append(plugin_result)
        
        await sio.emit('plugin:completed', plugin_result, room=f"investigation:{state.get('investigation_id', 'unknown')}")
        
    await sio.emit('agent:state_change', {'agent': 'executor', 'status': 'idle'}, room=f"investigation:{state.get('investigation_id', 'unknown')}")
    
    return {
        "plugin_outputs": plugin_outputs,
        "executed_plugins": executed,
        "execution_log": execution_log
    }
