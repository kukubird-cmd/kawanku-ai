-- =============================================================================
-- KawanKu AI - Privacy-First Database Schema
-- =============================================================================
-- This schema enforces strict isolation between student and counselor views

-- TABLE 1: Students (Core Identity)
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,  -- Unique student identifier (e.g., STU001)
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    school_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- TABLE 2: Student Sessions (Login & Activity Tracking)
CREATE TABLE IF NOT EXISTS student_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    session_token TEXT UNIQUE NOT NULL,
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    device_info TEXT,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY(student_id) REFERENCES students(student_id)
);

-- TABLE 3: Chat Messages (Encrypted Storage - Core Data)
CREATE TABLE IF NOT EXISTS student_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('student', 'ai')),
    message_content TEXT NOT NULL,  -- Store encrypted for production
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id INTEGER,
    message_length INT,  -- For analytics without leaking content
    FOREIGN KEY(student_id) REFERENCES students(student_id)
);

-- TABLE 4: Multimodal Inputs (Voice, Emotion, Biometrics)
CREATE TABLE IF NOT EXISTS multimodal_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    data_type TEXT CHECK(data_type IN ('voice', 'facial_emotion', 'sleep_log', 'heart_rate')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Voice metrics (no audio stored)
    vocal_pitch_avg FLOAT,
    speech_rate_wpm FLOAT,
    vocal_tremor_index FLOAT,
    silence_duration_seconds FLOAT,
    
    -- Facial emotion (no video stored)
    detected_emotion TEXT,
    emotion_confidence FLOAT,
    
    -- Sleep/activity logs
    sleep_duration_hours FLOAT,
    deep_sleep_hours FLOAT,
    late_night_activity_flag BOOLEAN,
    
    -- Biometric data
    heart_rate_avg INT,
    heart_rate_variability INT,
    
    FOREIGN KEY(student_id) REFERENCES students(student_id)
);

-- TABLE 5: Aggregated Wellness Metrics (Privacy-Masked)
CREATE TABLE IF NOT EXISTS wellness_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Mood State Index (anonymized)
    mood_state TEXT CHECK(mood_state IN ('Stable', 'Fluctuating', 'Low', 'Elevated')),
    mood_stability_score INT,  -- 0-100
    
    -- Stress Breakdown
    cognitive_burnout_score INT,  -- 0-100
    emotional_fatigue_score INT,  -- 0-100
    social_stress_score INT,  -- 0-100
    academic_pressure_score INT,  -- 0-100
    overall_stress_level TEXT CHECK(overall_stress_level IN ('Low', 'Moderate', 'High', 'Critical')),
    
    -- Engagement Metrics
    engagement_level INT,  -- 0-100
    message_frequency_daily FLOAT,  -- messages per day
    
    -- Activity Patterns
    late_night_activity_percentage FLOAT,
    avg_session_duration_minutes INT,
    
    -- Time-based aggregates
    total_chat_sessions INT,
    avg_sentiment_score FLOAT,  -- -1.0 to 1.0
    
    FOREIGN KEY(student_id) REFERENCES students(student_id)
);

-- TABLE 6: Clinical Risk Flags (Screening Results)
CREATE TABLE IF NOT EXISTS clinical_risk_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- GAD-7 Anxiety Screening (0-21 severity score)
    gad7_score INT,
    gad7_risk_level TEXT CHECK(gad7_risk_level IN ('Minimal', 'Mild', 'Moderate', 'Severe')),
    
    -- PHQ-9 Depression Screening (0-27 severity score)
    phq9_score INT,
    phq9_risk_level TEXT CHECK(phq9_risk_level IN ('Minimal', 'Mild', 'Moderate', 'Moderately Severe', 'Severe')),
    
    -- Custom Risk Indicators
    suicide_ideation_flag BOOLEAN DEFAULT 0,
    self_harm_indicators INT,  -- count of concerning patterns
    social_isolation_flag BOOLEAN DEFAULT 0,
    academic_crisis_flag BOOLEAN DEFAULT 0,
    sleep_disruption_flag BOOLEAN DEFAULT 0,
    
    -- Overall Risk Assessment
    overall_risk_level TEXT CHECK(overall_risk_level IN ('Low', 'Moderate', 'High', 'Urgent')),
    risk_description TEXT,  -- General description (no specific quotes)
    
    FOREIGN KEY(student_id) REFERENCES students(student_id)
);

