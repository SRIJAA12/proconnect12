"""
Routes package - contains all API route handlers
"""
from flask import Blueprint

# Create blueprints
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
students_bp = Blueprint('students', __name__, url_prefix='/api/students')
faculty_bp = Blueprint('faculty', __name__, url_prefix='/api/faculty')

# Import routes
from .auth import *
from .students import *
from .faculty import *

__all__ = ['auth_bp', 'students_bp', 'faculty_bp']
