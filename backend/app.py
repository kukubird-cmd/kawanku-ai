#!/usr/bin/env python
"""
KawanKu AI - Local Run Entry Point
Starts Flask backend server
"""

import os
import sys
import requests
import json
from flask import request, jsonify

try:
    from dotenv import load_dotenv
    # Load from backend/.env first, then root .env
    load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '.env')))
    load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env')))
except ImportError:
    pass

# Ensure this directory is in the path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from run import init_db

# ---------------------------------------------------------
# 1. 建立我们安全的 Gemini API 代理路由
# ---------------------------------------------------------
def register_gemini_proxy(flask_app):
    @flask_app.route('/api/ai/gemini', methods=['POST'])
    def gemini_proxy():
        try:
            # 自动读取 .env 里的 API Key（确保你的 .env 文件里有 GEMINI_API_KEY=AQ.xxxx）
            gemini_key = os.getenv("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
            
            if not gemini_key:
                return jsonify({
                    "code": "missing_api_key",
                    "error": "Backend could not find GEMINI_API_KEY in environment or .env file."
                }), 503

            data = request.get_json()
            model = data.get('model', 'gemini-2.5-flash')
            payload = data.get('payload')

            if not payload:
                return jsonify({"error": "No payload provided"}), 400

            # 拼接 Google 官方的 API 接口，并带上你的 AQ. key
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": gemini_key
            }

            # 转发请求给谷歌
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                print(f"--- Gemini Proxy Request Error ({response.status_code}) ---", flush=True)
                print("Payload:", json.dumps(payload, indent=2), flush=True)
                print("Response:", response.text, flush=True)
                print("--------------------------------------------------", flush=True)
            
            # 把谷歌返回的数据和状态码原封不动传给你的 app.js
            return jsonify(response.json()), response.status_code

        except Exception as e:
            print("Gemini Proxy Error:", str(e))
            return jsonify({
                "code": "gemini_error",
                "error": f"Internal server proxy error: {str(e)}"
            }), 500


if __name__ == '__main__':
    app = create_app()
    
    # ---------------------------------------------------------
    # 2. 将 Gemini 代理绑定到刚刚创建的 Flask 实例上
    # ---------------------------------------------------------
    register_gemini_proxy(app)
    
    init_db(app)
    
    print("""
    +------------------------------------------------------------+
    |                    KawanKu AI Backend                      |
    |                                                            |
    |  Starting Flask server with Secure Gemini Proxy...        |
    |                                                            |
    |  API:     http://localhost:5000/api                        |
    |  Proxy:   http://localhost:5000/api/ai/gemini              |
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
        debug=True,
        use_reloader=True
    )