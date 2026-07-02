import asyncio
import json
import os
from app.services.workflow_executor import WorkflowExecutor

async def main():
    # 1. Point to your matrices directory
    matrices_dir = os.path.join("tests", "matrices")
    
    if not os.path.exists(matrices_dir):
        print(f"❌ Cannot find directory at: {matrices_dir}")
        return

    # 2. Get all JSON files in the folder
    matrix_files = [f for f in os.listdir(matrices_dir) if f.endswith('.json')]
    
    if not matrix_files:
        print("❌ No JSON task matrices found to execute.")
        return

    print(f"🔍 Found {len(matrix_files)} task matrices in the test suite.")

    # 3. Initialize the executor pointing to your local FastAPI server
    executor = WorkflowExecutor(base_url="http://127.0.0.1:8000")

    # 4. Loop through and execute every matrix sequentially
    for filename in matrix_files:
        matrix_path = os.path.join(matrices_dir, filename)
        
        with open(matrix_path, "r") as f:
            matrix = json.load(f)

        print(f"\n🚀 Initializing AI Agent Matrix: {matrix.get('workflow_id', filename)}")
        
        # Execute the workflow trace
        await executor.execute(matrix)
        
    print("\n🏁 All Agent Workflow Executions Complete!")

if __name__ == "__main__":
    asyncio.run(main())