"""
KawanKu AI - API Routes (Authentication, Student, Counselor, Health)
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import json
from datetime import datetime, timedelta
import os
import re
from pathlib import Path

# Import models
from app.models import (
    db, Student, StudentSession, StudentChat, Counselor, CounselorSession,
    WellnessMetrics, ClinicalRiskFlags, CounselorReport, MultimodalData, AuditLog
)
from app.services.privacy_engine import PrivacyPreservingReportEngine

# =============================================================================
# BLUEPRINTS
# =============================================================================

auth_bp = Blueprint('auth', __name__)
student_bp = Blueprint('student', __name__)
counselor_bp = Blueprint('counselor', __name__)
ai_bp = Blueprint('ai', __name__)

# =============================================================================
# UTILITIES
# =============================================================================

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-key')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def create_jwt_token(user_id: str, user_type: str) -> str:
    """Create JWT token"""
    payload = {
        'user_id': user_id,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_student_token(token: str) -> dict:
    """Verify student JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('user_type') != 'student':
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def verify_counselor_token(token: str) -> dict:
    """Verify counselor JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get('user_type') != 'counselor':
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def student_required(f):
    """Decorator: Require student authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return {'error': 'Missing authentication token'}, 401
        
        payload = verify_student_token(token)
        if not payload:
            return {'error': 'Invalid or expired token'}, 401
        
        request.current_student_id = payload['user_id']
        return f(*args, **kwargs)
    
    return decorated_function

