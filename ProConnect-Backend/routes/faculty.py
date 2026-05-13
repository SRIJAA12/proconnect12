"""
Faculty Routes - Faculty-specific operations
"""
from flask import request, jsonify
from flask_cors import cross_origin
from bson.objectid import ObjectId
from datetime import datetime
import bcrypt
from config import get_collections
from middleware.auth_middleware import token_required
from . import faculty_bp

@faculty_bp.route('/profile', methods=['GET'])
@cross_origin()
@token_required
def get_profile(current_user):
    """
    Get current faculty profile
    """
    try:
        collections = get_collections()
        faculties = collections['faculties']
        
        # Find faculty
        try:
            faculty = faculties.find_one({'_id': ObjectId(current_user['user_id'])})
        except:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        if not faculty:
            return jsonify({'error': 'Faculty not found'}), 404
        
        # Remove sensitive data
        faculty_data = {
            'id': str(faculty['_id']),
            'email': faculty['email'],
            'name': faculty.get('name', ''),
            'employee_id': faculty.get('employee_id', ''),
            'role': faculty.get('role', 'faculty'),
            'is_active': faculty.get('is_active', True),
            'created_at': faculty.get('created_at'),
            'last_login': faculty.get('last_login')
        }
        
        return jsonify(faculty_data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@faculty_bp.route('/change-password', methods=['POST'])
@cross_origin()
@token_required
def change_password(current_user):
    """
    Change faculty password
    
    Expected JSON:
    {
        "current_password": "old_password",
        "new_password": "new_password"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current and new password are required'}), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        # Validate new password length
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        collections = get_collections()
        faculties = collections['faculties']
        
        # Find faculty
        try:
            faculty = faculties.find_one({'_id': ObjectId(current_user['user_id'])})
        except:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        if not faculty:
            return jsonify({'error': 'Faculty not found'}), 404
        
        # Verify current password
        if not bcrypt.checkpw(current_password.encode('utf-8'), faculty['password_hash']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Hash new password
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update password
        faculties.update_one(
            {'_id': faculty['_id']},
            {'$set': {'password_hash': new_password_hash}}
        )
        
        return jsonify({'message': 'Password changed successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@faculty_bp.route('/stats', methods=['GET'])
@cross_origin()
@token_required
def get_stats(current_user):
    """
    Get statistics about submitted forms
    """
    try:
        collections = get_collections()
        students = collections['students']
        
        # Get total students
        total_students = students.count_documents({})
        
        # Get by branch
        branches_pipeline = [
            {'$group': {'_id': '$basic_info.branch', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]
        branch_stats = list(students.aggregate(branches_pipeline))
        
        # Get by year
        year_pipeline = [
            {'$group': {'_id': '$basic_info.year', 'count': {'$sum': 1}}},
            {'$sort': {'_id': 1}}
        ]
        year_stats = list(students.aggregate(year_pipeline))
        
        # Get recent submissions
        recent_pipeline = [
            {'$sort': {'created_at': -1}},
            {'$limit': 5},
            {'$project': {'basic_info.student_name': 1, 'basic_info.roll_number': 1, 'created_at': 1}}
        ]
        recent_submissions = list(students.aggregate(recent_pipeline))
        
        return jsonify({
            'total_students': total_students,
            'by_branch': branch_stats,
            'by_year': year_stats,
            'recent_submissions': recent_submissions
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
