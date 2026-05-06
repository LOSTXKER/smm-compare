# SMM Compare — Meelike

## Project
เครื่องมือ compare และ track performance ของ SMM panel providers — วิเคราะห์ cost-per-result, engagement rates ข้ามแพลตฟอร์ม

## Business
**Meelike** — ใช้ตัดสินใจเลือก provider

## Stack
- Framework: Next.js 16 (App Router), React 19, TypeScript
- Database: PostgreSQL (Supabase) + Prisma 7
- Auth: NextAuth v5
- AI: Google Gemini API
- Styling: Tailwind v4 + shadcn/ui
- Charts: Recharts

## How to Run
```bash
npm install
# set .env (Supabase + auth keys)
npm run dev    # localhost:3000
```

## Key Files
- `prisma/schema.prisma` — SMM metrics, provider data
- `app/src/middleware.ts` — Auth middleware

## Current Status
- 🌱 Early stage / template setup — status unclear
