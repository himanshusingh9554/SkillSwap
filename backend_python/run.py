import uvicorn
import os
import sys

# Ensure backend_python is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from app.config import settings

if __name__ == "__main__":
    print(f"🚀 Starting SkillSwap FastAPI Server on http://localhost:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True
    )
