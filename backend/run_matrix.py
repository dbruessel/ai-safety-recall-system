import asyncio
import json
import os
from app.services.workflow_executor import WorkflowExecutor

async def main():
    # 1. Point to your JSON matrix
    matrix_path = os.path.join("tests", "matrices", "freemium_conversion_flow.json")
    
    if not os.path.exists(matrix_path):
        print(f"❌ Cannot find matrix at: {matrix_path}")
        return

    with open(matrix_path, "r") as f:
        matrix = json.load(f)

    print(f"🚀 Initializing AI Agent Matrix: {matrix.get('workflow_id')}")

    # 2. Initialize the executor pointing to your local FastAPI server
    executor = WorkflowExecutor(base_url="http://127.0.0.1:8000")

    # 3. Execute the workflow trace
    await executor.execute(matrix)
    print("🏁 Agent Workflow Execution Complete!")

if __name__ == "__main__":
    asyncio.run(main())