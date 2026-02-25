# Tuyet App — Context cho Claude Code

PWA ghi âm → transcribe (AssemblyAI) → lưu note vào Obsidian.
Stack: Next.js 14 App Router + TypeScript + IndexedDB (Dexie) + Desktop Bridge (Express).

## Cấu trúc

```
TuyetApp/
├── app/                    ← Next.js App Router
│   ├── api/                ← API routes (transcribe, obsidian, auth, config)
│   ├── (pages)/            ← UI pages
│   └── layout.tsx
├── lib/
│   ├── audio/db.ts         ← IndexedDB schema (Dexie) — stable, không sửa schema
│   └── ...
├── middleware.ts            ← Cookie auth, PUBLIC_ROUTES whitelist
├── public/                 ← PWA icons, manifest
└── desktop-bridge/         ← Node.js Express server chạy local
    └── src/index.ts
```

## Env Variables quan trọng

```bash
# .env.local (Next.js)
APP_API_KEY=...             # cookie auth
BRIDGE_API_KEY=...          # gửi khi gọi Bridge, phải khớp với Bridge API_KEY
OBSIDIAN_BRIDGE_URL=...     # localhost:3001 (dev) hoặc ngrok URL (production)
OPENAI_API_KEY=...
ASSEMBLYAI_API_KEY=...

# desktop-bridge/.env
API_KEY=...                 # phải khớp với BRIDGE_API_KEY
PORT=3001
```

## Chạy local

```powershell
# Terminal 1 — Next.js app
npm run dev

# Terminal 2 — Desktop Bridge
cd desktop-bridge
npx tsx src/index.ts

# Terminal 3 — ngrok (nếu cần test từ iPhone)
ngrok http 3000
```

## Tính năng đã có

- **Ghi âm + Transcribe**: mic → AssemblyAI → transcript card trong `app/page.tsx`
- **Lưu vào Obsidian**: qua Desktop Bridge (`lib/obsidian/bridge.ts` → `saveNoteToObsidian`)
- **Offline queue**: ghi âm khi mất mạng, sync lại khi có mạng (`lib/hooks/useOfflineQueue.ts`)
- **Bookmark**: giữ lại transcript khỏi auto-delete 5 ngày (`bookmarkTranscript` trong `lib/audio/db.ts`)
- **Sync thủ công**: badge "⚠️ Chưa lưu" có nút "↑ Sync" để retry đẩy lên Obsidian (`app/page.tsx`)
- **Low-confidence review**: desktop-only panel để sửa đoạn transcript kém chính xác

## Lưu ý quan trọng

- `middleware.ts` PUBLIC_ROUTES phải include `/setup` và `/api/config/*`
- SDK init (OpenAI, AssemblyAI) PHẢI bên trong function, không ở module level
- Client fetch PHẢI có `credentials: 'include'` để gửi cookie
- Desktop Bridge dùng `tsx`, không dùng `ts-node`
- IndexedDB data đọc thẳng từ client — không qua API server

## Pipeline Dobby

Project được quản lý bởi Dobby orchestrator tại:
`C:\Users\caong\OneDrive\Máy tính\Hà\Claude\Bài tập\Dobby\`

Dùng slash commands trong Claude Code:
- `/evolve <mô tả tính năng>` — thêm tính năng mới
- `/hotfix <mô tả lỗi>` — fix lỗi production
- `/status` — xem trạng thái project

Project memory: `Dobby\projects\tuyet\memory\PROJECT_STATUS.md`
