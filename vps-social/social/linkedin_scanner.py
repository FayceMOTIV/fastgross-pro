import asyncio
import hashlib
from datetime import datetime
from .playwright_queue import playwright_queue
from .action_counter import ActionCounter
from .human_behavior import HumanBehavior

def _stable_hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8', errors='replace')).hexdigest()[:16]

behavior = HumanBehavior()

class LinkedInScanner:

    def __init__(self, org_id: str):
        self.org_id = org_id

    async def scan_feed(self, keywords: list[str], max_posts: int = 15) -> list[dict]:

        async def _scan(page, context, args):
            await page.goto('https://www.linkedin.com/feed/', wait_until='networkidle', timeout=30000)
            await behavior.short_delay(3, 6)

            if 'login' in page.url or 'authwall' in page.url:
                return [{'error': 'session_expired', 'platform': 'linkedin'}]

            await behavior.scroll_human(page, 8)

            posts = await page.evaluate('''() => {
                const results = [];
                const items = document.querySelectorAll(
                    '.feed-shared-update-v2, [data-id*="urn:li:activity"]'
                );
                items.forEach((item, i) => {
                    if (i >= 15) return;
                    const text = (
                        item.querySelector('.feed-shared-text, .update-components-text')
                        ?.innerText || ''
                    );
                    const author = (
                        item.querySelector('.feed-shared-actor__name, .update-components-actor__name')
                        ?.innerText || ''
                    );
                    const postUrl = item.querySelector('a[href*="/posts/"], a[href*="activity"]')?.href || '';
                    const authorUrl = item.querySelector('a[href*="/in/"]')?.href || '';
                    if (text.length > 20) results.push({ text, author, postUrl, authorUrl });
                });
                return results;
            }''')

            signals = []
            for post in posts:
                text_lower = post['text'].lower()
                matched = [kw for kw in args['keywords'] if kw.lower() in text_lower]
                if matched:
                    signals.append({
                        'source': 'linkedin_feed',
                        'text': post['text'][:500],
                        'author': post['author'],
                        'post_url': post['postUrl'],
                        'author_url': post['authorUrl'],
                        'matched_keywords': matched,
                        'intent_score': min(100, len(matched) * 30 + 20),
                        'dedup_key': f"li_feed_{_stable_hash(post['text'][:100] + post['author'])}",
                        'detected_at': datetime.utcnow().isoformat(),
                        'org_id': self.org_id
                    })
            return signals

        return await playwright_queue.submit(
            self.org_id, 'linkedin', _scan,
            args={'keywords': keywords},
            timeout=90.0
        )

    async def post_comment(self, post_url: str, comment_text: str) -> dict:
        if not ActionCounter.can_act(self.org_id, 'linkedin_comment'):
            return {'success': False, 'reason': 'daily_limit_reached'}

        async def _comment(page, context, args):
            await page.goto(args['post_url'], wait_until='networkidle', timeout=30000)
            await behavior.scroll_human(page, 2)
            await behavior.random_delay(15, 45)

            btn = await page.query_selector(
                'button[aria-label*="omment"], .comment-button, [data-control-name="comment"]'
            )
            if btn:
                await btn.click()
                await behavior.short_delay(1, 3)

            editor = await page.wait_for_selector(
                '.comments-comment-box__editor [contenteditable], .editor-content [contenteditable]',
                timeout=10000
            )
            if not editor:
                return {'success': False, 'reason': 'editor_not_found'}

            await editor.click()
            for char in args['text']:
                await page.keyboard.type(char, delay=__import__('random').randint(60, 180))
            await behavior.short_delay(1, 2)

            submit = await page.query_selector(
                'button[type="submit"].comments-comment-box__submit-button, button.comments-comment-box__submit-button'
            )
            if submit:
                await submit.click()
                return {'success': True}
            return {'success': False, 'reason': 'submit_not_found'}

        result = await playwright_queue.submit(
            self.org_id, 'linkedin', _comment,
            args={'post_url': post_url, 'text': comment_text},
            timeout=90.0
        )
        if result.get('success'):
            ActionCounter.increment(self.org_id, 'linkedin_comment')
        return result

    async def send_message(self, profile_url: str, message: str) -> dict:
        if not ActionCounter.can_act(self.org_id, 'linkedin_dm'):
            return {'success': False, 'reason': 'daily_limit_reached'}

        async def _dm(page, context, args):
            await page.goto(args['profile_url'], wait_until='networkidle', timeout=30000)
            await behavior.short_delay(2, 5)

            btn = await page.query_selector(
                'button[aria-label*="essage"], .pvs-profile-actions__action[aria-label*="essage"]'
            )
            if not btn:
                return {'success': False, 'reason': 'message_button_not_found'}

            await btn.click()
            await behavior.short_delay(2, 4)

            editor = await page.wait_for_selector(
                '.msg-form__contenteditable [contenteditable]', timeout=10000
            )
            if not editor:
                return {'success': False, 'reason': 'editor_not_found'}

            await editor.click()
            for char in args['message']:
                await page.keyboard.type(char, delay=__import__('random').randint(60, 180))
            await behavior.short_delay(1, 2)
            await page.keyboard.press('Return')
            return {'success': True}

        result = await playwright_queue.submit(
            self.org_id, 'linkedin', _dm,
            args={'profile_url': profile_url, 'message': message},
            timeout=90.0
        )
        if result.get('success'):
            ActionCounter.increment(self.org_id, 'linkedin_dm')
        return result
