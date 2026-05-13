"""
Authentication Middleware - JWT token verification
"""
import jwt
from functools import wraps
from flask import request, jsonify
from config import Config

def verify_token(token):
    """
    Verify JWT token and return user data
    
    Args:
        token: JWT token string
    
    Returns:
        Dictionary with user data if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """
    Decorator to protect routes with JWT authentication
    
    Usage:
        @app.route('/protected')
        @token_required
        def protected_route():
            pass
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Format: "Bearer <token>"
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid authorization header'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Verify token
        payload = verify_token(token)
        if payload is None:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Pass user data to the route
        kwargs['current_user'] = payload
        return f(*args, **kwargs)
    
    return decorated

def generate_token(user_id, email, role):
    """
    Generate JWT token for user
    
    Args:
        user_id: User's MongoDB ObjectId as string
        email: User's email
        role: User's role (faculty/admin)
    
    Returns:
        JWT token string
    """
    import datetime
    
    payload = {
        'user_id': str(user_id),
        'email': email,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': datetime.datetime.utcnow()
    }
    
    token = jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')
    return token
