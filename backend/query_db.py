import asyncio
from sqlalchemy import select
from src.db.session import AsyncSessionLocal
from src.models.investigations import Investigation

async def main():
    async with AsyncSessionLocal() as s:
        res = await s.execute(select(Investigation).order_by(Investigation.started_at.desc()).limit(1))
        for i in res.scalars():
            print(f"ID: {i.id} | Status: {i.status} | Started: {i.started_at}")

if __name__ == "__main__":
    asyncio.run(main())