def counselor_required(f):
    """Decorator: Require counselor authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return {'error': 'Missing authentication token'}, 401
        
        payload = verify_counselor_token(token)
        if not payload:
            return {'error': 'Invalid or expired token'}, 401
        
        request.current_counselor_id = payload['user_id']
        return f(*args, **kwargs)
    
    return decorated_function

# =============================================================================
# AUTHENTICATION ENDPOINTS
# =============================================================================

@auth_bp.route('/student/register', methods=['POST'])
def student_register():
    """Student registration"""
    try:
        data = request.get_json()
        
        # Validate input
        if not all([data.get('student_id'), data.get('email'), data.get('password'), data.get('full_name')]):
            return {'error': 'Missing required fields'}, 400
        
        # Check if student exists
        if Student.query.filter_by(student_id=data['student_id']).first():
            return {'error': 'Student ID already exists'}, 409
        
        if Student.query.filter_by(email=data['email']).first():
            return {'error': 'Email already registered'}, 409
        
        # Create student
        student = Student(
            student_id=data['student_id'],
            email=data['email'],
            full_name=data['full_name'],
            date_of_birth=data.get('date_of_birth'),
            school_id=data.get('school_id')
        )
        student.set_password(data['password'])
        
        # Create wellness metrics record
        wellness = WellnessMetrics(student_id=data['student_id'])
        
        db.session.add(student)
        db.session.add(wellness)
        db.session.commit()
        
        # Log action
        AuditLog.log_action('student', data['student_id'], 'registration', details='Student account created')
        
        return {
            'message': 'Student registered successfully',
            'student_id': student.student_id
        }, 201
    
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

@auth_bp.route('/student/login', methods=['POST'])
def student_login():
    """Student login"""
    try:
        data = request.get_json()
        
        if not data.get('student_id') or not data.get('password'):
            return {'error': 'Missing student_id or password'}, 400
        
        student = Student.query.filter_by(student_id=data['student_id']).first()
        
        if not student or not student.check_password(data['password']):
            return {'error': 'Invalid credentials'}, 401
        
        if not student.is_active:
            return {'error': 'Account is inactive'}, 403
        
        # Create or refresh the single session row allowed per student.
        session = StudentSession.query.filter_by(student_id=student.student_id).first()
        if session:
            import secrets
            session.session_token = secrets.token_urlsafe(32)
            session.login_timestamp = datetime.utcnow()
            session.last_activity = datetime.utcnow()
            session.ip_address = request.remote_addr
            session.device_info = request.headers.get('User-Agent', '')
            session.is_active = True
        else:
            session = StudentSession.create_session(
                student_id=student.student_id,
                ip_address=request.remote_addr,
                device_info=request.headers.get('User-Agent', '')
            )
            db.session.add(session)
        
        # Update last login
        student.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create JWT token
        token = create_jwt_token(student.student_id, 'student')
        
        # Log action
        AuditLog.log_action('student', student.student_id, 'login', request.remote_addr)
        
        return {
            'token': token,
            'student_id': student.student_id,
            'full_name': student.full_name,
            'expires_in': JWT_EXPIRATION_HOURS * 3600
        }, 200
    
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

@auth_bp.route('/counselor/login', methods=['POST'])
def counselor_login():
    """Counselor login"""
    try:
        data = request.get_json()
        
        if not data.get('counselor_id') or not data.get('password'):
            return {'error': 'Missing counselor_id or password'}, 400
        
        counselor = Counselor.query.filter_by(counselor_id=data['counselor_id']).first()
        
        if not counselor or not counselor.check_password(data['password']):
            return {'error': 'Invalid credentials'}, 401
        
        if not counselor.is_active:
            return {'error': 'Account is inactive'}, 403
        
        import secrets
        session = CounselorSession(
            counselor_id=counselor.counselor_id,
            session_token=secrets.token_urlsafe(32),
            ip_address=request.remote_addr
        )
        db.session.add(session)
        db.session.commit()
        
        # Create JWT token
        token = create_jwt_token(counselor.counselor_id, 'counselor')
        
        # Log action
        AuditLog.log_action('counselor', counselor.counselor_id, 'login', request.remote_addr)
        
        return {
            'token': token,
            'counselor_id': counselor.counselor_id,
            'full_name': counselor.full_name,
            'expires_in': JWT_EXPIRATION_HOURS * 3600
        }, 200
    
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

# =============================================================================
# STUDENT ENDPOINTS
# =============================================================================

import requests

GEMINI_MODELS = {'gemini-1.5-flash', 'gemini-2.5-flash'}
GEMINI_QUOTA_COOLDOWN = timedelta(seconds=3)
GEMINI_REPORT_SUMMARY_COOLDOWN = timedelta(minutes=10)
GEMINI_DISABLED_UNTIL = None

def get_gemini_api_key() -> str:
    """Read Gemini key from backend env first, then root config.js for local development."""
    api_key = os.environ.get('GEMINI_API_KEY', '').strip()
    if api_key:
        return api_key

    config_path = Path(__file__).resolve().parents[3] / 'config.js'
    try:
        config_text = config_path.read_text(encoding='utf-8')
    except OSError:
        return ''

    match = re.search(r"window\.GEMINI_API_KEY\s*=\s*['\"]([^'\"]+)['\"]", config_text)
    if not match:
        return ''

    api_key = match.group(1).strip()
    if api_key == 'YOUR_GEMINI_API_KEY_HERE':
        return ''

    return api_key

@ai_bp.route('/gemini', methods=['POST'])
def proxy_gemini_request():
    """Proxy Gemini calls through Flask so the app can use GEMINI_API_KEY from the server."""
    global GEMINI_DISABLED_UNTIL

    if GEMINI_DISABLED_UNTIL and datetime.utcnow() < GEMINI_DISABLED_UNTIL:
        return {
            'quota_exceeded': True,
            'error': 'Gemini quota/rate limit cooldown is active for 60 seconds',
            'code': 'gemini_quota_cooldown',
            'status': 429
        }, 200

    api_key = get_gemini_api_key()
    if not api_key:
        return {
            'error': 'Gemini API key is not configured on the backend',
            'code': 'missing_api_key'
        }, 503

    data = request.get_json(silent=True) or {}
    model = data.get('model', 'gemini-2.5-flash')
    payload = data.get('payload')

    if model not in GEMINI_MODELS:
        return {'error': 'Unsupported Gemini model'}, 400

    if not isinstance(payload, dict):
        return {'error': 'Missing Gemini payload'}, 400

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=12)
        if not response.ok:
            error_payload = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            if response.status_code == 429:
                GEMINI_DISABLED_UNTIL = datetime.utcnow() + GEMINI_QUOTA_COOLDOWN
                return {
                    'quota_exceeded': True,
                    'error': error_payload.get('error', {}).get('message') or 'Gemini quota/rate limit reached',
                    'code': 'gemini_quota_exceeded',
                    'status': 429
                }, 200
            return {
                'error': error_payload.get('error', {}).get('message') or f'Gemini API error: {response.status_code}',
                'code': 'gemini_error',
                'status': response.status_code
            }, 200

        return response.json(), 200
    except requests.RequestException as e:
        return {'error': str(e), 'code': 'gemini_request_failed'}, 502

def clamp_score(value: int) -> int:
    """Keep dashboard scores inside a 0-100 range."""
    return max(0, min(100, value))

def risk_label(score: int) -> str:
    if score >= 80:
        return 'Critical'
    if score >= 60:
        return 'High'
    if score >= 35:
        return 'Moderate'
    return 'Low'

def update_wellness_from_message(student_id: str, message: str):
    """Update privacy-preserving wellness aggregates used by counselor views."""
    lower = message.lower()
    tokens = set(re.findall(r"[a-z']+", lower))

    academic_words = {'exam', 'assignment', 'homework', 'grade', 'study', 'class', 'teacher', 'test', 'deadline'}
    burnout_words = {'tired', 'exhausted', 'burnout', 'burned', 'overwhelmed', 'drained', 'stressed'}
    social_words = {'friend', 'friends', 'alone', 'lonely', 'bullied', 'ignored', 'anxious', 'anxiety'}
    crisis_phrases = ['harm myself', 'kill myself', 'suicide', 'end my life', 'want to die', 'overdose']

    academic_delta = 18 if tokens & academic_words else 0
    burnout_delta = 20 if tokens & burnout_words else 0
    social_delta = 18 if tokens & social_words else 0
    crisis_flag = any(phrase in lower for phrase in crisis_phrases)

    wellness = WellnessMetrics.query.filter_by(student_id=student_id).first()
    if not wellness:
        wellness = WellnessMetrics(student_id=student_id)
        db.session.add(wellness)

    wellness.academic_pressure_score = clamp_score((wellness.academic_pressure_score or 0) + academic_delta)
    wellness.cognitive_burnout_score = clamp_score((wellness.cognitive_burnout_score or 0) + burnout_delta)
    wellness.social_stress_score = clamp_score((wellness.social_stress_score or 0) + social_delta)
    wellness.emotional_fatigue_score = clamp_score((wellness.emotional_fatigue_score or 0) + max(burnout_delta, social_delta) // 2)
    wellness.total_chat_sessions = (wellness.total_chat_sessions or 0) + 1
    wellness.message_frequency_daily = (wellness.message_frequency_daily or 0) + 1
    wellness.last_updated = datetime.utcnow()

    max_stress = max(
        wellness.academic_pressure_score or 0,
        wellness.cognitive_burnout_score or 0,
        wellness.social_stress_score or 0,
        wellness.emotional_fatigue_score or 0
    )
    wellness.overall_stress_level = risk_label(max_stress)
    wellness.mood_state = 'Low' if crisis_flag or max_stress >= 70 else ('Fluctuating' if max_stress >= 35 else 'Stable')
    wellness.mood_stability_score = clamp_score(100 - max_stress)

    risk = ClinicalRiskFlags.query.filter_by(student_id=student_id).order_by(
        ClinicalRiskFlags.assessment_date.desc()
    ).first()
    if not risk:
        risk = ClinicalRiskFlags(student_id=student_id)
        db.session.add(risk)

    risk.assessment_date = datetime.utcnow()
    risk.suicide_ideation_flag = bool(risk.suicide_ideation_flag or crisis_flag)
    risk.social_isolation_flag = bool(risk.social_isolation_flag or ('lonely' in tokens or 'alone' in tokens))
    risk.academic_crisis_flag = bool(risk.academic_crisis_flag or wellness.academic_pressure_score >= 60)
    risk.gad7_score = clamp_score(max_stress // 5)
    risk.phq9_score = clamp_score((wellness.cognitive_burnout_score + wellness.emotional_fatigue_score) // 8)
    risk.gad7_risk_level = risk_label(risk.gad7_score * 4)
    risk.phq9_risk_level = risk_label(risk.phq9_score * 4)
    risk.overall_risk_level = 'Urgent' if crisis_flag else risk_label(max_stress)
    risk.risk_description = 'Aggregated indicators updated from recent student activity.'

def update_wellness_from_diagnostics(student_id: str, diagnostics: dict):
    """Store client-side MindBuddy diagnostics for counselor dashboards/reports."""
    wellness = WellnessMetrics.query.filter_by(student_id=student_id).first()
    if not wellness:
        wellness = WellnessMetrics(student_id=student_id)
        db.session.add(wellness)

    wellness.academic_pressure_score = clamp_score(int(diagnostics.get('academicPressure', wellness.academic_pressure_score or 0)))
    wellness.cognitive_burnout_score = clamp_score(int(diagnostics.get('burnout', wellness.cognitive_burnout_score or 0)))
    wellness.social_stress_score = clamp_score(int(diagnostics.get('socialAnxiety', wellness.social_stress_score or 0)))
    wellness.emotional_fatigue_score = clamp_score(int(diagnostics.get('emotionalFatigue', wellness.emotional_fatigue_score or wellness.cognitive_burnout_score or 0)))
    wellness.total_chat_sessions = max((wellness.total_chat_sessions or 0), int(diagnostics.get('totalConversations', wellness.total_chat_sessions or 0)))
    wellness.message_frequency_daily = max((wellness.message_frequency_daily or 0), wellness.total_chat_sessions or 0)
    wellness.last_updated = datetime.utcnow()

    max_stress = max(
        wellness.academic_pressure_score or 0,
        wellness.cognitive_burnout_score or 0,
        wellness.social_stress_score or 0,
        wellness.emotional_fatigue_score or 0
    )

    stress_level = str(diagnostics.get('stressLevel') or '').strip()
    wellness.overall_stress_level = {
        'Medium': 'Moderate',
        'Severe High': 'Critical'
    }.get(stress_level, stress_level if stress_level in ['Low', 'Moderate', 'High', 'Critical'] else risk_label(max_stress))

    sentiment = str(diagnostics.get('sentiment') or '').strip()
    wellness.mood_state = {
        'Positive': 'Stable',
        'Neutral': 'Stable',
        'Negative': 'Low',
        'Crisis Flagged': 'Low'
    }.get(sentiment, 'Fluctuating' if max_stress >= 35 else 'Stable')
    wellness.mood_stability_score = clamp_score(100 - max_stress)

    risk = ClinicalRiskFlags.query.filter_by(student_id=student_id).order_by(
        ClinicalRiskFlags.assessment_date.desc()
    ).first()
    if not risk:
        risk = ClinicalRiskFlags(student_id=student_id)
        db.session.add(risk)

    crisis_flag = sentiment == 'Crisis Flagged' or wellness.overall_stress_level == 'Critical'
    risk.assessment_date = datetime.utcnow()
    risk.suicide_ideation_flag = bool(risk.suicide_ideation_flag or crisis_flag)
    risk.social_isolation_flag = bool(risk.social_isolation_flag or int(diagnostics.get('loneliness', 0)) >= 60)
    risk.academic_crisis_flag = bool(risk.academic_crisis_flag or wellness.academic_pressure_score >= 60)
    risk.gad7_score = clamp_score(max_stress // 5)
    risk.phq9_score = clamp_score((wellness.cognitive_burnout_score + wellness.emotional_fatigue_score) // 8)
    risk.gad7_risk_level = risk_label(risk.gad7_score * 4)
    risk.phq9_risk_level = risk_label(risk.phq9_score * 4)
    risk.overall_risk_level = 'Urgent' if crisis_flag else risk_label(max_stress)
    risk.risk_description = 'Aggregated indicators synced from MindBuddy student analysis.'

def store_multimodal_metadata(student_id: str, modality: str, metadata: dict):
    """Persist non-content audio/video metadata for counselor-safe trend analysis."""
    if not modality or not metadata:
        return

    record = MultimodalData(student_id=student_id, data_type=modality)

    if modality == 'voice':
        record.speech_rate_wpm = metadata.get('speechRateWpm')
        record.vocal_tremor_index = metadata.get('tremorRate')
        record.silence_duration_seconds = metadata.get('pauseCount')
    elif modality == 'facial_emotion':
        record.detected_emotion = metadata.get('expression')
        record.emotion_confidence = metadata.get('tensionScore')
    elif modality == 'biometrics':
        record.heart_rate_avg = metadata.get('heartRate')
        record.sleep_duration_hours = metadata.get('sleepDuration')
        record.deep_sleep_hours = metadata.get('sleepDeep')

    db.session.add(record)

def should_generate_ai_report_summary(student_id: str, report: dict, force: bool = False) -> bool:
    """Use Gemini for counselor summaries only when it adds value and quota allows it."""
    if GEMINI_DISABLED_UNTIL and datetime.utcnow() < GEMINI_DISABLED_UNTIL:
        return False

    if force:
        return True

    risk = report.get('risk_assessment', {})
    if risk.get('immediate_intervention_needed'):
        return True

    latest_report = CounselorReport.query.filter_by(student_id=student_id).order_by(
        CounselorReport.report_date.desc()
    ).first()
    if not latest_report:
        return True

    return datetime.utcnow() - latest_report.report_date >= GEMINI_REPORT_SUMMARY_COOLDOWN

def generate_and_store_privacy_report(student_id: str, generated_by: str = 'system', include_ai_summary: bool = False):
    """Create a privacy-masked counselor report after live student analysis."""
    chats = StudentChat.query.filter_by(student_id=student_id).order_by(StudentChat.timestamp.asc()).all()
    chats_data = [
        {
            'message_type': c.message_type,
            'message_content': c.message_content,
            'timestamp': c.timestamp.isoformat()
        }
        for c in chats[-30:]
    ]

    multimodal_records = MultimodalData.query.filter_by(student_id=student_id).order_by(
        MultimodalData.timestamp.desc()
    ).limit(10).all()
    latest_voice = next((m for m in multimodal_records if m.data_type == 'voice'), None)
    latest_sleep = next((m for m in multimodal_records if m.sleep_duration_hours), None)
    multimodal_data = {
        'speech_rate': latest_voice.speech_rate_wpm if latest_voice else 0,
        'sleep_duration_hours': latest_sleep.sleep_duration_hours if latest_sleep else 0
    }

    wellness = WellnessMetrics.query.filter_by(student_id=student_id).first()
    wellness_data = wellness.to_dict() if wellness else {}

    report = PrivacyPreservingReportEngine().generate_counselor_report(
        student_id,
        chats_data,
        multimodal_data,
        wellness_data
    )
    ai_summary = generate_masked_report_summary_with_ai(report) if should_generate_ai_report_summary(student_id, report, include_ai_summary) else None
    report['ai_masked_summary'] = ai_summary

    db_report = CounselorReport(
        student_id=student_id,
        generated_by=generated_by,
        total_sessions=report['metadata']['total_sessions'],
        mood_trajectory=report['mood_state']['trajectory'],
        primary_stress_factors=str(report['stress_assessment']['breakdown']),
        behavioral_patterns=str({
            'behavioral_indicators': report['behavioral_indicators'],
            'ai_masked_summary': ai_summary
        }),
        immediate_intervention_needed=report['risk_assessment']['immediate_intervention_needed'],
        follow_up_priority=report['risk_assessment']['follow_up_priority'],
        recommended_actions=str(report['clinical_recommendations'])
    )
    db.session.add(db_report)
    return report

def generate_masked_report_summary_with_ai(report: dict):
    """Ask Gemini for a counselor-safe summary using only aggregate/masked report fields."""
    global GEMINI_DISABLED_UNTIL

    if GEMINI_DISABLED_UNTIL and datetime.utcnow() < GEMINI_DISABLED_UNTIL:
        return None

    api_key = get_gemini_api_key()
    if not api_key:
        return None

    masked_payload = {
        'mood_state': report.get('mood_state'),
        'stress_assessment': report.get('stress_assessment'),
        'clinical_screening': report.get('clinical_screening'),
        'behavioral_indicators': report.get('behavioral_indicators'),
        'risk_assessment': report.get('risk_assessment')
    }

    prompt = (
        "Create a concise counselor-facing mental-health screening summary from this masked aggregate data. "
        "Do not include direct quotes, secrets, exact sentences, names, or specific events. "
        "Return JSON with keys: summary, mood_state, stress_level, risk_trends, recommended_next_steps.\n\n"
        f"{json.dumps(masked_payload)}"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    try:
        response = requests.post(
            url,
            json={'contents': [{'parts': [{'text': prompt}]}]},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        if not response.ok:
            if response.status_code == 429:
                GEMINI_DISABLED_UNTIL = datetime.utcnow() + GEMINI_QUOTA_COOLDOWN
            return None

        raw_text = response.json().get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        match = re.search(r"```json\s*([\s\S]*?)```", raw_text)
        if match:
            return json.loads(match.group(1))
        return json.loads(raw_text)
    except Exception as e:
        print(f"Masked AI report summary failed: {e}")
        return None

def call_gemini_api(student_message, history=None):
    """
    Call Gemini API to get an empathetic response.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    system_prompt = (
        "You are MindBuddy, an empathetic, warm, peer-like AI companion for students. "
        "Your personality: supportive, non-judgmental, casual and friendly — never clinical or robotic. "
        "Your responses should feel like talking to a caring, understanding friend. "
        "Keep your response concise (2-4 sentences max)."
    )
    
    contents = []
    if history:
        for msg in history:
            contents.append({
                "parts": [{"text": msg["text"]}]
            })
            
    # Add current message
    contents.append({
        "parts": [{"text": student_message}]
    })
    
    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.85,
            "maxOutputTokens": 300
        }
    }
    
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=8)
        if response.status_code == 200:
            data = response.json()
            reply = data['candidates'][0]['content']['parts'][0]['text']
            return reply.strip()
    except Exception as e:
        print(f"Error querying Gemini backend API: {e}")
    return None

