import asyncio
import hashlib
from datetime import datetime
from .playwright_queue import playwright_queue
from .action_counter import ActionCounter
from .human_behavior import HumanBehavior

def _stable_hash(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8', errors='replace')).hexdigest()[:16]

behavior = HumanBehavior()

class FacebookScanner:

    def __init__(self, org_id: str):
        self.org_id = org_id

    async def scan_group(self, group_url: str, keywords: list[str], max_posts: int = 20) -> list[dict]:
        async def _scan(page, context, args):
            await page.goto(args['group_url'], wait_until='networkidle', timeout=30000)
            await behavior.short_delay(3, 6)

            if 'login' in page.url or 'checkpoint' in page.url:
                return [{'error': 'session_expired', 'platform': 'facebook'}]

            await behavior.scroll_human(page, 5)

            posts = await page.evaluate('''() => {
                const results = [];
                const els = document.querySelectorAll(
                    '[data-ad-preview="message"], [data-testid="post_message"], .x1iorvi4'
                );
                els.forEach((el, i) => {
                    if (i >= 20) return;
                    const text = el.innerText || '';
                    const p = el.closest('[data-pagelet], [role="article"]') || el.parentElement?.parentElement;
                    const link = p?.querySelector('a[href*="/groups/"][href*="?id="], a[href*="story_fbid"]')?.href || '';
                    const author = p?.querySelector('[data-hovercard], .x1heor9g')?.innerText || 'Inconnu';
                    if (text.length > 20) results.push({ text, link, author });
                });
                return results.slice(0, 20);
            }''')

            signals = []
            for post in posts:
                text_lower = post['text'].lower()
                matched = [kw for kw in args['keywords'] if kw.lower() in text_lower]
                if matched:
                    signals.append({
                        'source': 'facebook_group',
                        'group_url': args['group_url'],
                        'text': post['text'][:500],
                        'author': post['author'],
                        'post_url': post['link'],
                        'matched_keywords': matched,
                        'intent_score': min(100, len(matched) * 25 + 25),
                        'dedup_key': f"fb_group_{_stable_hash(post['link'] or post['text'][:100] + post['author'])}",
                        'detected_at': datetime.utcnow().isoformat(),
                        'org_id': self.org_id
                    })
            return signals

        return await playwright_queue.submit(
            self.org_id, 'facebook', _scan,
            args={'group_url': group_url, 'keywords': keywords},
            timeout=90.0
        )

    async def post_comment(self, post_url: str, comment_text: str) -> dict:
        if not ActionCounter.can_act(self.org_id, 'facebook_comment'):
            return {
                'success': False,
                'reason': 'daily_limit_reached',
                'resets_tomorrow': True,
                'counts': ActionCounter.get_counts(self.org_id)
            }

        async def _comment(page, context, args):
            await page.goto(args['post_url'], wait_until='networkidle', timeout=30000)
            await behavior.scroll_human(page, 3)
            await behavior.random_delay(10, 30)

            selectors = [
                '[data-testid="comment_composer_input"]',
                '[aria-label*="ommentaire"]',
                '[aria-label*="omment"]',
                '.notranslate[role="textbox"]',
            ]
            comment_box = None
            found_selector = None
            for sel in selectors:
                try:
                    comment_box = await page.wait_for_selector(sel, timeout=5000)
                    if comment_box:
                        found_selector = sel
                        break
                except Exception:
                    continue

            if not comment_box or not found_selector:
                return {'success': False, 'reason': 'comment_box_not_found'}

            await behavior.type_like_human(page, found_selector, args['text'])
            await behavior.short_delay(1, 3)
            await page.keyboard.press('Enter')
            await behavior.short_delay(3, 5)
            return {'success': True}

        result = await playwright_queue.submit(
            self.org_id, 'facebook', _comment,
            args={'post_url': post_url, 'text': comment_text},
            timeout=90.0
        )

        if result.get('success'):
            ActionCounter.increment(self.org_id, 'facebook_comment')

        return result

    async def send_dm(self, profile_url: str, message: str) -> dict:
        if not ActionCounter.can_act(self.org_id, 'facebook_dm'):
            return {'success': False, 'reason': 'daily_limit_reached'}

        async def _dm(page, context, args):
            await page.goto(args['profile_url'], wait_until='networkidle', timeout=30000)
            await behavior.short_delay(2, 5)

            msg_btn = await page.query_selector(
                '[data-testid="send_message_link"], a[href*="messenger.com/t/"]'
            )
            if not msg_btn:
                return {'success': False, 'reason': 'message_button_not_found'}

            await msg_btn.click()
            await behavior.short_delay(3, 6)

            editor = await page.wait_for_selector(
                '[aria-label*="essage"][contenteditable], [data-testid="mwthreadlist-composer"] [contenteditable]',
                timeout=15000
            )
            if not editor:
                return {'success': False, 'reason': 'editor_not_found'}

            await behavior.type_like_human(page, '[contenteditable]', args['message'])
            await behavior.short_delay(1, 2)
            await page.keyboard.press('Enter')
            return {'success': True}

        result = await playwright_queue.submit(
            self.org_id, 'facebook', _dm,
            args={'profile_url': profile_url, 'message': message},
            timeout=90.0
        )

        if result.get('success'):
            ActionCounter.increment(self.org_id, 'facebook_dm')

        return result
