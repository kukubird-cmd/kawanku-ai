# 🏥 KawanKu AI - Privacy-First Mental Wellness Platform

![Status](https://img.shields.io/badge/Status-Ready%20for%20Development-green)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

> **A dual-portal mental wellness platform that prioritizes student privacy while providing counselors with actionable insights.**

## 🎯 Overview

KawanKu AI is an innovative platform designed to support student mental wellness through:

- **Privacy-First Architecture**: Student conversations are never directly exposed to counselors
- **AI-Powered Companion**: Chat interface with empathetic AI support (Gemini API)
- **Clinical Analytics**: Automated screening (GAD-7, PHQ-9 equivalents) based on behavioral patterns
- **Counselor Dashboard**: Privacy-masked reports with actionable recommendations
- **Multimodal Analysis**: Incorporates voice metrics, sleep data, and emotional signals

## ✨ Key Features

### 🧑‍🎓 Student Portal
- 💬 Chat with AI companion
- 📊 Wellness dashboard
- 😊 Mood tracking
- 😰 Stress level monitoring
- 🎯 Personal metrics

### 👨‍⚕️ Counselor Portal
- 👥 Student overview with risk flags
- 📋 Privacy-preserved clinical reports
- 🔍 Behavioral pattern analysis
- 📞 Quick contact options
- 📈 Dashboard statistics

### 🛡️ Privacy & Security
- ✅ End-to-end anonymization
- ✅ No direct content leakage
- ✅ Audit trail for compliance
- ✅ JWT authentication
- ✅ Role-based access control

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│       Student Portal (Port 5000)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Flask Backend (Port 5000)       │
│  • Authentication                   │
│  • Chat Management                  │
│  • Report Generation                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Privacy Engine (Service)         │
│  • Anonymization                    │
│  • Pattern Extraction               │
│  • Clinical Screening               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      SQLite Database                │
│  • Students, Chats, Wellness        │
│  • Clinical Flags, Reports          │
│  • Audit Logs                       │
└─────────────────────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Counselor Portal (Port 5001)      │
└─────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip
- 200+ MB free disk space

### Installation

1. **Clone and navigate**
```bash
cd kawanku-ai
```

2. **Install dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Start backend**
```bash
python run.py
```

4. **Start student portal** (new terminal)
```bash
cd frontend/student
python -m http.server 5000
```

5. **Start counselor portal** (new terminal)
```bash
cd frontend/counselor
python -m http.server 5001
```

### 🧪 Test the System

**Student Portal**: http://localhost:5000/login.html
- Credentials: `STU001` / `password123`

**Counselor Portal**: http://localhost:5001/login.html
- Credentials: `COUN001` / `password123`

## 📚 Documentation

### Core Documentation
- **[KAWANKU_PLATFORM_GUIDE.md](KAWANKU_PLATFORM_GUIDE.md)** - Complete architecture & implementation
- **[QUICKSTART.md](QUICKSTART.md)** - Setup and testing guide

### Key Components
- **Backend**: `backend/app/` - Flask routes, models, services
- **Frontend Student**: `frontend/student/` - Chat interface
- **Frontend Counselor**: `frontend/counselor/` - Dashboard
- **Database**: `backend/app/models/` - SQLAlchemy models

## 🔐 Privacy-First Report Generation

The platform's core innovation: **Clinical reports without content leakage**

### What Counselors See:
✅ "Student shows elevated late-night activity patterns (35% after 11 PM)"
✅ "Engagement declining over past week"
✅ "GAD-7 equivalent score: 14 (Moderate anxiety)"

### What Counselors Don't See:
❌ Specific conversation quotes
❌ Names of people mentioned
❌ Particular topics or events
❌ Raw chat transcripts

## 🧬 Database Schema

### Student Data Management
```
students → student_chats → multimodal_data
       ↓
wellness_metrics ← clinical_risk_flags ← counselor_reports
```

### Key Tables
- **students**: Account information
- **student_chats**: Conversation messages (encrypted in production)
- **multimodal_data**: Voice, emotion, sleep metrics
- **wellness_metrics**: Aggregated, privacy-masked metrics
- **clinical_risk_flags**: Screening results (GAD-7, PHQ-9)
- **counselor_reports**: Final privacy-preserved output
- **audit_log**: Compliance tracking

See [KAWANKU_PLATFORM_GUIDE.md](KAWANKU_PLATFORM_GUIDE.md#-database-schema) for full schema.

## 🔌 API Endpoints

### Authentication
```bash
POST /api/auth/student/register      # Student signup
POST /api/auth/student/login         # Student login
POST /api/auth/counselor/login       # Counselor login
```

### Student Endpoints
```bash
POST /api/student/chat               # Submit message
GET  /api/student/wellness           # Get wellness metrics
```

### Counselor Endpoints
```bash
GET  /api/counselor/students         # List all students
GET  /api/counselor/report/:id       # Generate report
GET  /api/counselor/dashboard        # Dashboard stats
```

See [KAWANKU_PLATFORM_GUIDE.md](KAWANKU_PLATFORM_GUIDE.md#-api-endpoints) for full API reference.

## 🧪 Testing

### 1. Create Test Student
```bash
curl -X POST http://localhost:5000/api/auth/student/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id":"STU002",
    "email":"test@example.com",
    "password":"test123",
    "full_name":"Test Student"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"student_id":"STU001","password":"password123"}'
```

### 3. Submit Chat
```bash
curl -X POST http://localhost:5000/api/student/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"message":"I am feeling stressed"}'
```

## 🔧 Configuration

Create `backend/.env` from `.env.example`:
```bash
cp backend/.env.example backend/.env
```

### Important Settings
- `JWT_SECRET_KEY` - Change for production
- `GEMINI_API_KEY` - For AI responses (optional)
- `DATABASE_URL` - Database connection string

## 📊 Deployment

### Development
```bash
python run.py
```

### Production
```bash
# Install production server
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Docker (Future)
```bash
docker build -t kawanku-ai .
docker run -p 5000:5000 kawanku-ai
```

## 🔐 Security Considerations

### Immediate
- ✅ JWT authentication
- ✅ Role-based access control
- ✅ Audit logging
- ✅ CORS configuration

### Production Checklist
- [ ] Enable HTTPS
- [ ] Encrypt database at rest
- [ ] Encrypt message content
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set strong JWT secret
- [ ] Implement rate limiting
- [ ] Add intrusion detection
- [ ] Regular security audits

## 🤝 Contributing

This is a privacy-first platform. When contributing:

1. **Maintain privacy guarantees** - Never add features that expose raw student data
2. **Test thoroughly** - Ensure no data leakage between tiers
3. **Document changes** - Keep architecture docs updated
4. **Follow patterns** - Use existing models, routes, services

## 📞 Support

- **Documentation**: See KAWANKU_PLATFORM_GUIDE.md
- **Quick Help**: See QUICKSTART.md
- **Issues**: Check troubleshooting sections

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with Flask and SQLAlchemy
- Privacy model inspired by clinical standards
- Designed for student wellbeing

---

## 📋 Next Steps

1. **Initialize Database**: Run `python run.py` (auto-initializes)
2. **Start Servers**: Follow Quick Start guide
3. **Test Functionality**: Use test credentials
4. **Customize**: Update configuration for your institution
5. **Deploy**: Follow deployment guidelines

**🎯 KawanKu AI - Your private, secure, empathetic companion for student wellness**