@student_bp.route('/chat', methods=['POST'])
@student_required
def submit_chat():
    """Submit a chat message"""
    try:
        data = request.get_json()
        student_id = request.current_student_id
        
        if not data.get('message'):
            return {'error': 'Empty message'}, 400
        
        # Store student message
        chat = StudentChat(
            student_id=student_id,
            message_type='student',
            message_content=data['message'],
            message_length=len(data['message'])
        )
        db.session.add(chat)
        update_wellness_from_message(student_id, data['message'])
        db.session.commit()
        
        # Fetch recent chat history to provide context
        recent_chats = StudentChat.query.filter_by(student_id=student_id).order_by(StudentChat.timestamp.asc()).all()
        history = []
        for c in recent_chats[-10:-1]:  # Exclude current message since it was added to database
            history.append({
                "role": c.message_type,
                "text": c.message_content
            })

        # Call Gemini AI
        ai_response = call_gemini_api(data['message'], history)
        if not ai_response:
            ai_response = "Thank you for sharing. I'm here to listen."
        
        # Store AI response
        ai_chat = StudentChat(
            student_id=student_id,
            message_type='ai',
            message_content=ai_response,
            message_length=len(ai_response)
        )
        db.session.add(ai_chat)
        db.session.commit()
        
        # Log action (never log content)
        AuditLog.log_action('student', student_id, 'chat_message', details=f'Message length: {len(data["message"])}')
        
        return {
            'success': True,
            'ai_response': ai_response,
            'timestamp': chat.timestamp.isoformat()
        }, 200
    
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

