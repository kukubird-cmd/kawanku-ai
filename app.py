#!/usr/bin/env python
"""
KawanKu AI - Workspace Root Run Entry Point
Starts Flask backend server
"""

import os
import sys

# Add backend directory to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, backend_dir)

from backend.app import create_app
from backend.run import init_db

if __name__ == '__main__':
    app = create_app()
    init_db(app)

    print("""
    +------------------------------------------------------------+
    |                    KawanKu AI Backend                      |
    |                                                            |
    |  Starting Flask server...                                  |
    |                                                            |
    |  API:     http://localhost:5000/api                        |
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
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        use_reloader=False
    )
