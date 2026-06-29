import os
import sys
from unittest.mock import patch
import pytest

# Programmatically resolve the exact absolute root location of your backend workspace
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# RESOLUTION: Inject the backend root into Python's module search paths.
# This unblocks importlib and pytest, allowing statements like `from app.config import settings`
# to discover your application packages cleanly.
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)


@pytest.fixture(scope="session", autouse=True)
def mock_external_inits():
    """
    Session-level patch to systematically block heavy external initialization routines
    such as Vertex AI or cloud settings lookup from calling real APIs on startup.
    """
    # Overwrite the environment runtime environment fallback right at test startup 
    # so Pydantic knows exactly where to load your active variables file
    os.environ["ENV_FILE_PATH"] = os.path.join(BACKEND_ROOT, ".env")

    with patch("app.config.init_vertex") as mock_vertex, \
         patch("google.cloud.firestore.Client") as mock_firestore:
        yield