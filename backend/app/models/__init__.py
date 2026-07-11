"""
KawanKu AI - Backend Models
Defines all database models with SQLAlchemy
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

db = SQLAlchemy()

# =============================================================================
# STUDENT MODELS
# =============================================================================

class Student(db.Model):
    """Student account model"""
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    date_of_birth = db.Column(db.Date)
    school_id = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    chats = db.relationship('StudentChat', backref='student', lazy=True, cascade='all, delete-orphan')
    sessions = db.relationship('StudentSession', backref='student', lazy=True, cascade='all, delete-orphan')
    wellness = db.relationship('WellnessMetrics', backref='student', uselist=False)
    multimodal = db.relationship('MultimodalData', backref='student', lazy=True)
    risk_flags = db.relationship('ClinicalRiskFlags', backref='student', lazy=True)
    
    def set_password(self, password):
        """Hash and store password"""
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    
    def check_password(self, password):
        """Verify password"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dict (sensitive fields excluded)"""
        return {
            'student_id': self.student_id,
            'email': self.email,
            'full_name': self.full_name,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active
        }


class StudentSession(db.Model):
    """Student login session tracking"""
    __tablename__ = 'student_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.student_id'), nullable=False, unique=True)
    session_token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    login_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))
    device_info = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, default=True)
    
    @staticmethod
    def create_session(student_id, ip_address='', device_info=''):
        """Create a new session token"""
        token = secrets.token_urlsafe(32)
        session = StudentSession(
            student_id=student_id,
            session_token=token,
            ip_address=ip_address,
            device_info=device_info
        )
        return session


class StudentChat(db.Model):
    """Student-AI conversation messages"""
    __tablename__ = 'student_chats'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.student_id'), nullable=False, index=True)
    message_type = db.Column(db.String(10), nullable=False)  # 'student' or 'ai'
    message_content = db.Column(db.Text, nullable=False)  # Store encrypted in production
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    session_id = db.Column(db.Integer)
    message_length = db.Column(db.Integer)  # For analytics
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_type': self.message_type,
            'content': self.message_content,
            'timestamp': self.timestamp.isoformat(),
            'length': self.message_length
        }


class MultimodalData(db.Model):
    """Non-content multimodal inputs (voice, emotion, biometrics)"""
    __tablename__ = 'multimodal_data'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.student_id'), nullable=False, index=True)
    data_type = db.Column(db.String(20), nullable=False)  # voice, facial_emotion, sleep_log, heart_rate
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Voice metrics
    vocal_pitch_avg = db.Column(db.Float)
    speech_rate_wpm = db.Column(db.Float)
    vocal_tremor_index = db.Column(db.Float)
    silence_duration_seconds = db.Column(db.Float)
    
    # Facial emotion
    detected_emotion = db.Column(db.String(20))  # happy, sad, anxious, calm, etc.
    emotion_confidence = db.Column(db.Float)
    
    # Sleep/activity
    sleep_duration_hours = db.Column(db.Float)
    deep_sleep_hours = db.Column(db.Float)
    late_night_activity_flag = db.Column(db.Boolean)
    
    # Biometrics
    heart_rate_avg = db.Column(db.Integer)
    heart_rate_variability = db.Column(db.Integer)


# =============================================================================
# WELLNESS & CLINICAL MODELS
# =============================================================================

class WellnessMetrics(db.Model):
    """Aggregated wellness metrics (privacy-masked)"""
    __tablename__ = 'wellness_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.student_id'), nullable=False, unique=True, index=True)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Mood
    mood_state = db.Column(db.String(20))  # Stable, Fluctuating, Low, Elevated
    mood_stability_score = db.Column(db.Integer, default=50)  # 0-100
    
    # Stress breakdown
    cognitive_burnout_score = db.Column(db.Integer, default=0)  # 0-100
    emotional_fatigue_score = db.Column(db.Integer, default=0)
    social_stress_score = db.Column(db.Integer, default=0)
    academic_pressure_score = db.Column(db.Integer, default=0)
    overall_stress_level = db.Column(db.String(20), default='Low')  # Low, Moderate, High, Critical
    
    # Engagement
    engagement_level = db.Column(db.Integer, default=50)  # 0-100
    message_frequency_daily = db.Column(db.Float, default=0)
    
    # Activity patterns
    late_night_activity_percentage = db.Column(db.Float, default=0)
    avg_session_duration_minutes = db.Column(db.Integer, default=0)
    total_chat_sessions = db.Column(db.Integer, default=0)
    avg_sentiment_score = db.Column(db.Float, default=0)  # -1.0 to 1.0
    
    def to_dict(self):
        return {
            'mood_state': self.mood_state,
            'mood_stability': self.mood_stability_score,
            'stress_breakdown': {
                'cognitive_burnout': self.cognitive_burnout_score,
                'emotional_fatigue': self.emotional_fatigue_score,
                'social_stress': self.social_stress_score,
                'academic_pressure': self.academic_pressure_score
            },
            'overall_stress': self.overall_stress_level,
            'engagement': self.engagement_level,
            'activity_patterns': {
                'message_frequency': self.message_frequency_daily,
                'late_night_activity': self.late_night_activity_percentage,
                'avg_session_duration': self.avg_session_duration_minutes
            }
        }


