import asyncio
import random

class HumanBehavior:

    @staticmethod
    async def random_delay(min_sec=45, max_sec=180):
        delay = random.uniform(min_sec, max_sec)
        await asyncio.sleep(delay)
        return delay

    @staticmethod
    async def short_delay(min_sec=2, max_sec=8):
        await asyncio.sleep(random.uniform(min_sec, max_sec))

    @staticmethod
    async def type_like_human(page, selector: str, text: str):
        await page.click(selector)
        await asyncio.sleep(random.uniform(0.3, 0.8))
        for char in text:
            await page.type(selector, char, delay=random.randint(60, 200))
            if random.random() < 0.04:
                await asyncio.sleep(random.uniform(0.4, 1.5))

    @staticmethod
    async def scroll_human(page, scroll_count: int = None):
        if scroll_count is None:
            scroll_count = random.randint(3, 8)
        for _ in range(scroll_count):
            await page.mouse.wheel(0, random.randint(200, 600))
            await asyncio.sleep(random.uniform(0.5, 2.5))

    @staticmethod
    async def random_hover(page):
        try:
            vp = page.viewport_size
            await page.mouse.move(
                random.randint(100, vp['width'] - 100),
                random.randint(100, vp['height'] - 100)
            )
            await asyncio.sleep(random.uniform(0.2, 1.0))
        except Exception:
            pass
