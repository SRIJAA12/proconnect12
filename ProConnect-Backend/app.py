"""
ProConnect Backend - Main Flask Application
Flask server with MongoDB integration
"""
import sys
# Ensure UTF-8 output on Windows so emoji in log messages don't crash the server
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from flask import Flask, jsonify
from flask_cors import CORS
from config import db, Config
from routes import auth_bp, students_bp, faculty_bp

# Initialize Flask app
app = Flask(__name__)

# Load configuration
app.config.from_object(Config)

# Enable CORS (Cross-Origin Resource Sharing)
# This allows your React frontend to communicate with this Flask backend
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "",
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Register blueprints (route groups)
app.register_blueprint(auth_bp)
app.register_blueprint(students_bp)
app.register_blueprint(faculty_bp)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify server is running
    """
    return jsonify({
        'status': 'healthy',
        'message': 'ProConnect Backend is running',
        'version': '1.0.0'
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({'error': 'Method not allowed'}), 405

# Request logging middleware (optional)
@app.before_request
def log_request():
    """Log incoming requests"""
    from flask import request
    print(f">> {request.method} {request.path}")

if __name__ == '__main__':
    """
    Start the Flask development server

    For production, use a proper WSGI server like Gunicorn:
    gunicorn -w 4 app:app
    """
    print("=" * 60)
    print("ProConnect Backend Starting...")
    print("=" * 60)

    if db is None:
        print("FAILED to connect to MongoDB. Please check your connection string.")
        sys.exit(1)

    print(f"[OK] Database: Connected to '{Config.DB_NAME}'")
    print(f"[OK] Environment: {Config.FLASK_ENV}")
    print(f"[OK] Debug Mode: {app.debug}")
    print("=" * 60)
    print(f"Server running at http://{Config.HOST}:{Config.PORT}")
    print("=" * 60)
    print("\nAPI Endpoints:")
    print("  POST   /api/auth/signup                   - Faculty signup")
    print("  POST   /api/auth/login                    - Faculty login")
    print("  POST   /api/auth/student/register         - Student signup")
    print("  POST   /api/auth/student/login            - Student login")
    print("  POST   /api/auth/verify-token             - Verify JWT token")
    print("  POST   /api/auth/refresh-token            - Refresh JWT token")
    print("  POST   /api/students/submit               - Submit student form")
    print("  GET    /api/students/self                 - Get own student record")
    print("  GET    /api/students                      - Get all students (faculty)")
    print("  GET    /api/students/<id>                 - Get single student (faculty)")
    print("  PUT    /api/students/<id>                 - Update student (faculty)")
    print("  DELETE /api/students/<id>                 - Delete student (faculty)")
    print("  GET    /api/faculty/profile               - Get faculty profile")
    print("  POST   /api/faculty/change-password       - Change password")
    print("  GET    /api/faculty/stats                 - Get statistics")
    print("  GET    /api/health                        - Health check")
    print("=" * 60)

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
