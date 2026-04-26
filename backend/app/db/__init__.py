# Exportaciones del paquete db para acceso conveniente
from app.db.firestore import get_db, init_firestore, Collections
from app.db.mongodb import get_mongo_db, init_mongodb, close_mongodb, MongoCollections

__all__ = [
    "get_db", "init_firestore", "Collections",
    "get_mongo_db", "init_mongodb", "close_mongodb", "MongoCollections",
]