@student_bp.route('/wellness', methods=['GET'])
@student_required
def get_wellness():
    """Get student's wellness metrics"""
    try:
        student_id = request.current_student_id
        
        wellness = WellnessMetrics.query.filter_by(student_id=student_id).first()
        
        if not wellness:
            return {'error': 'No wellness data found'}, 404
        
        # Log action
        AuditLog.log_action('student', student_id, 'view_wellness')
        
        return wellness.to_dict(), 200
    
    except Exception as e:
        return {'error': str(e)}, 500

@student_bp.route('/analysis', methods=['POST'])
@student_required
def sync_student_analysis():
    """Sync MindBuddy client diagnostics so counselor portal can view updated reports."""
    try:
        data = request.get_json() or {}
        student_id = request.current_student_id
        message = (data.get('message') or '').strip()
        reply = (data.get('reply') or '').strip()
        diagnostics = data.get('diagnostics') or {}
        modality = (data.get('modality') or 'text').strip()
        metadata = data.get('metadata') or {}

        if not message:
            return {'error': 'Empty message'}, 400

        chat = StudentChat(
            student_id=student_id,
            message_type='student',
            message_content=message,
            message_length=len(message)
        )
        db.session.add(chat)

        if diagnostics:
            update_wellness_from_diagnostics(student_id, diagnostics)
        else:
            update_wellness_from_message(student_id, message)

        store_multimodal_metadata(student_id, modality, metadata)

        if reply:
            ai_chat = StudentChat(
                student_id=student_id,
                message_type='ai',
                message_content=reply,
                message_length=len(reply)
            )
            db.session.add(ai_chat)

        AuditLog.log_action('student', student_id, 'analysis_sync', details=f'Modality: {modality}; message length: {len(message)}')
        db.session.commit()

        wellness = WellnessMetrics.query.filter_by(student_id=student_id).first()
        risk = ClinicalRiskFlags.query.filter_by(student_id=student_id).order_by(
            ClinicalRiskFlags.assessment_date.desc()
        ).first()

        return {
            'success': True,
            'report_summary': {
                'mood_state': wellness.mood_state if wellness else 'Stable',
                'stress_level': wellness.overall_stress_level if wellness else 'Low',
                'risk_level': risk.overall_risk_level if risk else 'Low',
                'follow_up_priority': 'Generate counselor report when needed'
            }
        }, 200
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

