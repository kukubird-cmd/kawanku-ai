# 🏥 KawanKu AI - Privacy-First Platform
## Complete Implementation Guide

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    KawanKu AI Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │  Student Portal  │         │ Counselor Portal │              │
│  │  (Port 5000)     │         │  (Port 5001)     │              │
│  └────────┬─────────┘         └────────┬─────────┘              │
│           │                            │                        │
│           └────────────┬───────────────┘                        │
│                        │                                        │
│           ┌────────────▼──────────────┐                        │
│           │   Flask Backend API       │                        │
│           │   (Port 5000)             │                        │
│           │                           │                        │
│           │  • Authentication         │                        │
│           │  • Chat Management        │                        │
│           │  • Report Generation      │                        │
│           └────────────┬──────────────┘                        │
│                        │                                        │
│           ┌────────────▼──────────────────┐                    │
│           │   Privacy Engine (Service)    │                    │
│           │                               │                    │
│           │  • Anonymization              │                    │
│           │  • Pattern Extraction         │                    │
│           │  • Clinical Screening (GAD-7, PHQ-9)              │
│           │  • Report Generation          │                    │
│           └────────────┬──────────────────┘                    │
│                        │                                        │
│           ┌────────────▼──────────────────┐                    │
│           │   SQLite Database             │                    │
│           │                               │                    │
│           │  ✅ Encrypted Chats            │                    │
│           │  ✅ Wellness Metrics           │                    │
│           │  ✅ Clinical Flags             │                    │
│           │  ✅ Audit Logs                 │                    │
│           └───────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Structure

```
kawanku-ai/
├── backend/
│   ├── app/
│   │   ├── __init__.py              # Flask app factory
│   │   ├── models/
│   │   │   └── __init__.py          # SQLAlchemy models
│   │   ├── routes/
│   │   │   └── __init__.py          # API endpoints
│   │   └── services/
│   │       └── privacy_engine.py    # Privacy-preserving report generation
│   ├── requirements.txt
│   └── run.py                       # Main entry point
├── frontend/
│   ├── student/
│   │   ├── index.html               # Student chat interface
│   │   ├── login.html               # Student login
│   │   └── styles.css
│   ├── counselor/
│   │   ├── index.html               # Counselor dashboard
│   │   ├── login.html               # Counselor login
│   │   └── styles.css
│   └── shared/
│       └── auth.js                  # Shared authentication
├── database/
│   └── schema.sql                   # Database schema
└── README.md
```

---

## 🚀 Deployment Steps

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Initialize Database

```bash
python
>>> from app.models import db
>>> from app import create_app
>>> app = create_app()
>>> with app.app_context():
>>>     db.create_all()
```

### 3. Start Flask Backend

```bash
# Terminal 1
cd backend
python run.py
# Server running on http://localhost:5000
```

### 4. Serve Frontend

```bash
# Terminal 2 (for student portal)
python -m http.server 5000 --directory frontend/student

# Terminal 3 (for counselor portal)
python -m http.server 5001 --directory frontend/counselor
```

---

## 🔐 Database Schema

### Key Tables

#### 1. **Students Table**
```sql
- student_id (PK, unique)
- email (unique)
- password_hash (bcrypt)
- full_name
- date_of_birth
- school_id
- created_at
- last_login
- is_active
```

#### 2. **Student_Chats Table**
```sql
- id (PK)
- student_id (FK → students)
- message_type ('student' | 'ai')
- message_content (encrypted in production)
- timestamp
- message_length (for analytics without content)
```

#### 3. **Multimodal_Data Table**
```sql
- id (PK)
- student_id (FK → students)
- data_type ('voice' | 'facial_emotion' | 'sleep_log' | 'heart_rate')
- vocal_pitch_avg
- speech_rate_wpm
- detected_emotion
- sleep_duration_hours
- heart_rate_avg
```

#### 4. **Wellness_Metrics Table** (Aggregated, Privacy-Masked)
```sql
- id (PK)
- student_id (FK, unique)
- mood_state ('Stable' | 'Fluctuating' | 'Low' | 'Elevated')
- overall_stress_level ('Low' | 'Moderate' | 'High' | 'Critical')
- cognitive_burnout_score (0-100)
- emotional_fatigue_score (0-100)
- academic_pressure_score (0-100)
- engagement_level (0-100)
```

