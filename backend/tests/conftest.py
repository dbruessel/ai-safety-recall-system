# backend/tests/conftest.py
import sys
from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch

# Ensure the backend directory is in the python path for direct app module imports
sys.path.insert(0, str(Path(__file__).parent.parent))

@pytest.fixture(scope="session", autouse=True)
def mock_external_inits():
    """
    Session-level patch to systematically block heavy external initialization routines
    such as Vertex AI or cloud settings lookup from calling real APIs on startup.
    """
    with patch("app.config.init_vertex") as mock_vertex, \
         patch("app.config.get_settings") as mock_settings, \
         patch("google.cloud.firestore.Client") as mock_firestore:
        
        # Configure a reliable structural mock object for application settings
        mock_config = MagicMock()
        mock_config.frontend_origin = "http://localhost:3000"
        mock_settings.return_value = mock_config
        
        # Configure the default mock client instance for database operations
        mock_db = MagicMock()
        mock_firestore.return_value = mock_db
        
        yield {
            "vertex": mock_vertex,
            "settings": mock_config,
            "db": mock_db
        }

@pytest.fixture(scope="function")
def mock_db_collections(mock_external_inits):
    """
    Function-level fixture that hooks into your mocked Firestore engine.
    Yields dictionary reference paths to customize return payloads dynamically per test.
    """
    mock_db = mock_external_inits["db"]
    
    # Isolate functional targets within the database engine
    mock_collections = {
        "recall_tasks": MagicMock(),
        "recalls": MagicMock(),
        "batches": MagicMock(),
        "vins": MagicMock()
    }
    
    def get_collection(name):
        return mock_collections.get(name, MagicMock())
        
    mock_db.collection.side_effect = get_collection
    return mock_collections

@pytest.fixture(scope="module")
def client():
    """
    Initializes the FastAPI TestClient against your application module.
    Exposes functional route traversal endpoints via clean loopback bindings.
    """
    from fastapi.testclient import TestClient
    from app.main import app
    
    with TestClient(app) as test_client:
        yield test_client