@student_bp.route('/dispatch', methods=['POST'])
@student_required
def trigger_dispatch():
    """Trigger SOS dispatch to counselor, marking risk level as Urgent"""
    try:
        student_id = request.current_student_id
        
        # 1. Update wellness metrics if present
        wellness = WellnessMetrics.query.filter_by(student_id=student_id).first()
        if wellness:
            wellness.mood_state = 'Low'
            wellness.overall_stress_level = 'Critical'
            
        # 2. Add or update ClinicalRiskFlags to Urgent
        risk = ClinicalRiskFlags.query.filter_by(student_id=student_id).order_by(
            ClinicalRiskFlags.assessment_date.desc()
        ).first()
        if not risk:
            risk = ClinicalRiskFlags(student_id=student_id)
            db.session.add(risk)
            
        risk.overall_risk_level = 'Urgent'
        risk.risk_description = 'Emergency SOS Counselor Dispatch triggered by student.'
        risk.suicide_ideation_flag = True
        risk.assessment_date = datetime.utcnow()
        
        # Log action
        AuditLog.log_action('student', student_id, 'sos_dispatch', details='SOS Dispatch triggered by student')
        db.session.commit()
        
        return {
            'success': True,
            'message': 'Emergency counselor dispatch successfully registered.'
        }, 200
        
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