-- TABLE 7: Counselor Reports (Final Output - Aggregate View)
CREATE TABLE IF NOT EXISTS counselor_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    report_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by TEXT,  -- Counselor ID
    
    -- Metadata
    days_since_last_login INT,
    total_sessions INT,
    
    -- Aggregated Mental Health Summary
    mood_trajectory TEXT,  -- improving, stable, declining
    primary_stress_factors TEXT,  -- JSON: ["academic", "social", "burnout"]
    behavioral_patterns TEXT,  -- JSON: patterns summary
    
    -- Clinical Assessment
    immediate_intervention_needed BOOLEAN,
    recommended_actions TEXT,  -- JSON: array of action items
    follow_up_priority TEXT CHECK(follow_up_priority IN ('Routine', 'Escalate', 'Urgent', 'Critical')),
    
    -- Report Notes
    counselor_notes TEXT,
    
    is_reviewed BOOLEAN DEFAULT 0,
    reviewed_at TIMESTAMP,
    
    FOREIGN KEY(student_id) REFERENCES students(student_id)
);

-- TABLE 8: Counselor Accounts (Access Control)
CREATE TABLE IF NOT EXISTS counselors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    counselor_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    department TEXT,
    credentials TEXT,  -- e.g., "Licensed Clinical Counselor"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- TABLE 9: Counselor Sessions (Portal Access Logging)
CREATE TABLE IF NOT EXISTS counselor_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    counselor_id TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY(counselor_id) REFERENCES counselors(counselor_id)
);

-- TABLE 10: Audit Log (Compliance & Privacy Tracking)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_type TEXT CHECK(user_type IN ('student', 'counselor')),
    user_id TEXT,
    action TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    details TEXT,
    -- Never log sensitive content
    FOREIGN KEY(user_id) REFERENCES students(student_id)
);

-- =============================================================================
-- INDEXES for Performance & Security
-- =============================================================================
CREATE INDEX idx_student_id ON students(student_id);
CREATE INDEX idx_student_email ON students(email);
CREATE INDEX idx_chat_student_timestamp ON student_chats(student_id, timestamp);
CREATE INDEX idx_multimodal_student ON multimodal_data(student_id, timestamp);
CREATE INDEX idx_wellness_student ON wellness_metrics(student_id);
CREATE INDEX idx_risk_flags_student ON clinical_risk_flags(student_id);
CREATE INDEX idx_reports_student ON counselor_reports(student_id);
CREATE INDEX idx_counselor_id ON counselors(counselor_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- =============================================================================
-- VIEW: Student Aggregated Data (for counselor report generation)
-- =============================================================================
CREATE VIEW IF NOT EXISTS v_student_aggregates AS
SELECT 
    s.student_id,
    s.full_name,
    s.last_login,
    COUNT(DISTINCT sc.id) as total_messages,
    COUNT(DISTINCT DATE(sc.timestamp)) as active_days,
    AVG(wm.overall_stress_level) as avg_stress_level,
    MAX(crf.overall_risk_level) as current_risk_level,
    wm.mood_state,
    crf.gad7_score,
    crf.phq9_score
FROM students s
LEFT JOIN student_chats sc ON s.student_id = sc.student_id
LEFT JOIN wellness_metrics wm ON s.student_id = wm.student_id
LEFT JOIN clinical_risk_flags crf ON s.student_id = crf.student_id
GROUP BY s.student_id;
