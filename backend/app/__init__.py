"""
KawanKu AI - Flask Backend Application
Main application factory and configuration
"""

from flask import Flask, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

def create_app(config_name='development'):
    """Application factory"""
    if load_dotenv:
        backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
        root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
        load_dotenv(root_env)
        load_dotenv(backend_env, override=True)

    app = Flask(__name__, static_folder='../../', static_url_path='')
    
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    # =========================================================================
    # CONFIGURATION
    # =========================================================================
    
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///kawanku_ai.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-key')
    
    # CORS Configuration (allow student and counselor portals on any origin)
    CORS(app, resources={
        r"/api/*": {"origins": "*"}
    })
    
    # =========================================================================
    # DATABASE INITIALIZATION
    # =========================================================================
    
    from app.models import db
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
    
    # =========================================================================
    # REGISTER BLUEPRINTS (Routes)
    # =========================================================================
    
    from app.routes import auth_bp, student_bp, counselor_bp, ai_bp
    
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(counselor_bp, url_prefix='/api/counselor')

    # =========================================================================
    # ERROR HANDLERS
    # =========================================================================
    
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(401)
    def unauthorized(error):
        return {'error': 'Unauthorized'}, 401
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5005)
