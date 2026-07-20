#!/usr/bin/env python
"""
KawanKu AI - Main Entry Point
Starts Flask backend server
"""

import os
from app import create_app
from app.models import db

def init_db(app):
    """Initialize database with test data"""
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if test data already exists
        from app.models import Student, Counselor
        
        test_student = Student.query.filter_by(student_id='STU001').first()
        if not test_student:
            # Create test student
            student = Student(
                student_id='STU001',
                email='student@test.com',
                full_name='Test Student',
                school_id='TEST'
            )
            student.set_password('password123')
            db.session.add(student)
            
            # Create test counselor
            counselor = Counselor(
                counselor_id='COUN001',
                email='counselor@test.com',
                full_name='Dr. Test Counselor',
                department='Wellness'
            )
            counselor.set_password('password123')
            db.session.add(counselor)
            
            db.session.commit()
            print("[DB] Test data created (STU001/password123 and COUN001/password123)")

if __name__ == '__main__':
    app = create_app()
    
    # Initialize database on first run
    init_db(app)
    
    print("""
    +------------------------------------------------------------+
    |                    KawanKu AI Backend                      |
    |                                                            |
    |  Starting Flask server...                                  |
    |                                                            |
    |  API:     http://localhost:5005/api                        |
    |                                                            |
    |  Docs:    See KAWANKU_PLATFORM_GUIDE.md                    |
    |                                                            |
    |  Test Credentials:                                         |
    |  - Student:  STU001 / password123                          |
    |  - Counselor: COUN001 / password123                        |
    |                                                            |
    |  Press Ctrl+C to stop the server                           |
    +------------------------------------------------------------+
    """)
    
    # Run Flask
    app.run(
        host='0.0.0.0',
        port=5005,
        debug=True,
        use_reloader=True
    )
