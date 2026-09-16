from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from typing import Any, Union
from app.config import settings
import logging

logger = logging.getLogger("skillswap.database")

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(settings.MONGO_URI)
        # Verify connection
        db = client.get_default_database(default="test")
        await client.admin.command('ping')
        logger.info("✅ Connected to MongoDB successfully!")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        raise e

async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")

def get_db() -> AsyncIOMotorDatabase:
    return db

def to_object_id(val: Any) -> Union[ObjectId, None]:
    if isinstance(val, ObjectId):
        return val
    if isinstance(val, str) and ObjectId.is_valid(val):
        return ObjectId(val)
    return None

def serialize_doc(doc: Any) -> Any:
    """Recursively convert MongoDB document BSON fields (ObjectId, datetime) to JSON serializable types."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                result[k] = serialize_doc(v)
            else:
                result[k] = v
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc
