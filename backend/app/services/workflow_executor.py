import httpx
import logging
import json
import datetime
import os
from typing import Dict, Any

# Setup structured logging
logger = logging.getLogger("workflow-executor")
logging.basicConfig(level=logging.INFO)

class WorkflowExecutor:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url)
        # Ensure logs directory exists for our audit trails
        os.makedirs("backend/logs", exist_ok=True)

    async def execute(self, matrix: Dict[str, Any]):
        """
        Parses a workflow matrix and executes steps sequentially with full observability.
        """
        print(f"--- Starting Workflow: {matrix.get('workflow_id')} ---")
        
        audit_trail = {
            "workflow_id": matrix.get('workflow_id'),
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "steps": []
        }
        
        for step in matrix.get('steps', []):
            logger.info(f"Executing Step {step['step']}: {step['action']}")
            
            # Dispatch the action
            response = await self.dispatch(step)
            
            # Safe JSON parsing to prevent agent crashes on 500 Server Errors
            try:
                parsed_response = response.json() if response.status_code != 204 else {}
            except Exception:
                parsed_response = {"raw_text": response.text}
            
            # Collect trace data for audit
            step_trace = {
                "step": step['step'],
                "action": step['action'],
                "status": response.status_code,
                "response": parsed_response
            }
            audit_trail["steps"].append(step_trace)
            
            # Safe fallback for expected status (Defaults to 200 to prevent KeyError)
            expected_status = step.get('expected_status', 200)
            success = response.status_code == expected_status
            
            if not success:
                logger.error(f"Step {step['step']} failed! Expected {expected_status}, got {response.status_code}. Response: {response.text}")
                break
        
        # Serialization for PM reporting
        timestamp = int(datetime.datetime.now().timestamp())
        log_path = f"backend/logs/audit_{matrix['workflow_id']}_{timestamp}.json"
        with open(log_path, "w") as f:
            json.dump(audit_trail, f, indent=2)
            
        logger.info(f"Audit trail saved to {log_path}")
        return audit_trail

    async def dispatch(self, step: Dict[str, Any]):
        """
        Maps JSON action identifiers to API operations.
        """
        action = step['action']
        
        if action == "RESET_STATE":
            # Fixes the 404 by pointing to the correct route and passes the required security header
            return await self.client.post(
                "/sandbox/reset", 
                headers={"x-sandbox-key": "RECALL_LOGIC_LOCAL_ONLY_SECRET"}
            )
            
        elif action == "UPLOAD_MANIFEST":
            # 1. Read the requested VIN count from your JSON matrix (defaults to 12)
            vin_count = step.get('payload', {}).get('vin_count', 12)
            
            # 2. Generate a mock CSV string dynamically based on that count
            csv_content = "vin\n" + "\n".join([f"1FA6P8CF0HVALID{i:02d}" for i in range(vin_count)])
            
            # 3. Package it as a multipart/form-data file payload
            files = {"file": ("manifest.csv", csv_content, "text/csv")}
            
            # 4. Send using the 'files' parameter instead of 'json' to satisfy FastAPI
            return await self.client.post("/api/batches/upload", files=files)
            
        elif action == "TRIGGER_STRIPE_MOCK":
            return await self.client.post("/sandbox/mock-checkout", json=step.get('metadata', {}))
            
        elif action == "VERIFY_TIER_UPGRADE":
            return await self.client.get("/api/metrics/global")
            
        raise ValueError(f"Unknown action: {action}")