# =============================================================================
# COUNSELOR ENDPOINTS
# =============================================================================

@counselor_bp.route('/students', methods=['GET'])
@counselor_required
def get_all_students():
    """Get list of all students with aggregated metrics"""
    try:
        counselor_id = request.current_counselor_id
        
        students_data = []
        students = Student.query.filter_by(is_active=True).all()
        
        for student in students:
            wellness = WellnessMetrics.query.filter_by(student_id=student.student_id).first()
            risk = ClinicalRiskFlags.query.filter_by(student_id=student.student_id).order_by(
                ClinicalRiskFlags.assessment_date.desc()
            ).first()
            
            student_info = {
                'student_id': student.student_id,
                'full_name': student.full_name,
                'last_login': student.last_login.isoformat() if student.last_login else None,
                'total_sessions': len(student.chats) // 2,  # Divide by 2 (student + AI messages)
                'wellness': wellness.to_dict() if wellness else None,
                'risk_assessment': risk.to_dict() if risk else None,
                'requires_attention': risk and risk.overall_risk_level in ['High', 'Critical', 'Urgent'] if risk else False
            }
            students_data.append(student_info)
        
        # Log action
        AuditLog.log_action('counselor', counselor_id, 'view_student_list')
        
        return {
            'total_students': len(students),
            'students': students_data
        }, 200
    
    except Exception as e:
        return {'error': str(e)}, 500