class ClinicalRiskFlags(db.Model):
    """Clinical risk screening results"""
    __tablename__ = 'clinical_risk_flags'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.student_id'), nullable=False, index=True)
    assessment_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # GAD-7 Anxiety Screening (0-21)
    gad7_score = db.Column(db.Integer, default=0)
    gad7_risk_level = db.Column(db.String(20), default='Minimal')
    
    # PHQ-9 Depression Screening (0-27)
    phq9_score = db.Column(db.Integer, default=0)
    phq9_risk_level = db.Column(db.String(20), default='Minimal')
    
    # Custom risk indicators
    suicide_ideation_flag = db.Column(db.Boolean, default=False)
    self_harm_indicators = db.Column(db.Integer, default=0)
    social_isolation_flag = db.Column(db.Boolean, default=False)
    academic_crisis_flag = db.Column(db.Boolean, default=False)
    sleep_disruption_flag = db.Column(db.Boolean, default=False)
    
    # Overall assessment
    overall_risk_level = db.Column(db.String(20), default='Low')
    risk_description = db.Column(db.Text)  # No specific quotes
    
    def to_dict(self):
        return {
            'gad7': {
                'score': self.gad7_score,
                'risk_level': self.gad7_risk_level
            },
            'phq9': {
                'score': self.phq9_score,
                'risk_level': self.phq9_risk_level
            },
            'risk_flags': {
                'suicide_ideation': self.suicide_ideation_flag,
                'self_harm_indicators': self.self_harm_indicators,
                'social_isolation': self.social_isolation_flag,
                'academic_crisis': self.academic_crisis_flag,
                'sleep_disruption': self.sleep_disruption_flag
            },
            'overall_risk': self.overall_risk_level,
            'overall_risk_level': self.overall_risk_level,
            'description': self.risk_description,
            'assessment_date': self.assessment_date.isoformat()
        }


class CounselorReport(db.Model):
    """Final report for counselors (aggregate view)"""
    __tablename__ = 'counselor_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(50), db.ForeignKey('students.student_id'), nullable=False, index=True)
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    generated_by = db.Column(db.String(50))  # Counselor ID
    
    # Metadata
    days_since_last_login = db.Column(db.Integer)
    total_sessions = db.Column(db.Integer)
    
    # Aggregated summary (JSON stored as text)
    mood_trajectory = db.Column(db.String(20))  # improving, stable, declining
    primary_stress_factors = db.Column(db.Text)  # JSON
    behavioral_patterns = db.Column(db.Text)  # JSON
    
    # Clinical assessment
    immediate_intervention_needed = db.Column(db.Boolean, default=False)
    recommended_actions = db.Column(db.Text)  # JSON
    follow_up_priority = db.Column(db.String(20))  # Routine, Escalate, Urgent, Critical
    
    # Notes
    counselor_notes = db.Column(db.Text)
    is_reviewed = db.Column(db.Boolean, default=False)
    reviewed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'report_id': self.id,
            'student_id': self.student_id,
            'report_date': self.report_date.isoformat(),
            'mood_trajectory': self.mood_trajectory,
            'stress_factors': self.primary_stress_factors,
            'intervention_needed': self.immediate_intervention_needed,
            'follow_up_priority': self.follow_up_priority,
            'is_reviewed': self.is_reviewed
        }


# =============================================================================
# COUNSELOR MODELS
# =============================================================================

class Counselor(db.Model):
    """Counselor account model"""
    __tablename__ = 'counselors'
    
    id = db.Column(db.Integer, primary_key=True)
    counselor_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    department = db.Column(db.String(100))
    credentials = db.Column(db.String(255))  # License info
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    sessions = db.relationship('CounselorSession', backref='counselor', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'counselor_id': self.counselor_id,
            'full_name': self.full_name,
            'email': self.email,
            'department': self.department,
            'credentials': self.credentials
        }


class CounselorSession(db.Model):
    """Counselor portal session tracking"""
    __tablename__ = 'counselor_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    counselor_id = db.Column(db.String(50), db.ForeignKey('counselors.counselor_id'), nullable=False, index=True)
    session_token = db.Column(db.String(255), unique=True, nullable=False)
    login_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)


# =============================================================================
# AUDIT & COMPLIANCE
# =============================================================================

class AuditLog(db.Model):
    """Compliance and privacy audit trail"""
    __tablename__ = 'audit_log'
    
    id = db.Column(db.Integer, primary_key=True)
    user_type = db.Column(db.String(20))  # student or counselor
    user_id = db.Column(db.String(50))
    action = db.Column(db.String(100))  # login, view_report, download, etc.
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    ip_address = db.Column(db.String(50))
    details = db.Column(db.Text)  # Never log sensitive content
    
    @staticmethod
    def log_action(user_type, user_id, action, ip_address='', details=''):
        """Log an action for compliance"""
        log_entry = AuditLog(
            user_type=user_type,
            user_id=user_id,
            action=action,
            ip_address=ip_address,
            details=details
        )
        db.session.add(log_entry)
        db.session.commit()
