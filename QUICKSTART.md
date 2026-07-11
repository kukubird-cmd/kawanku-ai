# 🚀 KawanKu AI - Quick Start Guide

## Prerequisites
- Python 3.8+
- pip (Python package manager)
- Node.js (optional, for npm utilities)

## Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Step 2: Start the Backend Server

```bash
# From backend directory
python run.py
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║                   🏥 KawanKu AI Backend                    ║
║                                                            ║
║  Starting Flask server...                                  ║
║  🌐 API:     http://localhost:5000/api                    ║
║  ❤️  Health:  http://localhost:5000/health                 ║
║                                                            ║
║  Test Credentials:                                         ║
║  - Student:  STU001 / password123                         ║
║  - Counselor: COUN001 / password123                       ║
╚════════════════════════════════════════════════════════════╝
```

## Step 3: Serve Student Portal

### Option A: Python HTTP Server
```bash
# From workspace root
cd frontend/student
python -m http.server 5000
```

Then visit: **http://localhost:5000**

### Option B: Live Server (VS Code Extension)
1. Install "Live Server" extension
2. Right-click on `frontend/student/index.html` → Open with Live Server

## Step 4: Serve Counselor Portal

### Option A: Python HTTP Server (Different Terminal)
```bash
# From workspace root
cd frontend/counselor
python -m http.server 5001
```

Then visit: **http://localhost:5001**

### Option B: Live Server
1. Right-click on `frontend/counselor/index.html` → Open with Live Server

## 🧪 Testing the System

### Test Student Login
1. Navigate to http://localhost:5000/login.html
2. Enter credentials:
   - Student ID: `STU001`
   - Password: `password123`

### Test Counselor Login
1. Navigate to http://localhost:5001/login.html
2. Enter credentials:
   - Counselor ID: `COUN001`
   - Password: `password123`

## 🔧 Configuration

### Environment Variables
Create `.env` file in `backend/` directory:

```env
# JWT Configuration
JWT_SECRET_KEY=your-secret-key-here
JWT_EXPIRATION_HOURS=24

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True

# Database
DATABASE_URL=sqlite:///kawanku_ai.db

# Gemini API (Optional, for AI responses)
GEMINI_API_KEY=your-api-key-here
```

## 📚 API Documentation

### Health Check
```bash
curl http://localhost:5000/health
```

### Student Registration
```bash
curl -X POST http://localhost:5000/api/auth/student/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU002",
    "email": "student2@test.com",
    "password": "password123",
    "full_name": "Jane Student"
  }'
```

### Student Login
```bash
curl -X POST http://localhost:5000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "password": "password123"
  }'
```

### Submit Chat Message
```bash
# Replace TOKEN with actual JWT token from login response
curl -X POST http://localhost:5000/api/student/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message": "I am feeling overwhelmed"}'
```

### Get Wellness Metrics
```bash
curl -X GET http://localhost:5000/api/student/wellness \
  -H "Authorization: Bearer TOKEN"
```

### Counselor: Get Student List
```bash
curl -X GET http://localhost:5000/api/counselor/students \
  -H "Authorization: Bearer COUNSELOR_TOKEN"
```

### Counselor: Generate Report
```bash
curl -X GET http://localhost:5000/api/counselor/report/STU001 \
  -H "Authorization: Bearer COUNSELOR_TOKEN"
```

## 🐛 Troubleshooting

### Port Already in Use
If port 5000 is already in use:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

### Database Issues
Reset the database:
```bash
cd backend
rm kawanku_ai.db  # or sqlite:///kawanku_ai.db location
python run.py     # Will recreate on startup
```

### CORS Errors
Make sure backend is running on port 5000 before accessing frontend. Frontend must be served on different ports (5000 for student, 5001 for counselor).

### Module Not Found
```bash
# Reinstall dependencies
cd backend
pip install -r requirements.txt --force-reinstall
```

## 📊 Database Inspection

View database schema:
```bash
cd backend
sqlite3 kawanku_ai.db ".schema"
```

Query data:
```bash
sqlite3 kawanku_ai.db "SELECT * FROM students;"
```

## 📦 Project Structure

```
kawanku-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── models/__init__.py   # Database models
│   │   ├── routes/__init__.py   # API endpoints
│   │   └── services/
│   │       └── privacy_engine.py # Privacy logic
│   ├── run.py                   # Main entry point
│   ├── requirements.txt         # Python dependencies
│   └── kawanku_ai.db            # SQLite database
├── frontend/
│   ├── student/
│   │   ├── login.html
│   │   └── index.html           # Main chat interface
│   └── counselor/
│       ├── login.html
│       └── index.html           # Counselor dashboard
└── KAWANKU_PLATFORM_GUIDE.md    # Full documentation
```

## 🔐 Security Notes

1. **Never commit `.env` files** with real API keys
2. **Change test credentials** before production
3. **Use HTTPS** in production
4. **Encrypt database** in production
5. **Enable CORS only** for trusted origins

## 📞 Support

For detailed documentation, see: **KAWANKU_PLATFORM_GUIDE.md**

---

**🎯 KawanKu AI - Privacy-First Mental Wellness Platform**
