import os
import hmac
from functools import wraps
from flask import request, jsonify
from dotenv import load_dotenv

load_dotenv('/root/.env')

VPS_SECRET_KEY = os.environ.get('VPS_SECRET_KEY', '')

def require_fmf_auth(f):
    """Middleware : vérifie X-FMF-Secret sur toutes les routes sensibles."""
    @wraps(f)
    def decorated(*args, **kwargs):
        provided_secret = request.headers.get('X-FMF-Secret', '')
        if not VPS_SECRET_KEY:
            return jsonify({'error': 'VPS_SECRET_KEY non configuré'}), 500
        if not hmac.compare_digest(provided_secret, VPS_SECRET_KEY):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated
