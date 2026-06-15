import asyncio
from src.db.session import AsyncSessionLocal
from src.models.replays import InvestigationReplay
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(InvestigationReplay))
        rows = result.scalars().all()
        print('Replay count:', len(rows))
        for r in rows:
            print('ID:', r.id, 'Name:', r.name)

asyncio.run(main())
