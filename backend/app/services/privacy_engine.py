"""
Privacy-Preserving Report Generation Engine
Analyzes student data WITHOUT exposing sensitive content to counselors
Uses Gemini AI to extract clinical patterns, not specific statements
"""

import json
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Note: google.generativeai has circular import issues in some versions
# Uncommenting this line may cause startup issues
# import google.generativeai as genai
# GEMINI_API_KEY = "your-api-key-here"
# genai.configure(api_key=GEMINI_API_KEY)

class PrivacyPreservingReportEngine:
    """
    Generates clinical reports WITHOUT exposing:
    - Direct quotes from conversations
    - Specific topics discussed
    - Names of people mentioned
    - Exact circumstances or events
    
    Instead, reports contain:
    - Pattern analysis (frequency, timing, emotional tone)
    - Behavioral indicators (withdrawal, fatigue, engagement)
    - Risk screening results (GAD-7, PHQ-9 equivalent scores)
    - Recommendations (not based on specific confessions)
    """
    
    def __init__(self):
        try:
            import google.generativeai as genai
            import os
            api_key = os.environ.get('GEMINI_API_KEY', '').strip()
            if not api_key:
                self.model = None
                return
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        except Exception as e:
            print(f"Error configuring generative AI: {e}")
            self.model = None
    
    # =========================================================================
    # STEP 1: CHAT HISTORY ANONYMIZATION
    # =========================================================================
    
    def anonymize_chat_history(self, chats: List[Dict]) -> List[Dict]:
        """
        Remove identifiable information from chat history
        Preserve only: message length, timestamp, emotional tone
        """
        anonymized = []
        
        for chat in chats:
            # Extract metrics without content
            anonymized_chat = {
                'message_type': chat['message_type'],
                'timestamp': chat['timestamp'],
                'message_length': len(chat['message_content']),
                'word_count': len(chat['message_content'].split()),
                'hour_of_day': datetime.fromisoformat(chat['timestamp']).hour,
                'sentiment_polarity': self._calculate_sentiment(chat['message_content'])
            }
            anonymized.append(anonymized_chat)
        
        return anonymized
    
    def _calculate_sentiment(self, text: str) -> float:
        """Calculate sentiment without storing text (-1.0 to 1.0)"""
        # Simplified sentiment; in production use VADER/TextBlob
        positive_words = ['good', 'great', 'happy', 'excited', 'amazing', 'love']
        negative_words = ['bad', 'sad', 'angry', 'upset', 'hate', 'terrible']
        
        text_lower = text.lower()
        pos_count = sum(1 for word in positive_words if word in text_lower)
        neg_count = sum(1 for word in negative_words if word in text_lower)
        
        total = pos_count + neg_count
        if total == 0:
            return 0.0
        
        return (pos_count - neg_count) / total
    
    # =========================================================================
    # STEP 2: BEHAVIORAL PATTERN EXTRACTION
    # =========================================================================
    
    def extract_behavioral_patterns(self, chats: List[Dict], multimodal: Dict) -> Dict:
        """
        Extract patterns WITHOUT content
        Examples:
        - "Frequent late-night messaging activity (after 11 PM)"
        - "Conversation frequency decreased 40% this week"
        - "Vocal tremor index elevated in recent sessions"
        """
        patterns = {
            'activity_timing': self._analyze_activity_timing(chats),
            'engagement_trends': self._analyze_engagement_trends(chats),
            'response_patterns': self._analyze_response_patterns(chats),
            'somatic_indicators': self._analyze_somatic_indicators(multimodal)
        }
        
        return patterns
    
    def _analyze_activity_timing(self, chats: List[Dict]) -> Dict:
        """Analyze when user is active"""
        late_night_count = sum(1 for chat in chats if chat['hour_of_day'] >= 23 or chat['hour_of_day'] <= 5)
        total_chats = len(chats)
        
        return {
            'late_night_percentage': (late_night_count / total_chats * 100) if total_chats > 0 else 0,
            'peak_activity_hours': self._get_peak_hours(chats),
            'activity_consistency': self._calculate_consistency(chats),
            'description': f"User shows {'elevated' if late_night_count/total_chats > 0.3 else 'moderate'} late-night activity patterns"
        }
    
    def _get_peak_hours(self, chats: List[Dict]) -> List[int]:
        """Find most active hours"""
        if not chats:
            return []
        
        hour_counts = {}
        for chat in chats:
            hour = chat['hour_of_day']
            hour_counts[hour] = hour_counts.get(hour, 0) + 1
        
        sorted_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)
        return [hour for hour, count in sorted_hours[:3]]
    
    def _calculate_consistency(self, chats: List[Dict]) -> str:
        """Is engagement consistent or erratic?"""
        if len(chats) < 7:
            return "Insufficient data"
        
        # Group by day
        daily_counts = {}
        for chat in chats:
            date = chat['timestamp'].split('T')[0]
            daily_counts[date] = daily_counts.get(date, 0) + 1
        
        avg = sum(daily_counts.values()) / len(daily_counts)
        variance = sum((x - avg) ** 2 for x in daily_counts.values()) / len(daily_counts)
        
        if variance > avg * 2:
            return "Erratic"
        elif variance > avg:
            return "Variable"
        else:
            return "Consistent"
    
    def _analyze_engagement_trends(self, chats: List[Dict]) -> Dict:
        """Engagement trajectory (increasing, decreasing, stable)"""
        if len(chats) < 10:
            return {'trend': 'Insufficient data', 'direction': None}
        
        # Split into first half and second half
        mid = len(chats) // 2
        first_half_avg_length = sum(c['message_length'] for c in chats[:mid]) / mid
        second_half_avg_length = sum(c['message_length'] for c in chats[mid:]) / (len(chats) - mid)
        
        percent_change = ((second_half_avg_length - first_half_avg_length) / first_half_avg_length) * 100
        
        if percent_change > 20:
            trend = "Increasing engagement - messages becoming longer"
            direction = "improving"
        elif percent_change < -20:
            trend = "Declining engagement - messages becoming shorter"
            direction = "declining"
        else:
            trend = "Stable engagement patterns"
            direction = "stable"
        
        return {
            'trend': trend,
            'direction': direction,
            'percent_change': round(percent_change, 1)
        }
    
    def _analyze_response_patterns(self, chats: List[Dict]) -> Dict:
        """Response latency and interaction patterns"""
        if len(chats) < 2:
            return {'pattern': 'Insufficient data'}
        
        # Calculate sentiment consistency
        sentiments = [c['sentiment_polarity'] for c in chats if c['message_type'] == 'student']
        
        if not sentiments:
            return {'pattern': 'No student messages'}
        
        avg_sentiment = sum(sentiments) / len(sentiments)
        sentiment_variance = sum((s - avg_sentiment) ** 2 for s in sentiments) / len(sentiments)
        
        if sentiment_variance > 0.3:
            emotional_pattern = "Emotionally variable - mood fluctuations detected"
        elif avg_sentiment < -0.2:
            emotional_pattern = "Predominantly negative emotional tone"
        elif avg_sentiment > 0.2:
            emotional_pattern = "Predominantly positive emotional tone"
        else:
            emotional_pattern = "Emotionally neutral - balanced tone"
        
        return {
            'pattern': emotional_pattern,
            'avg_sentiment': round(avg_sentiment, 2),
            'emotional_consistency': 'Stable' if sentiment_variance < 0.2 else 'Variable'
        }
    
    def _analyze_somatic_indicators(self, multimodal: Dict) -> Dict:
        """Non-content physical/behavioral indicators"""
        indicators = {
            'vocal_indicators': [],
            'sleep_patterns': [],
            'biometric_indicators': []
        }
        
        # Voice metrics
        if multimodal.get('vocal_pitch_variability'):
            if multimodal['vocal_pitch_variability'] > 40:
                indicators['vocal_indicators'].append("Elevated vocal variability (stress indicator)")
        
        if multimodal.get('speech_rate'):
            if multimodal['speech_rate'] > 150:
                indicators['vocal_indicators'].append("Rapid speech rate")
            elif multimodal['speech_rate'] < 100:
                indicators['vocal_indicators'].append("Slow speech rate (fatigue indicator)")
        
        # Sleep
        if multimodal.get('sleep_duration_hours'):
            if multimodal['sleep_duration_hours'] < 6:
                indicators['sleep_patterns'].append("Sleep duration consistently below 6 hours")
            elif multimodal['sleep_duration_hours'] > 9:
                indicators['sleep_patterns'].append("Excessive sleep duration")
        
        if multimodal.get('late_night_activity'):
            indicators['sleep_patterns'].append("Frequent late-night activity detected")
        
        return indicators
    
    # =========================================================================
    # STEP 3: CLINICAL RISK SCREENING (GAD-7, PHQ-9 EQUIVALENT)
    # =========================================================================
    
    def generate_clinical_screening(self, chats: List[Dict], behavioral_patterns: Dict) -> Dict:
        """
        Generate GAD-7 and PHQ-9 equivalent scores based on:
        - Activity patterns
        - Engagement trends
        - Multimodal data
        
        NOT based on specific statements (privacy-first)
        """
        
        # GAD-7 Anxiety Screening (0-21)
        anxiety_score = self._calculate_anxiety_indicators(chats, behavioral_patterns)
        
        # PHQ-9 Depression Screening (0-27)
        depression_score = self._calculate_depression_indicators(chats, behavioral_patterns)
        
        return {
            'gad7': {
                'score': anxiety_score,
                'risk_level': self._anxiety_risk_level(anxiety_score),
                'clinical_note': f"Anxiety screening equivalent based on behavioral patterns and activity anomalies"
            },
            'phq9': {
                'score': depression_score,
                'risk_level': self._depression_risk_level(depression_score),
                'clinical_note': f"Depression screening equivalent based on engagement trends and somatic indicators"
            }
        }
    
    def _calculate_anxiety_indicators(self, chats: List[Dict], patterns: Dict) -> int:
        """Derive anxiety score from patterns"""
        score = 0
        
        # Late-night activity = anxiety indicator
        if patterns['activity_timing']['late_night_percentage'] > 40:
            score += 6
        elif patterns['activity_timing']['late_night_percentage'] > 20:
            score += 3
        
        # Message frequency spikes = rumination indicator
        engagement = patterns['engagement_trends']
        if engagement['direction'] == 'improving':
            score += 0
        elif engagement['direction'] == 'declining':
            score += 2
        
        # Emotional variability
        if patterns['response_patterns'].get('emotional_consistency') == 'Variable':
            score += 4
        
        return min(score, 21)  # Cap at max GAD-7 score
    
    def _calculate_depression_indicators(self, chats: List[Dict], patterns: Dict) -> int:
        """Derive depression score from patterns"""
        score = 0
        
        # Declining engagement = withdrawal indicator
        engagement = patterns['engagement_trends']
        if engagement['direction'] == 'declining':
            score += 8
        elif engagement['direction'] == 'stable':
            score += 3
        
        # Negative sentiment = mood indicator
        if patterns['response_patterns'].get('avg_sentiment', 0) < -0.3:
            score += 7
        elif patterns['response_patterns'].get('avg_sentiment', 0) < -0.1:
            score += 3
        
        # Somatic indicators
        somatic = patterns.get('somatic_indicators', {})
        if 'Sleep' in str(somatic):
            score += 5
        
        return min(score, 27)  # Cap at max PHQ-9 score
    
    def _anxiety_risk_level(self, score: int) -> str:
        """GAD-7 risk categorization"""
        if score < 5:
            return "Minimal"
        elif score < 10:
            return "Mild"
        elif score < 15:
            return "Moderate"
        else:
            return "Severe"
    
    def _depression_risk_level(self, score: int) -> str:
        """PHQ-9 risk categorization"""
        if score < 5:
            return "Minimal"
        elif score < 10:
            return "Mild"
        elif score < 15:
            return "Moderate"
        elif score < 20:
            return "Moderately Severe"
        else:
            return "Severe"
    
    # =========================================================================
    # STEP 4: CRISIS DETECTION (Privacy-Preserving)
    # =========================================================================
    
    def detect_crisis_indicators(self, chats: List[Dict]) -> Dict:
        """
        Detect crisis indicators WITHOUT reading specific content
        Uses: message patterns, timing, engagement changes
        """
        indicators = {
            'suicide_ideation_flag': False,
            'self_harm_indicators': 0,
            'social_isolation_flag': False,
            'academic_crisis_flag': False,
            'sleep_disruption_flag': False,
            'severe_withdrawal_flag': False
        }
        
        # Check for sudden engagement drop
        if len(chats) >= 10:
            recent_activity = len([c for c in chats[-10:] if c['message_type'] == 'student'])
            prior_activity = len([c for c in chats[-20:-10] if c['message_type'] == 'student'])
            
            if recent_activity == 0 and prior_activity > 5:
                indicators['severe_withdrawal_flag'] = True
                indicators['self_harm_indicators'] += 2
        
        # Check for extreme late-night patterns
        late_night_chats = [c for c in chats if c['hour_of_day'] >= 2 and c['hour_of_day'] <= 4]
        if len(late_night_chats) > len(chats) * 0.4:
            indicators['sleep_disruption_flag'] = True
            indicators['self_harm_indicators'] += 1
        
        # Check for consistently negative sentiment
        negative_chats = [c for c in chats if c['sentiment_polarity'] < -0.5]
        if len(chats) > 0 and len(negative_chats) / len(chats) > 0.7:
            indicators['self_harm_indicators'] += 2
        
        return indicators
    
    # =========================================================================
    # STEP 5: FINAL REPORT COMPILATION
    # =========================================================================
    
    def generate_counselor_report(
        self,
        student_id: str,
        chats: List[Dict],
        multimodal: Dict,
        wellness: Dict
    ) -> Dict:
        """
        Generate the final privacy-preserved report for counselors
        """
        
        # Step 1: Anonymize
        anonymized_chats = self.anonymize_chat_history(chats)
        
        # Step 2: Extract patterns
        behavioral_patterns = self.extract_behavioral_patterns(anonymized_chats, multimodal)
        
        # Step 3: Clinical screening
        clinical_screening = self.generate_clinical_screening(anonymized_chats, behavioral_patterns)
        
        # Step 4: Crisis detection
        crisis_indicators = self.detect_crisis_indicators(anonymized_chats)
        
        # Step 5: Determine follow-up priority
        priority = self._determine_priority(clinical_screening, crisis_indicators)
        
        # Step 6: Generate recommendations
        recommendations = self._generate_recommendations(clinical_screening, behavioral_patterns, crisis_indicators)
        
        # Compile final report
        report = {
            'student_id': student_id,
            'report_date': datetime.utcnow().isoformat(),
            
            # METADATA
            'metadata': {
                'total_sessions': len(set(c['timestamp'].split('T')[0] for c in chats)),
                'total_messages': len(chats),
                'analysis_period_days': 30  # Last 30 days
            },
            
            # MOOD STATE INDEX
            'mood_state': {
                'current_state': wellness.get('mood_state', 'Unknown'),
                'stability_score': wellness.get('mood_stability_score', 50),
                'trajectory': behavioral_patterns['engagement_trends']['direction'],
                'description': f"Student shows {behavioral_patterns['engagement_trends']['trend']}"
            },
            
            # STRESS ASSESSMENT
            'stress_assessment': {
                'overall_level': wellness.get('overall_stress_level', 'Moderate'),
                'breakdown': {
                    'cognitive_burnout': wellness.get('cognitive_burnout_score', 0),
                    'emotional_fatigue': wellness.get('emotional_fatigue_score', 0),
                    'social_stress': wellness.get('social_stress_score', 0),
                    'academic_pressure': wellness.get('academic_pressure_score', 0)
                }
            },
            
            # CLINICAL SCREENING
            'clinical_screening': clinical_screening,
            
            # BEHAVIORAL INDICATORS
            'behavioral_indicators': {
                'activity_patterns': behavioral_patterns['activity_timing']['description'],
                'engagement_pattern': behavioral_patterns['response_patterns']['pattern'],
                'somatic_indicators': behavioral_patterns['somatic_indicators'],
                'crisis_flags': crisis_indicators
            },
            
            # RISK ASSESSMENT
            'risk_assessment': {
                'overall_risk_level': self._calculate_overall_risk(clinical_screening, crisis_indicators),
                'immediate_intervention_needed': crisis_indicators['severe_withdrawal_flag'] or crisis_indicators['suicide_ideation_flag'],
                'follow_up_priority': priority
            },
            
            # RECOMMENDATIONS
            'clinical_recommendations': recommendations,
            
            # PRIVACY NOTICE
            'privacy_notice': 'This report contains aggregated behavioral patterns and screening equivalents. No direct quotes or specific content from student conversations are included.'
        }
        
        return report
    
    def _determine_priority(self, clinical_screening: Dict, crisis_indicators: Dict) -> str:
        """Determine follow-up priority"""
        if crisis_indicators['suicide_ideation_flag']:
            return "Critical"
        if crisis_indicators['severe_withdrawal_flag']:
            return "Urgent"
        if clinical_screening['gad7']['risk_level'] == 'Severe' or clinical_screening['phq9']['risk_level'] == 'Severe':
            return "Escalate"
        if clinical_screening['phq9']['risk_level'] in ['Moderate', 'Moderately Severe']:
            return "Escalate"
        return "Routine"
    
    def _calculate_overall_risk(self, clinical_screening: Dict, crisis_indicators: Dict) -> str:
        """Determine overall risk level"""
        if crisis_indicators['suicide_ideation_flag'] or crisis_indicators['severe_withdrawal_flag']:
            return "Urgent"
        
        phq_level = clinical_screening['phq9']['risk_level']
        gad_level = clinical_screening['gad7']['risk_level']
        
        if phq_level == 'Severe' or gad_level == 'Severe':
            return "High"
        if phq_level in ['Moderate', 'Moderately Severe'] or gad_level in ['Moderate', 'Severe']:
            return "Moderate"
        
        return "Low"
    
    def _generate_recommendations(self, clinical_screening: Dict, behavioral_patterns: Dict, crisis_indicators: Dict) -> List[Dict]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Crisis protocol
        if crisis_indicators['suicide_ideation_flag']:
            recommendations.append({
                'action': 'Immediate crisis protocol',
                'urgency': 'Critical',
                'description': 'Initiate safety assessment and crisis intervention protocol'
            })
        
        # Depression intervention
        if clinical_screening['phq9']['score'] > 15:
            recommendations.append({
                'action': 'Depression screening follow-up',
                'urgency': 'High',
                'description': 'Conduct formal PHQ-9 assessment and consider treatment referral'
            })
        
        # Anxiety intervention
        if clinical_screening['gad7']['score'] > 15:
            recommendations.append({
                'action': 'Anxiety management consultation',
                'urgency': 'High',
                'description': 'Explore coping strategies and relaxation techniques; consider referral for cognitive-behavioral therapy'
            })
        
        # Sleep disruption
        if behavioral_patterns['somatic_indicators'].get('sleep_patterns'):
            recommendations.append({
                'action': 'Sleep hygiene assessment',
                'urgency': 'Moderate',
                'description': 'Discuss sleep patterns and provide sleep hygiene recommendations'
            })
        
        # Engagement decline
        if behavioral_patterns['engagement_trends']['direction'] == 'declining':
            recommendations.append({
                'action': 'Proactive outreach',
                'urgency': 'Moderate',
                'description': 'Schedule a check-in to understand engagement changes and provide support'
            })
        
        # Social isolation
        if crisis_indicators['social_isolation_flag']:
            recommendations.append({
                'action': 'Social connection support',
                'urgency': 'Moderate',
                'description': 'Discuss peer support groups or community resources'
            })
        
        return recommendations


# =============================================================================
# EXAMPLE USAGE (for testing)
# =============================================================================

if __name__ == "__main__":
    # Example student data
    example_chats = [
        {
            'message_type': 'student',
            'message_content': 'I am feeling overwhelmed with my coursework',
            'timestamp': '2026-07-01T23:30:00'
        },
        {
            'message_type': 'ai',
            'message_content': 'That sounds tough. Tell me more about what is overwhelming you.',
            'timestamp': '2026-07-01T23:31:00'
        }
    ]
    
    example_multimodal = {
        'speech_rate': 145,
        'vocal_pitch_variability': 35,
        'sleep_duration_hours': 5.5,
        'late_night_activity': True
    }
    
    example_wellness = {
        'mood_state': 'Fluctuating',
        'mood_stability_score': 45,
        'overall_stress_level': 'High',
        'cognitive_burnout_score': 75,
        'emotional_fatigue_score': 60,
        'social_stress_score': 40,
        'academic_pressure_score': 80
    }
    
    engine = PrivacyPreservingReportEngine()
    report = engine.generate_counselor_report(
        'STU001',
        example_chats,
        example_multimodal,
        example_wellness
    )
    
    print(json.dumps(report, indent=2))
