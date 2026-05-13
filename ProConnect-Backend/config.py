"""
Configuration for Flask Application and MongoDB Connection
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from urllib.parse import quote_plus

# Load environment variables from the backend .env first, then fall back to the
# current working directory so local and production launches both work.
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / '.env')
load_dotenv()

class Config:
    """Base configuration"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', False)
    
    # JWT Configuration
    JWT_SECRET = os.getenv('JWT_SECRET', 'jwt-secret-key')
    JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', 24))
    
    # MongoDB Configuration
    MONGODB_URI = os.getenv('MONGODB_URI')
    DB_NAME = os.getenv('DB_NAME', 'proconnect')
    
    # Server Configuration
    HOST = os.getenv('HOST', 'localhost')
    PORT = int(os.getenv('PORT', 5000))

def get_db_connection():
    """
    Create and return MongoDB connection
    Returns the database instance
    """
    try:
        client = MongoClient(Config.MONGODB_URI)
        # Test the connection
        client.admin.command('ping')
        print("[OK] Connected to MongoDB successfully!")
        return client[Config.DB_NAME]
    except Exception as e:
        print(f"[FAIL] Failed to connect to MongoDB: {e}")
        raise

# Initialize database connection
try:
    db = get_db_connection()
except:
    db = None

# Collection references
def get_collections():
    """Get references to all collections"""
    if db is None:
        raise Exception("Database connection not established")
    
    return {
        'faculties': db['faculties'],
        'students': db['students'],
        'users': db['users'],
        'student_credentials': db['student_credentials']
    }