#### 5. **Clinical_Risk_Flags Table**
```sql
- id (PK)
- student_id (FK)
- gad7_score (0-21)
- gad7_risk_level
- phq9_score (0-27)
- phq9_risk_level
- suicide_ideation_flag (bool)
- self_harm_indicators (int)
- overall_risk_level
- risk_description (no specific quotes)
```

#### 6. **Counselor_Reports Table** (Final Output)
```sql
- id (PK)
- student_id (FK)
- report_date
- generated_by (counselor_id)
- mood_trajectory ('improving' | 'stable' | 'declining')
- stress_factors (JSON)
- behavioral_patterns (JSON)
- immediate_intervention_needed (bool)
- recommended_actions (JSON)
- follow_up_priority
```

---

## 🔌 API Endpoints

### Authentication

```
POST /api/auth/student/register
  Request: { student_id, email, password, full_name, date_of_birth, school_id }
  Response: { message, student_id }

POST /api/auth/student/login
  Request: { student_id, password }
  Response: { token, student_id, full_name, expires_in }

POST /api/auth/counselor/login
  Request: { counselor_id, password }
  Response: { token, counselor_id, full_name, expires_in }
```

### Student Endpoints

```
POST /api/student/chat
  Headers: Authorization: Bearer <token>
  Request: { message }
  Response: { success, ai_response, timestamp }

GET /api/student/wellness
  Headers: Authorization: Bearer <token>
  Response: { mood_state, stress_breakdown, engagement_level, ... }
```

### Counselor Endpoints

```
GET /api/counselor/students
  Headers: Authorization: Bearer <token>
  Response: { total_students, students: [...] }

GET /api/counselor/report/<student_id>
  Headers: Authorization: Bearer <token>
  Response: {
    metadata,
    mood_state,
    stress_assessment,
    clinical_screening,
    behavioral_indicators,
    risk_assessment,
    clinical_recommendations,
    privacy_notice
  }

GET /api/counselor/dashboard
  Headers: Authorization: Bearer <token>
  Response: { total_students, students_needing_attention, urgent_cases }
```

---

## 🛡️ Privacy-First Architecture

### ✅ What Counselors CAN See

- **Aggregated metrics** (not raw data)
- **Behavioral patterns** (frequency, timing, consistency)
- **Screening scores** (GAD-7, PHQ-9 equivalent)
- **Risk flags** (depression, anxiety, withdrawal indicators)
- **Clinical recommendations** (what to do, not why)

### ❌ What Counselors CANNOT See

- **Exact quotes** from conversations
- **Specific topics** discussed
- **Names** of people mentioned
- **Specific events** or circumstances
- **Raw chat content**

---

## 🧠 Privacy-Preserving Report Generation

### Process Flow

1. **Anonymization**
   - Extract only metadata (message length, timestamp, hour of day)
   - Calculate sentiment polarity WITHOUT storing content
   - Discard all text content

2. **Behavioral Pattern Extraction**
   - Activity timing analysis (late-night percentage)
   - Engagement trends (message length trajectory)
   - Response patterns (emotional consistency)
   - Somatic indicators (voice metrics, sleep patterns)

3. **Clinical Screening**
   - Derive GAD-7 equivalent from:
     - Late-night activity (rumination indicator)
     - Emotional variability (anxiety indicator)
   - Derive PHQ-9 equivalent from:
     - Engagement decline (withdrawal indicator)
     - Negative sentiment trend (mood indicator)
     - Sleep disruption (somatic indicator)

4. **Crisis Detection**
   - Sudden engagement drop
   - Extreme late-night patterns
   - Persistent negative sentiment

5. **Report Compilation**
   - No direct quotes
   - Pattern descriptions only
   - Actionable recommendations
   - Privacy notice included

---

## 📊 Example Report Output

