"""
Student Routes - Student form submission and data retrieval
"""
from flask import request, jsonify
from flask_cors import cross_origin
from bson.objectid import ObjectId
from datetime import datetime
from config import get_collections
from models.student import Student
from middleware.auth_middleware import token_required
from . import students_bp


def serialize_mongo_value(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (bytes, bytearray)):
        try:
            return value.decode('utf-8')
        except Exception:
            return str(value)
    if isinstance(value, list):
        return [serialize_mongo_value(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize_mongo_value(item) for key, item in value.items()}
    return value


def serialize_student_document(student):
    return {key: serialize_mongo_value(value) for key, value in student.items()}


def derive_display_name(email, roll_number=''):
    """Create a readable fallback display name from email or roll number."""
    source = (email or '').split('@')[0].strip()
    if not source:
        source = roll_number.strip()

    cleaned = source.replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
    if not cleaned:
        return roll_number or email or ''

    return ' '.join(word.capitalize() for word in cleaned.split())


@students_bp.route('/self', methods=['GET'])
@cross_origin()
def get_student_self():
    """
    Get student record for self-edit flow.

    Query Parameters:
        - roll_number: Student roll number (required)
        - email: Student email used during login/signup (required)
    """
    try:
        roll_number = request.args.get('roll_number', '').strip().upper()  # Normalize to uppercase
        email = request.args.get('email', '').strip().lower()

        if not roll_number or not email:
            return jsonify({'error': 'roll_number and email are required'}), 400

        collections = get_collections()
        students = collections['students']
        creds_col = collections['student_credentials']

        # Student data is stored inside basic_info; support both top-level and nested lookup
        student = students.find_one({
            '$or': [
                {
                    'basic_info.roll_number': {'$regex': f'^{roll_number}$', '$options': 'i'},
                    'basic_info.college_mail': {'$regex': f'^{email}$', '$options': 'i'}
                },
                {
                    'roll_number': {'$regex': f'^{roll_number}$', '$options': 'i'},
                    'email': {'$regex': f'^{email}$', '$options': 'i'}
                }
            ]
        })

        if not student:
            return jsonify({'error': 'Student record not found'}), 404

        return jsonify(serialize_student_document(student)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@students_bp.route('/submit', methods=['POST'])
@cross_origin()
def submit_student_form():
    """
    Submit Student Form Data
    
    Expected JSON:
    {
        "basic_info": {
            "student_name": "John Doe",
            "roll_number": "19BCE001",
            "mobile_no": "9876543210",
            "parent_mobile": "9876543211",
            "personal_mail": "john@email.com",
            "college_mail": "john@psgtech.ac.in",
            "branch": "CSE",
            "section": "A",
            "year": "4"
        },
        "parent_details": {
            "mother": {...},
            "father": {...},
            "guardian": {...}
        },
        "siblings": [...],
        "relatives": [...]
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('basic_info'):
            return jsonify({'error': 'Basic information is required'}), 400
        
        if not data.get('parent_details'):
            return jsonify({'error': 'Parent details are required'}), 400
        
        collections = get_collections()
        students = collections['students']
        
        # Normalize emails to lowercase in basic_info
        basic_info = data.get('basic_info', {})
        if 'personal_mail' in basic_info:
            basic_info['personal_mail'] = basic_info['personal_mail'].lower().strip()
        if 'college_mail' in basic_info:
            basic_info['college_mail'] = basic_info['college_mail'].lower().strip()
        
        # Derive top-level roll_number and email for fast lookups
        roll_number = basic_info.get('roll_number', '').strip().upper()
        email = basic_info.get('college_mail', '').lower().strip()
        
        # Create student object
        student = Student(
            basic_info=basic_info,
            parent_details=data.get('parent_details'),
            siblings=data.get('siblings', []),
            relatives=data.get('relatives', []),
            roll_number=roll_number,
            email=email
        )
        
        # Check for duplicate submission (by roll number inside basic_info OR top-level)
        if roll_number:
            existing = students.find_one({
                '$or': [
                    {'basic_info.roll_number': {'$regex': f'^{roll_number}$', '$options': 'i'}},
                    {'roll_number': {'$regex': f'^{roll_number}$', '$options': 'i'}}
                ]
            })
            if existing:
                # Update instead of creating new
                update_data = student.to_dict()
                update_data['updated_at'] = datetime.utcnow()
                students.update_one(
                    {'_id': existing['_id']},
                    {'$set': update_data}
                )
                return jsonify({
                    'message': 'Form updated successfully',
                    'student_id': str(existing['_id']),
                    'is_update': True
                }), 200
        
        # Insert new student record
        result = students.insert_one(student.to_dict())
        
        return jsonify({
            'message': 'Form submitted successfully',
            'student_id': str(result.inserted_id),
            'is_update': False
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@students_bp.route('', methods=['GET'])
@cross_origin()
@token_required
def get_all_students(current_user):
    """
    Get all student records (Faculty only)
    
    Query Parameters:
        - branch: Filter by branch
        - section: Filter by section
        - year: Filter by year
        - search: Search by name, roll number, etc.
        - page: Page number (default: 1)
        - limit: Records per page (default: 10)
    """
    try:
        # Check if user is faculty
        if current_user.get('role') != 'faculty':
            return jsonify({'error': 'Only faculty can access this endpoint'}), 403
        
        collections = get_collections()
        students = collections['students']
        
        # Include both registered students and submitted forms so faculty can
        # see students as soon as they sign up.
        filter_query = {}
        
        branch = request.args.get('branch')
        if branch:
            filter_query['basic_info.branch'] = branch
        
        section = request.args.get('section')
        if section:
            filter_query['basic_info.section'] = section
        
        year = request.args.get('year')
        if year:
            filter_query['basic_info.year'] = year
        
        search = request.args.get('search')
        if search:
            filter_query['$or'] = [
                {'basic_info.student_name': {'$regex': search, '$options': 'i'}},
                {'basic_info.roll_number': {'$regex': search, '$options': 'i'}},
                {'basic_info.college_mail': {'$regex': search, '$options': 'i'}}
            ]
        
        # Pagination
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        skip = (page - 1) * limit
        
        # Get total count
        total_count = students.count_documents(filter_query)
        
        # Get paginated results
        student_list = list(students.find(filter_query).skip(skip).limit(limit))

        # Backfill student records from student_credentials so dashboard users
        # who have only signed up still appear in the faculty view.
        try:
            existing_keys = set()
            for student in student_list:
                basic_info = student.get('basic_info', {}) or {}
                key_roll = (basic_info.get('roll_number') or student.get('roll_number') or '').strip().upper()
                key_email = (basic_info.get('college_mail') or student.get('email') or '').strip().lower()
                if key_roll:
                    existing_keys.add(f'roll:{key_roll}')
                if key_email:
                    existing_keys.add(f'email:{key_email}')

            for credential in creds_col.find({}):
                roll_number = (credential.get('roll_number') or '').strip().upper()
                email = (credential.get('email') or '').strip().lower()
                roll_key = f'roll:{roll_number}' if roll_number else None
                email_key = f'email:{email}' if email else None

                if (roll_key and roll_key in existing_keys) or (email_key and email_key in existing_keys):
                    continue

                student_list.append({
                    '_id': credential.get('_id'),
                    'basic_info': {
                        'student_name': derive_display_name(email, roll_number),
                        'roll_number': roll_number,
                        'college_mail': email,
                        'personal_mail': email,
                        'mobile_no': '',
                        'parent_mobile': '',
                        'branch': '',
                        'section': '',
                        'year': ''
                    },
                    'parent_details': {},
                    'siblings': [],
                    'relatives': [],
                    'created_at': credential.get('created_at'),
                    'updated_at': credential.get('last_login') or credential.get('created_at'),
                    'status': 'registered',
                    'roll_number': roll_number,
                    'email': email,
                })
        except Exception as backfill_error:
            print(f"[WARN] Unable to backfill student credentials in GET /students: {backfill_error}")

        student_list = [serialize_student_document(student) for student in student_list]
        
        return jsonify({
            'students': student_list,
            'total': total_count,
            'page': page,
            'limit': limit,
            'pages': (total_count + limit - 1) // limit
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@students_bp.route('/<student_id>', methods=['GET'])
@cross_origin()
@token_required
def get_student(student_id, current_user):
    """
    Get single student record by ID (Faculty only)
    """
    try:
        # Check if user is faculty
        if current_user.get('role') != 'faculty':
            return jsonify({'error': 'Only faculty can access this endpoint'}), 403
        
        collections = get_collections()
        students = collections['students']
        
        # Find student
        try:
            student = students.find_one({'_id': ObjectId(student_id)})
        except:
            return jsonify({'error': 'Invalid student ID'}), 400
        
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        return jsonify(serialize_student_document(student)), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@students_bp.route('/<student_id>', methods=['DELETE'])
@cross_origin()
@token_required
def delete_student(student_id, current_user):
    """
    Delete student record (Faculty only)
    """
    try:
        # Check if user is faculty
        if current_user.get('role') != 'faculty':
            return jsonify({'error': 'Only faculty can access this endpoint'}), 403
        
        collections = get_collections()
        students = collections['students']
        
        # Delete student
        try:
            result = students.delete_one({'_id': ObjectId(student_id)})
        except:
            return jsonify({'error': 'Invalid student ID'}), 400
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Student not found'}), 404
        
        return jsonify({'message': 'Student record deleted successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@students_bp.route('/<student_id>', methods=['PUT'])
@cross_origin()
@token_required
def update_student(student_id, current_user):
    """
    Update student record (Faculty only)
    
    Expected JSON:
    {
        "basic_info": {...},
        "parent_details": {...},
        "siblings": [...],
        "relatives": [...]
    }
    """
    try:
        # Check if user is faculty
        if current_user.get('role') != 'faculty':
            return jsonify({'error': 'Only faculty can access this endpoint'}), 403
        
        data = request.get_json()
        collections = get_collections()
        students = collections['students']
        
        # Prepare update data
        update_data = {}
        if 'basic_info' in data:
            update_data['basic_info'] = data['basic_info']
        if 'parent_details' in data:
            update_data['parent_details'] = data['parent_details']
        if 'siblings' in data:
            update_data['siblings'] = data['siblings']
        if 'relatives' in data:
            update_data['relatives'] = data['relatives']
        
        update_data['updated_at'] = datetime.utcnow()
        
        # Update student
        try:
            result = students.update_one(
                {'_id': ObjectId(student_id)},
                {'$set': update_data}
            )
        except:
            return jsonify({'error': 'Invalid student ID'}), 400
        
        if result.matched_count == 0:
            return jsonify({'error': 'Student not found'}), 404
        
        return jsonify({'message': 'Student record updated successfully'}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