@counselor_bp.route('/report/<student_id>', methods=['GET'])
@counselor_required
def generate_report(student_id):
    """Generate privacy-preserving report for a student"""
    try:
        counselor_id = request.current_counselor_id
        
        # Fetch student data
        student = Student.query.filter_by(student_id=student_id).first()
        if not student:
            return {'error': 'Student not found'}, 404
        
        # Fetch chats (anonymized)
        chats = StudentChat.query.filter_by(student_id=student_id).all()
        chats_data = [
            {
                'message_type': c.message_type,
                'message_content': c.message_content,
                'timestamp': c.timestamp.isoformat()
            }
            for c in chats
        ]
        
        # Fetch multimodal data
        multimodal_records = MultimodalData.query.filter_by(student_id=student_id).all()
        multimodal_data = {
            'speech_rate': multimodal_records[0].speech_rate_wpm if multimodal_records else 0,
            'sleep_duration_hours': multimodal_records[0].sleep_duration_hours if multimodal_records else 0
        }
        
        # Fetch wellness metrics
        wellness = WellnessMetrics.query.filter_by(student_id=student_id).first()
        wellness_data = wellness.to_dict() if wellness else {}
        
        # Generate privacy-preserving report
        engine = PrivacyPreservingReportEngine()
        report = engine.generate_counselor_report(
            student_id,
            chats_data,
            multimodal_data,
            wellness_data
        )
        
        # Store report
        db_report = CounselorReport(
            student_id=student_id,
            generated_by=counselor_id,
            mood_trajectory=report['mood_state']['trajectory'],
            primary_stress_factors=str(report['stress_assessment']['breakdown']),
            immediate_intervention_needed=report['risk_assessment']['immediate_intervention_needed'],
            follow_up_priority=report['risk_assessment']['follow_up_priority'],
            recommended_actions=str(report['clinical_recommendations'])
        )
        db.session.add(db_report)
        db.session.commit()
        
        # Log action (never log content)
        AuditLog.log_action('counselor', counselor_id, 'generate_report', details=f'Report for student {student_id}')
        
        return report, 200
    
    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}, 500

