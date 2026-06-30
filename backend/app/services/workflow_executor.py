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
            
            # Collect trace data for audit
            step_trace = {
                "step": step['step'],
                "action": step['action'],
                "status": response.status_code,
                "response": response.json() if response.status_code != 204 else {}
            }
            audit_trail["steps"].append(step_trace)
            
            # Validation logic
            success = response.status_code == step.get('expected_status', 200)
            
            if not success:
                logger.error(f"Step {step['step']} failed! Expected {step['expected_status']}, got {response.status_code}")
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
            return await self.client.post("/api/sandbox/reset")
            
        elif action == "UPLOAD_MANIFEST":
            # Using the defined payload from your JSON matrix
            return await self.client.post("/api/upload", json=step.get('payload', {}))
            
        elif action == "TRIGGER_STRIPE_MOCK":
            return await self.client.post("/api/sandbox/mock-checkout", json=step.get('metadata', {}))
            
        raise ValueError(f"Unknown action: {action}")