```json
{
  "student_id": "STU001",
  "report_date": "2026-07-03T12:00:00",
  
  "metadata": {
    "total_sessions": 15,
    "total_messages": 47,
    "analysis_period_days": 30
  },
  
  "mood_state": {
    "current_state": "Fluctuating",
    "stability_score": 45,
    "trajectory": "declining",
    "description": "Student shows declining engagement - messages becoming shorter"
  },
  
  "stress_assessment": {
    "overall_level": "High",
    "breakdown": {
      "cognitive_burnout": 75,
      "emotional_fatigue": 60,
      "social_stress": 40,
      "academic_pressure": 80
    }
  },
  
  "clinical_screening": {
    "gad7": {
      "score": 14,
      "risk_level": "Moderate",
      "clinical_note": "Anxiety screening equivalent based on behavioral patterns"
    },
    "phq9": {
      "score": 18,
      "risk_level": "Moderately Severe",
      "clinical_note": "Depression screening equivalent based on engagement trends"
    }
  },
  
  "behavioral_indicators": {
    "activity_patterns": "User shows elevated late-night activity patterns (35% after 11 PM)",
    "engagement_pattern": "Emotionally variable - mood fluctuations detected",
    "crisis_flags": {
      "suicide_ideation_flag": false,
      "self_harm_indicators": 2,
      "social_isolation_flag": false,
      "academic_crisis_flag": true,
      "sleep_disruption_flag": true
    }
  },
  
  "risk_assessment": {
    "overall_risk_level": "High",
    "immediate_intervention_needed": false,
    "follow_up_priority": "Escalate"
  },
  
  "clinical_recommendations": [
    {
      "action": "Depression screening follow-up",
      "urgency": "High",
      "description": "Conduct formal PHQ-9 assessment and consider treatment referral"
    },
    {
      "action": "Sleep hygiene assessment",
      "urgency": "Moderate",
      "description": "Discuss sleep patterns and provide sleep hygiene recommendations"
    }
  ],
  
  "privacy_notice": "This report contains aggregated behavioral patterns and screening equivalents. No direct quotes or specific content from student conversations are included."
}
```

---

## 🔐 Security Best Practices

1. **Encryption**
   - Store chat messages encrypted (AES-256) in production
   - Use HTTPS for all API calls
   - Hash passwords with bcrypt

2. **Authentication**
   - JWT tokens with 24-hour expiration
   - Separate tokens for students and counselors
   - Session tracking with IP logging

3. **Audit Trail**
   - Log all access (never log content)
   - Track who viewed what report
   - Timestamp all actions

4. **Data Retention**
   - Archive old chats encrypted
   - Allow students to export data
   - GDPR-compliant deletion

---

## 🧪 Testing the System

### 1. Create Test Student

```bash
curl -X POST http://localhost:5000/api/auth/student/register \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "email": "student@test.com",
    "password": "test123",
    "full_name": "John Student"
  }'
```

### 2. Login as Student

```bash
curl -X POST http://localhost:5000/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "password": "test123"
  }'
```

### 3. Submit Chat Message

```bash
curl -X POST http://localhost:5000/api/student/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "I am feeling overwhelmed"}'
```

### 4. Get Wellness Metrics

```bash
curl -X GET http://localhost:5000/api/student/wellness \
  -H "Authorization: Bearer <token>"
```

### 5. Counselor: Get All Students

```bash
curl -X GET http://localhost:5000/api/counselor/students \
  -H "Authorization: Bearer <counselor_token>"
```

### 6. Counselor: Generate Report

```bash
curl -X GET http://localhost:5000/api/counselor/report/STU001 \
  -H "Authorization: Bearer <counselor_token>"
```

---

## 📚 Additional Notes

### Crisis Protocol
- If suicide_ideation_flag is detected, system immediately:
  1. Displays crisis helpline (988)
  2. Alerts counselor dashboard
  3. Triggers audit log
  4. Stores crisis timestamp

### Compliance
- HIPAA-ready (requires additional encryption in production)
- FERPA-compliant
- GDPR-compliant
- COPPA-compliant for students under 13

### Scalability
- Use PostgreSQL for production (instead of SQLite)
- Add Redis for session caching
- Implement database connection pooling
- Use Celery for async report generation

---

## 🔄 LLM Integration (Privacy-Preserving)

The `PrivacyPreservingReportEngine` in `privacy_engine.py`:

1. **Accepts** chat text from student conversations
2. **Analyzes** ONLY for clinical patterns (not content)
3. **Extracts** behavioral indicators
4. **Generates** pseudo-clinical scores
5. **Returns** anonymized recommendations

**The key:**
- LLM input = Chat text
- LLM output = Clinical metadata
- **Never** sends specific content to counselor
- **Always** provides statistical summaries

---

## 📞 Support & Maintenance

- Monitor audit logs for unauthorized access
- Regularly backup encrypted database
- Update dependencies monthly
- Test privacy compliance quarterly

---

**🎯 This platform is designed with privacy as a first-class feature, not an afterthought.**

