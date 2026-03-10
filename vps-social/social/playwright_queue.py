"""
Worker unique Chromium, queue séquentielle.
Évite la saturation RAM : 1 instance x 250MB vs N instances x 250MB.
"""
import asyncio
import threading
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async
from .session_store import SessionStore
from .human_behavior import HumanBehavior

class PlaywrightQueue:
    """Singleton : un seul navigateur Chromium partagé, queue séquentielle."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._queue = asyncio.Queue()
        self._loop = None
        self._worker_task = None

    def start(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        loop.call_soon(self._schedule_worker)

    def _schedule_worker(self):
        self._worker_task = asyncio.ensure_future(self._worker(), loop=self._loop)

    async def _worker(self):
        while True:
            job, future = await self._queue.get()
            try:
                result = await self._execute_job(job)
                if not future.done():
                    future.set_result(result)
            except Exception as e:
                if not future.done():
                    future.set_exception(e)
            finally:
                self._queue.task_done()

    async def _execute_job(self, job: dict):
        org_id = job['org_id']
        platform = job['platform']
        action = job['action']
        args = job.get('args', {})

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1366,768',
                    '--disable-dev-shm-usage',
                ]
            )
            session_data = SessionStore.load_session(org_id, platform)
            ctx_options = {
                'viewport': {'width': 1366, 'height': 768},
                'user_agent': (
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/121.0.0.0 Safari/537.36'
                ),
                'locale': 'fr-FR',
                'timezone_id': 'Europe/Paris',
            }
            context = await browser.new_context(**ctx_options)
            if session_data and session_data.get('cookies'):
                await context.add_cookies(session_data['cookies'])
            page = await context.new_page()
            await stealth_async(page)

            try:
                result = await action(page, context, args)
                updated_cookies = await context.cookies()
                if updated_cookies:
                    SessionStore.save_session(org_id, platform, updated_cookies,
                                              session_data.get('token_data') if session_data else None)
                return result
            finally:
                await browser.close()

    async def submit(self, org_id: str, platform: str, action, args: dict = None,
                     timeout: float = 120.0):
        future = self._loop.create_future()
        await self._queue.put(({
            'org_id': org_id,
            'platform': platform,
            'action': action,
            'args': args or {}
        }, future))
        return await asyncio.wait_for(future, timeout=timeout)


playwright_queue = PlaywrightQueue()
