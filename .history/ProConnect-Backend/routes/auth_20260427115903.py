"""
Authentication Routes - Login, Signup, Password Reset
"""
from flask import request, jsonify
from flask_cors import cross_origin
import bcrypt
import jwt
import os
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from config import get_collections, Config
from models.faculty import Faculty
from middleware.auth_middleware import generate_token
from . import auth_bp

@auth_bp.route('/signup', methods=['POST'])
@cross_origin()
def signup():
    """
    Faculty Signup Endpoint
    
    Expected JSON:
    {
        "email": "faculty@psgitech.ac.in",
        "password": "password123",
        "employee_id": "EMP001",
        "name": "Faculty Name"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'employee_id']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        email = data.get('email').strip().lower()  # Normalize to lowercase
        password = data.get('password')
        employee_id = data.get('employee_id').strip()
        name = data.get('name', '').strip()
        
        # Validate email format
        if not email.endswith('@psgitech.ac.in'):
            return jsonify({'error': 'Please use your PSGiTech email address'}), 400
        
        # Validate password length
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        collections = get_collections()
        faculties = collections['faculties']
        
        # Check if email already exists (case-insensitive)
        existing_user = faculties.find_one({'email': {'$regex': f'^{email}$', '$options': 'i'}})
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Check if employee_id already exists
        existing_emp = faculties.find_one({'employee_id': employee_id})
        if existing_emp:
            return jsonify({'error': 'Employee ID already registered'}), 409
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Create new faculty
        faculty = Faculty(
            email=email,
            password_hash=password_hash,
            employee_id=employee_id,
            name=name
        )
        
        # Insert into database
        result = faculties.insert_one(faculty.to_dict())
        
        return jsonify({
            'message': 'Signup successful',
            'user_id': str(result.inserted_id)
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
@cross_origin()
def login():
    """
    Faculty Login Endpoint
    
    Expected JSON:
    {
        "email": "faculty@psgitech.ac.in",
        "password": "password123"
    }
    
    Returns:
    {
        "token": "JWT_TOKEN",
        "user": {
            "id": "USER_ID",
            "email": "faculty@psgitech.ac.in",
            "name": "Faculty Name",
            "role": "faculty"
        }
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data.get('email').strip().lower()  # Normalize to lowercase
        password = data.get('password')
        
        # Validate email format
        if not email.endswith('@psgitech.ac.in'):
            return jsonify({'error': 'Please use your PSGiTech email address'}), 400
        
        collections = get_collections()
        faculties = collections['faculties']
        
        # Find faculty by email (case-insensitive)
        faculty_doc = faculties.find_one({'email': {'$regex': f'^{email}$', '$options': 'i'}})
        if not faculty_doc:
            return jsonify({'error': 'Faculty account not found. Please sign up first.'}), 404
        
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), faculty_doc['password_hash']):
            return jsonify({'error': 'Incorrect password. Please try again.'}), 401
        
        # Check if account is active
        if not faculty_doc.get('is_active', True):
            return jsonify({'error': 'Account is deactivated'}), 403
        
        # Generate JWT token
        token = generate_token(
            user_id=faculty_doc['_id'],
            email=email,  # Use normalized email from request, not database
            role=faculty_doc.get('role', 'faculty')
        )
        
        # Update last login
        faculties.update_one(
            {'_id': faculty_doc['_id']},
            {'$set': {'last_login': datetime.utcnow()}}
        )
        
        # Generate refresh token (longer expiration)
        refresh_payload = {
            'user_id': str(faculty_doc['_id']),
            'email': email,  # Use normalized email from request, not database
            'role': faculty_doc.get('role', 'faculty'),
            'type': 'refresh',  # Mark as refresh token
            'exp': datetime.utcnow() + timedelta(days=7),  # 7 days
            'iat': datetime.utcnow()
        }
        refresh_token_str = jwt.encode(refresh_payload, Config.JWT_SECRET, algorithm='HS256')
        
        return jsonify({
            'token': token,
            'refreshToken': refresh_token_str,
            'user': {
                'id': str(faculty_doc['_id']),
                'email': email,  # Use normalized email from request, not database
                'name': faculty_doc.get('name', ''),
                'employee_id': faculty_doc.get('employee_id', ''),
                'role': faculty_doc.get('role', 'faculty')
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/verify-token', methods=['POST'])
@cross_origin()
def verify_token_route():
    """
    Verify JWT token validity
    
    Expects token in Authorization header:
    Authorization: Bearer <JWT_TOKEN>
    """
    try:
        token = None
        
        # Extract token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Format: "Bearer <token>"
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid authorization header'}), 401
        
        if not token:
            return jsonify({'error': 'Token is required'}), 401
        
        from middleware.auth_middleware import verify_token
        payload = verify_token(token)
        
        if payload is None:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        return jsonify({
            'valid': True,
            'user': payload
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh-token', methods=['POST'])
@cross_origin()
def refresh_token():
    """
    Refresh JWT access token using refresh token
    
    Expected JSON:
    {
        "refreshToken": "REFRESH_TOKEN"
    }
    """
    try:
        data = request.get_json()
        refresh_token_str = data.get('refreshToken')
        
        if not refresh_token_str:
            return jsonify({'error': 'Refresh token is required'}), 400
        
        from middleware.auth_middleware import verify_token
        payload = verify_token(refresh_token_str)
        
        if payload is None:
            return jsonify({'error': 'Invalid or expired refresh token'}), 401
        
        # Check if this is actually a refresh token
        if payload.get('type') != 'refresh':
            return jsonify({'error': 'Invalid token type'}), 401
        
        # Generate new access token
        new_token = generate_token(
            user_id=payload['user_id'],
            email=payload['email'],
            role=payload['role']
        )
        
        return jsonify({
            'token': new_token,
            'refreshToken': refresh_token_str  # Return same refresh token
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _send_reset_otp_email(recipient_email: str, recipient_name: str, otp: str, title: str) -> None:
        sender_email = os.getenv('SENDER_EMAIL')
        sender_password = os.getenv('SENDER_PASSWORD')
        smtp_server_addr = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))

        if not sender_email or not sender_password:
                raise RuntimeError('Email credentials are not configured')

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = title

        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #2c3e50;">{title}</h2>
                <p>Hi {recipient_name or 'User'},</p>
                <p>Your One-Time Password (OTP) for password reset is:</p>
                <p style="margin: 30px 0; text-align: center;">
                    <span style="background-color: #3498db; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 4px; letter-spacing: 2px; display: inline-block;">
                        {otp}
                    </span>
                </p>
                <p style="color: #e74c3c; font-size: 14px;"><strong>⏰ This OTP will expire in 10 minutes.</strong></p>
                <p style="color: #7f8c8d; font-size: 13px;">
                    <strong>Important:</strong><br>
                    Never share this OTP with anyone.
                </p>
            </body>
        </html>
        """

        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(smtp_server_addr, smtp_port) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)


@auth_bp.route('/forgot-password', methods=['POST'])
@cross_origin()
def forgot_password():
    """
    Request password reset via OTP
    
    Expected JSON:
    {
        "email": "faculty@psgitech.ac.in"
    }
    
    Sends OTP to email
    """
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()  # Normalize to lowercase
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        collections = get_collections()
        faculties_collection = collections['faculties']
        
        # Check if user exists (case-insensitive)
        user = faculties_collection.find_one({'email': {'$regex': f'^{email}$', '$options': 'i'}})
        
        if not user:
            return jsonify({
                'error': 'Faculty account not found. Please sign up first.'
            }), 404
        
        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        
        # Store OTP in database with 10-minute expiration
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)
        
        faculties_collection.update_one(
            {'_id': user['_id']},
            {'$set': {
                'reset_otp': otp,
                'otp_expiry': otp_expiry
            }}
        )
        
        # Send OTP via email
        try:
            print(f"📧 Sending OTP to {email}...")
            _send_reset_otp_email(email, user.get('name', 'Faculty Member'), otp, 'ProConnect - Password Reset OTP')
            print(f"✅ OTP sent to {email}")
            return jsonify({
                'message': 'OTP sent successfully to your email.'
            }), 200
        except Exception as email_error:
            print(f"⚠️ Failed to send email: {str(email_error)}")
            print(f"🔐 OTP generated: {otp}")
            return jsonify({'error': f'Unable to send reset email: {str(email_error)}'}), 500
        
        return jsonify({
            'message': 'If the email exists, an OTP will be sent shortly.'
        }), 200
    
    except Exception as e:
        print(f"❌ Error in forgot_password: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@auth_bp.route('/student/forgot-password', methods=['POST'])
@cross_origin()
def student_forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        roll_number = data.get('rollNumber', '').strip().upper()  # Normalize to uppercase and trim

        if not email or not roll_number:
            return jsonify({'error': 'Email and roll number are required'}), 400

        collections = get_collections()
        students_collection = collections['students']

        # Debug: Print search parameters
        print(f"🔍 Searching for student with email={email}, roll_number={roll_number}")
        
        # Query using flat document structure (email and roll_number at top level)
        student = students_collection.find_one({
            'roll_number': {'$regex': f'^{roll_number}$', '$options': 'i'},  # Case-insensitive match
            'email': {'$regex': f'^{email}$', '$options': 'i'}  # Case-insensitive match
        })

        if not student:
            # Debug: Show all students that match the email alone
            print(f"❌ No student found with roll_number={roll_number} AND email={email}")
            students_with_email = list(students_collection.find({
                'email': {'$regex': f'^{email}$', '$options': 'i'}
            }))
            print(f"📧 Students with email {email}: {len(students_with_email)}")
            for s in students_with_email:
                print(f"   - Roll: {s.get('roll_number')}, Email: {s.get('email')}, Name: {s.get('student_name')}")
            
            return jsonify({'error': 'No matching student record found'}), 404

        otp = str(random.randint(100000, 999999))
        otp_expiry = datetime.utcnow() + timedelta(minutes=10)

        students_collection.update_one(
            {'_id': student['_id']},
            {'$set': {
                'student_reset_otp': otp,
                'student_otp_expiry': otp_expiry
            }}
        )

        try:
            recipient_name = student.get('basic_info', {}).get('student_name', 'Student')
            print(f"📧 Sending student OTP to {email}...")
            _send_reset_otp_email(email, recipient_name, otp, 'ProConnect - Student Password Reset OTP')
            print(f"✅ Student OTP sent to {email}")
            return jsonify({'message': 'OTP sent successfully to your email.'}), 200
        except Exception as email_error:
            print(f"⚠️ Failed to send student email: {str(email_error)}")
            return jsonify({'error': f'Unable to send reset email: {str(email_error)}'}), 500

    except Exception as e:
        print(f"❌ Error in student_forgot_password: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500


@auth_bp.route('/student/verify-otp', methods=['POST'])
@cross_origin()
def student_verify_otp():
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        roll_number = data.get('rollNumber', '').strip().upper()  # Normalize to uppercase and trim
        otp = data.get('otp', '').strip()

        if not email or not roll_number or not otp:
            return jsonify({'error': 'Email, roll number and OTP are required'}), 400

        collections = get_collections()
        students_collection = collections['students']

        student = students_collection.find_one({
            'roll_number': {'$regex': f'^{roll_number}$', '$options': 'i'},  # Case-insensitive match
            'email': {'$regex': f'^{email}$', '$options': 'i'}  # Case-insensitive match
        })

        if not student:
            return jsonify({'error': 'Student account not found. Email or roll number does not match any records.'}), 404

        stored_otp = student.get('student_reset_otp')
        otp_expiry = student.get('student_otp_expiry')

        if not stored_otp or not otp_expiry:
            return jsonify({'error': 'No OTP found. Please request a new password reset.'}), 400

        if datetime.utcnow() > otp_expiry:
            students_collection.update_one(
                {'_id': student['_id']},
                {'$unset': {'student_reset_otp': 1, 'student_otp_expiry': 1}}
            )
            return jsonify({'error': 'OTP has expired. Please request a new password reset.'}), 401

        if stored_otp != otp:
            return jsonify({'error': 'Incorrect OTP. Please try again.'}), 401

        reset_payload = {
            'student_id': str(student['_id']),
            'email': email,
            'roll_number': roll_number,
            'type': 'student_password_reset',
            'exp': datetime.utcnow() + timedelta(minutes=15),
            'iat': datetime.utcnow()
        }
        reset_token = jwt.encode(reset_payload, Config.JWT_SECRET, algorithm='HS256')

        students_collection.update_one(
            {'_id': student['_id']},
            {'$unset': {'student_reset_otp': 1, 'student_otp_expiry': 1}}
        )

        return jsonify({
            'message': 'OTP verified successfully',
            'resetToken': reset_token
        }), 200

    except Exception as e:
        print(f"Error in student_verify_otp: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/verify-otp', methods=['POST'])
@cross_origin()
def verify_otp():
    """
    Verify OTP for password reset
    
    Expected JSON:
    {
        "email": "faculty@psgitech.ac.in",
        "otp": "123456"
    }
    
    Returns:
    {
        "message": "OTP verified successfully",
        "resetToken": "JWT_TOKEN"  // Token to use for password reset
    }
    """
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()  # Normalize to lowercase
        otp = data.get('otp', '').strip()
        
        if not email or not otp:
            return jsonify({'error': 'Email and OTP are required'}), 400
        
        collections = get_collections()
        faculties_collection = collections['faculties']
        
        # Find user by email (case-insensitive)
        user = faculties_collection.find_one({'email': {'$regex': f'^{email}$', '$options': 'i'}})
        
        if not user:
            return jsonify({'error': 'Faculty account not found. Please sign up first.'}), 404
        
        # Check if OTP exists and is not expired
        stored_otp = user.get('reset_otp')
        otp_expiry = user.get('otp_expiry')
        
        if not stored_otp or not otp_expiry:
            return jsonify({'error': 'No OTP found. Please request a new password reset.'}), 400
        
        # Check if OTP has expired
        if datetime.utcnow() > otp_expiry:
            # Clear expired OTP
            faculties_collection.update_one(
                {'_id': user['_id']},
                {'$unset': {'reset_otp': 1, 'otp_expiry': 1}}
            )
            return jsonify({'error': 'OTP has expired. Please request a new password reset.'}), 401
        
        # Verify OTP
        if stored_otp != otp:
            return jsonify({'error': 'Incorrect OTP. Please try again.'}), 401
        
        # OTP is valid! Generate a reset token (short-lived, 15 minutes)
        reset_payload = {
            'user_id': str(user['_id']),
            'email': email,
            'type': 'password_reset',
            'exp': datetime.utcnow() + timedelta(minutes=15),
            'iat': datetime.utcnow()
        }
        reset_token = jwt.encode(reset_payload, Config.JWT_SECRET, algorithm='HS256')
        
        # Clear OTP from database (single use)
        faculties_collection.update_one(
            {'_id': user['_id']},
            {'$unset': {'reset_otp': 1, 'otp_expiry': 1}}
        )
        
        return jsonify({
            'message': 'OTP verified successfully',
            'resetToken': reset_token
        }), 200
    
    except Exception as e:
        print(f"Error in verify_otp: {str(e)}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/reset-password', methods=['POST'])
@cross_origin()
def reset_password():
    """
    Reset password using reset token
    
    Expected JSON:
    {
        "token": "RESET_TOKEN",
        "newPassword": "newpassword123"
    }
    """
    try:
        data = request.get_json()
        reset_token = data.get('token')
        new_password = data.get('newPassword')
        
        if not reset_token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Verify reset token
        from middleware.auth_middleware import verify_token
        payload = verify_token(reset_token)
        
        if payload is None:
            return jsonify({'error': 'Invalid or expired reset token'}), 401
        
        # Check if this is a password reset token
        if payload.get('type') != 'password_reset':
            return jsonify({'error': 'Invalid token type'}), 401
        
        collections = get_collections()
        faculties_collection = collections['faculties']
        
        # Hash new password
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update password
        result = faculties_collection.update_one(
            {'_id': ObjectId(payload['user_id'])},
            {'$set': {
                'password_hash': hashed_password,
                'updated_at': datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'message': 'Password reset successful. Please login with your new password.'
        }), 200
    
    except Exception as e:
        print(f"Error in reset_password: {str(e)}")
        return jsonify({'error': str(e)}), 500
