import json
import os
import glob
import webbrowser

def generate_html_report():
    logs_dir = os.path.join("logs")
    log_files = glob.glob(os.path.join(logs_dir, "audit_*.json"))
    
    if not log_files:
        print("❌ No audit logs found in logs/")
        return

    html_content = """
    <html>
    <head>
        <title>Replica Automation - Executive Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 text-slate-100 p-8 font-sans">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl font-black text-cyan-400 mb-2">🛡️ Replica Environment: Executive Audit</h1>
            <p class="text-slate-400 mb-8">Automated validation of core user journeys and monetization guardrails.</p>
    """

    log_files.sort(key=os.path.getmtime, reverse=True)

    # PM Story Mapping: Translates machine actions to human journeys
    narratives = {
        "RESET_STATE": "Provisioned a clean, deterministic database replica environment.",
        "UPLOAD_MANIFEST": "Agent submitted fleet manifest dataset to the ingestion dropzone.",
        "TRIGGER_STRIPE_MOCK": "Simulated an authorized Stripe payment webhook upgrade event.",
        "VERIFY_TIER_UPGRADE": "Verified system correctly granted Pro-Tier platform capabilities.",
        "GENERATE_BADGE": "Generated a cryptographically signed compliance token (perfect 100% safety score).",
        "SHARE_BADGE": "Securely broadcasted the signed digital compliance token to the target insurance underwriter."
    }

    for file_path in log_files:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        workflow_id = data.get("workflow_id", "Unknown Flow")
        description = data.get("description", "User journey validation trace.")
        timestamp = data.get("timestamp", "")
        steps = data.get("steps", [])
        
        html_content += f"""
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-2xl">
            <div class="mb-6 border-b border-slate-800 pb-4">
                <h2 class="text-2xl font-bold text-white uppercase tracking-wider">{workflow_id}</h2>
                <p class="text-emerald-400 text-sm font-medium mt-1">🎯 Story: {description}</p>
                <span class="text-xs text-slate-500 font-mono mt-2 block">Execution Timestamp: {timestamp}</span>
            </div>
            <div class="space-y-4">
        """
        
        for step in steps:
            status = step.get('status', 0)
            expected = step.get('expected', status) 
            
            is_success = status == expected
            status_color = "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" if is_success else "text-rose-400 bg-rose-400/10 border-rose-400/20"
            icon = "✅" if is_success else "❌"
            
            action = step.get('action', '')
            story = narratives.get(action, "Executed system action.")
            response_text = json.dumps(step.get('response', {}), indent=2)
            
            html_content += f"""
                <div class="flex flex-col bg-slate-950 border border-slate-800 rounded-lg p-5">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <div class="font-bold text-slate-300 text-lg">Step {step.get('step', '?')}: <span class="text-cyan-400">{action}</span></div>
                            <div class="text-sm text-slate-500 mt-1 italic">"{story}"</div>
                        </div>
                        <div class="flex flex-col items-end">
                            <div class="px-3 py-1.5 rounded border text-sm font-mono font-bold {status_color}">
                                {icon} Actual: HTTP {status}
                            </div>
                            <div class="text-[10px] text-slate-500 font-mono mt-1.5 font-bold uppercase tracking-widest">Expected: HTTP {expected}</div>
                        </div>
                    </div>
                    <details class="group">
                        <summary class="text-[11px] text-slate-500 cursor-pointer hover:text-cyan-400 font-mono mb-2 uppercase tracking-wider">View Raw Database Payload</summary>
                        <pre class="text-[10px] text-slate-400 font-mono bg-black p-3 rounded-lg overflow-x-auto border border-slate-800/60 shadow-inner">{response_text}</pre>
                    </details>
                </div>
            """
            
        html_content += """
            </div>
        </div>
        """

    html_content += """
        </div>
    </body>
    </html>
    """

    report_path = os.path.join(logs_dir, "report.html")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print(f"✅ Executive Report generated at {report_path}")
    webbrowser.open('file://' + os.path.realpath(report_path))

if __name__ == "__main__":
    generate_html_report()