@counselor_bp.route('/reports/<student_id>', methods=['GET'])
@counselor_required
def get_student_reports(student_id):
    """Get all reports for a student"""
    try:
        counselor_id = request.current_counselor_id
        
        reports = CounselorReport.query.filter_by(student_id=student_id).order_by(
            CounselorReport.report_date.desc()
        ).all()
        
        reports_data = [r.to_dict() for r in reports]
        
        # Log action
        AuditLog.log_action('counselor', counselor_id, 'view_reports', details=f'Reports for student {student_id}')
        
        return {'reports': reports_data}, 200
    
    except Exception as e:
        return {'error': str(e)}, 500

@counselor_bp.route('/dashboard', methods=['GET'])
@counselor_required
def counselor_dashboard():
    """Counselor dashboard overview"""
    try:
        counselor_id = request.current_counselor_id
        
        # Stats
        total_students = Student.query.filter_by(is_active=True).count()
        students_needing_attention = db.session.query(ClinicalRiskFlags).filter(
            ClinicalRiskFlags.overall_risk_level.in_(['High', 'Critical', 'Urgent'])
        ).count()
        
        urgent_cases = CounselorReport.query.filter(
            CounselorReport.follow_up_priority.in_(['Urgent', 'Critical'])
        ).count()
        
        # Log action
        AuditLog.log_action('counselor', counselor_id, 'view_dashboard')
        
        return {
            'total_students': total_students,
            'students_needing_attention': students_needing_attention,
            'urgent_cases': urgent_cases,
            'timestamp': datetime.utcnow().isoformat()
        }, 200
    
    except Exception as e:
        return {'error': str(e)}, 500
