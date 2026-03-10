"""
Routes Flask pour Social Layer v2.
A intégrer dans le fichier app.py existant sur le VPS.
"""
from datetime import datetime
from flask import Flask, request, jsonify

from auth.vps_auth import require_fmf_auth
from social.facebook_scanner import FacebookScanner
from social.linkedin_scanner import LinkedInScanner
from social.telegram_watcher import TelegramWatcher
from social.session_store import SessionStore
from social.action_counter import ActionCounter
from social.playwright_queue import playwright_queue
from official.bodacc_reader import BodaccReader
from official.sitadel_reader import SitadelReader
from official.france_travail_reader import FranceTravailReader
from web.google_alerts_reader import GoogleAlertsReader
from web.rss_reader import RssReader
import asyncio
import nest_asyncio
from dotenv import load_dotenv
load_dotenv('/root/.env')
nest_asyncio.apply()

_loop = asyncio.new_event_loop()
asyncio.set_event_loop(_loop)
playwright_queue.start(_loop)

def run_async(coro):
    return _loop.run_until_complete(coro)


def register_social_routes(app: Flask):
    """Enregistre toutes les routes sociales sur l'instance Flask existante."""

    # SESSIONS
    @app.route('/social/connect-session', methods=['POST'])
    @require_fmf_auth
    def connect_session():
        data = request.json
        org_id = data.get('orgId')
        platform = data.get('platform')
        cookies = data.get('cookies', [])
        token_data = data.get('tokenData', {})
        if not org_id or not platform:
            return jsonify({'error': 'orgId et platform requis'}), 400
        SessionStore.save_session(org_id, platform, cookies, token_data)
        return jsonify({'success': True, 'platform': platform})

    @app.route('/social/save-oauth-tokens', methods=['POST'])
    @require_fmf_auth
    def save_oauth_tokens():
        data = request.json
        SessionStore.save_oauth_tokens(
            data['orgId'], data['platform'],
            data['accessToken'],
            data.get('refreshToken'),
            data.get('expiresAt')
        )
        return jsonify({'success': True})

    @app.route('/social/sessions/<org_id>', methods=['GET'])
    @require_fmf_auth
    def list_sessions(org_id):
        platforms = SessionStore.list_sessions(org_id)
        return jsonify({'org_id': org_id, 'connected_platforms': platforms})

    @app.route('/social/disconnect-session', methods=['POST'])
    @require_fmf_auth
    def disconnect_session():
        data = request.json
        SessionStore.delete_session(data.get('orgId'), data.get('platform'))
        return jsonify({'success': True})

    # SCANS
    @app.route('/social/scan-facebook-group', methods=['POST'])
    @require_fmf_auth
    def scan_facebook_group():
        data = request.json
        scanner = FacebookScanner(data['orgId'])
        signals = run_async(scanner.scan_group(data['groupUrl'], data.get('keywords', [])))
        return jsonify({'signals': signals, 'count': len(signals) if isinstance(signals, list) else 0})

    @app.route('/social/scan-linkedin-feed', methods=['POST'])
    @require_fmf_auth
    def scan_linkedin_feed():
        data = request.json
        scanner = LinkedInScanner(data['orgId'])
        signals = run_async(scanner.scan_feed(data.get('keywords', [])))
        return jsonify({'signals': signals, 'count': len(signals) if isinstance(signals, list) else 0})

    @app.route('/social/scan-telegram', methods=['POST'])
    @require_fmf_auth
    def scan_telegram():
        data = request.json
        watcher = TelegramWatcher()
        signals = run_async(watcher.scan_group(
            data['groupUsername'], data.get('keywords', []), data.get('limit', 100)
        ))
        return jsonify({'signals': signals, 'count': len(signals) if isinstance(signals, list) else 0})

    @app.route('/social/scan-bodacc', methods=['POST'])
    @require_fmf_auth
    def scan_bodacc():
        data = request.json
        reader = BodaccReader()
        signals = run_async(reader.fetch_recent_creations(data.get('daysBack', 7), data.get('nafCodes')))
        return jsonify({'signals': signals, 'count': len(signals)})

    @app.route('/social/scan-sitadel', methods=['POST'])
    @require_fmf_auth
    def scan_sitadel():
        data = request.json
        reader = SitadelReader()
        signals = run_async(reader.fetch_permits(data.get('department', '69'), data.get('daysBack', 30)))
        return jsonify({'signals': signals, 'count': len(signals)})

    @app.route('/social/scan-france-travail', methods=['POST'])
    @require_fmf_auth
    def scan_france_travail():
        data = request.json
        reader = FranceTravailReader()
        signals = run_async(reader.fetch_offers(
            data.get('commune', '69123'), data.get('nafCodes'), data.get('daysBack', 7)
        ))
        return jsonify({'signals': signals, 'count': len(signals)})

    @app.route('/social/scan-google-alerts', methods=['POST'])
    @require_fmf_auth
    def scan_google_alerts():
        data = request.json
        signals = run_async(GoogleAlertsReader.fetch_alert(data['rssUrl'], data.get('daysBack', 1)))
        return jsonify({'signals': signals, 'count': len(signals)})

    @app.route('/social/scan-rss', methods=['POST'])
    @require_fmf_auth
    def scan_rss():
        data = request.json
        signals = run_async(RssReader.fetch_feed(
            data.get('sourceId', 'custom'), data.get('url'), data.get('daysBack', 3)
        ))
        return jsonify({'signals': signals, 'count': len(signals)})

    # ACTIONS
    @app.route('/social/comment', methods=['POST'])
    @require_fmf_auth
    def post_comment():
        data = request.json
        platform = data.get('platform', 'facebook')
        if platform == 'facebook':
            scanner = FacebookScanner(data['orgId'])
            result = run_async(scanner.post_comment(data['postUrl'], data['text']))
        elif platform == 'linkedin':
            scanner = LinkedInScanner(data['orgId'])
            result = run_async(scanner.post_comment(data['postUrl'], data['text']))
        else:
            return jsonify({'error': f'Platform {platform} non supportee'}), 400
        return jsonify(result)

    @app.route('/social/dm', methods=['POST'])
    @require_fmf_auth
    def send_dm():
        data = request.json
        platform = data.get('platform', 'facebook')
        if platform == 'facebook':
            scanner = FacebookScanner(data['orgId'])
            result = run_async(scanner.send_dm(data['profileUrl'], data['message']))
        elif platform == 'linkedin':
            scanner = LinkedInScanner(data['orgId'])
            result = run_async(scanner.send_message(data['profileUrl'], data['message']))
        elif platform == 'telegram':
            watcher = TelegramWatcher()
            success = run_async(watcher.send_dm(data['username'], data['message']))
            result = {'success': success}
        else:
            return jsonify({'error': f'Platform {platform} non supportee'}), 400
        return jsonify(result)

    @app.route('/social/action-counts/<org_id>', methods=['GET'])
    @require_fmf_auth
    def get_action_counts(org_id):
        return jsonify({'org_id': org_id, 'counts': ActionCounter.get_counts(org_id)})

    # HEALTH
    @app.route('/social/health', methods=['GET'])
    def social_health():
        return jsonify({
            'status': 'ok',
            'modules': [
                'facebook', 'linkedin', 'telegram',
                'bodacc', 'sitadel', 'france_travail',
                'google_alerts', 'rss'
            ],
            'playwright_queue_size': playwright_queue._queue.qsize() if hasattr(playwright_queue, '_queue') else 0,
            'timestamp': datetime.utcnow().isoformat()
        })
