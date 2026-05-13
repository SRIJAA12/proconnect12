"""
Faculty Model - Represents faculty/admin users in the system
"""
from datetime import datetime
from bson.objectid import ObjectId

class Faculty:
    """Faculty model for MongoDB"""
    
    def __init__(self, email, password_hash, employee_id, name=None, created_at=None):
        """
        Initialize a Faculty object
        
        Args:
            email: Faculty email address
            password_hash: Hashed password (bcrypt)
            employee_id: Faculty employee ID
            name: Faculty full name (optional)
            created_at: Creation timestamp (auto-generated if not provided)
        """
        self.email = email
        self.password_hash = password_hash
        self.employee_id = employee_id
        self.name = name or ""
        self.created_at = created_at or datetime.utcnow()
        self.is_active = True
        self.role = "faculty"
    
    def to_dict(self):
        """Convert Faculty object to dictionary for MongoDB storage"""
        return {
            'email': self.email,
            'password_hash': self.password_hash,
            'employee_id': self.employee_id,
            'name': self.name,
            'created_at': self.created_at,
            'is_active': self.is_active,
            'role': self.role
        }
    
    @staticmethod
    def from_dict(data):
        """Create Faculty object from MongoDB document"""
        if data is None:
            return None
        
        faculty = Faculty(
            email=data.get('email'),
            password_hash=data.get('password_hash'),
            employee_id=data.get('employee_id'),
            name=data.get('name'),
            created_at=data.get('created_at')
        )
        faculty.is_active = data.get('is_active', True)
        return faculty
