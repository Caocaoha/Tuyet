# Tuyet App — Context cho Claude Code

PWA ghi âm → transcribe (AssemblyAI/Whisper/Soniox) → AI intelligence → lưu note vào Obsidian.
Stack: Next.js 14 App Router + TypeScript + IndexedDB (Dexie) + Desktop Bridge (Express) + Anthropic Claude API.

## Branch

- `master` — v1 production (stable)
- `v2/develop` — v2 development (knowledge assistant)

## Cấu trúc (v2)

```
TuyetApp/
├── app/
│   ├── api/
│   │   ├── auth/               ← login, logout
│   │   ├── config/             ← status, test-bridge, generate-key
│   │   ├── corrections/save/   ← lưu correction transcript
│   │   ├── intelligence/       ← auto-tag, report (Anthropic Claude)
│   │   ├── meeting/transcribe/ ← transcribe meeting audio
│   │   ├── obsidian/           ← note, import, meeting, search
│   │   ├── tasks/              ← task extraction
│   │   └── transcribe/         ← transcribe audio
│   ├── recording/              ← trang ghi âm
│   ├── reports/                ← trang báo cáo AI
│   ├── review/                 ← xem lại transcript
│   └── setup/                  ← cấu hình ban đầu
├── components/
│   ├── MicButton.tsx           ← nút ghi âm (dùng trong page.tsx)
│   └── TaskList.tsx            ← hiển thị tasks
├── lib/
│   ├── audio/db.ts             ← IndexedDB schema v2 (Dexie, per-username)
│   ├── types.ts                ← shared TypeScript types
│   ├── api-client.ts           ← client-side API calls
│   ├── bridge-client.ts        ← Desktop Bridge client
│   ├── recorder.ts             ← audio recorder utility
│   ├── hooks/
│   │   ├── useRecorder.ts      ← recording hook (v2-compatible)
│   │   └── useOfflineQueue.ts  ← stub (v2 xử lý offline khác)
│   ├── obsidian/bridge.ts      ← saveNoteToObsidian
│   ├── whisper/
│   │   ├── client.ts           ← transcribeAudio (dùng credentials: include)
│   │   └── whisper-client.ts   ← duplicate, cùng logic
│   └── tags/detector.ts        ← detectTags, removeTagCommands
├── middleware.ts               ← Cookie auth, PUBLIC_ROUTES whitelist
├── public/                     ← PWA icons, manifest
└── desktop-bridge/             ← Node.js Express server chạy local
    └── src/index.ts
```

## IndexedDB Schema (v2)

`TuyetDatabase` — per-username, database name: `tuyet-{username}`

- **v1**: `transcripts`, `audio`
- **v2**: thêm `tasks` table; thêm fields: `intelligenceApplied`, `autoTags`, `linkedNotes`, `transcriptionEngine`

Username lấy từ cookie `tuyet_user`. Luôn dùng `getDb(username)` — không có `db` export trực tiếp.

```ts
const db = await getDb(username);   // lấy db instance
await saveAudio(username, blob, mimeType, duration);
await saveTranscript(username, audioId, transcript, engine);
```

## Env Variables

```bash
# .env.local (Next.js)
APP_API_KEY=...             # cookie auth
BRIDGE_API_KEY=...          # gửi khi gọi Bridge, phải khớp với Bridge API_KEY
OBSIDIAN_BRIDGE_URL=...     # localhost:3001 (dev) hoặc ngrok URL (production)
OPENAI_API_KEY=...
ASSEMBLYAI_API_KEY=...
ANTHROPIC_API_KEY=...       # dùng cho intelligence/auto-tag và intelligence/report

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

## Tính năng v2

- **Ghi âm + Transcribe**: mic → API `/api/transcribe` → IndexedDB (`app/page.tsx` + `MicButton.tsx`)
- **AI Intelligence**: auto-tag + link notes qua Anthropic Claude (`app/api/intelligence/`)
- **Task extraction**: trích xuất task từ transcript (`app/api/tasks/`)
- **Report generation**: báo cáo AI từ transcript history (`app/reports/`)
- **Lưu vào Obsidian**: qua Desktop Bridge (`lib/obsidian/bridge.ts`)
- **Corrections**: sửa transcript kém chính xác (`app/api/corrections/save/`)
- **Xem lại**: review transcript history (`app/review/`)

## Lưu ý quan trọng

- `middleware.ts` PUBLIC_ROUTES phải include `/setup` và `/api/config/*`
- SDK init (OpenAI, AssemblyAI, Anthropic) PHẢI bên trong function, không ở module level
- Client fetch PHẢI có `credentials: 'include'` để gửi cookie — KHÔNG dùng `getAuthHeaders()`
- Desktop Bridge dùng `tsx`, không dùng `ts-node`
- IndexedDB đọc thẳng từ client — không qua API server
- `ZodError` dùng `.issues` (không phải `.errors`) — zod v4
- `lib/whisper/client.ts` và `whisper-client.ts` là duplicate — cùng logic

## Production Bug Fixes (round 1 — 2026-02-25)

### BUG-001: "User not authenticated" khi ghi âm
**Root cause:** Cookie `tuyet_user` có `httpOnly: true` → `document.cookie` không đọc được → `username` luôn `null`
**Fix:** Đổi thành `httpOnly: false` trong `app/api/auth/login/route.ts` — username không phải secret, bảo mật thực sự đến từ server-side middleware
**File:** `app/api/auth/login/route.ts`

### BUG-002: HTTP 502 "Cannot POST /tasks" từ Bridge
**Root cause:** `desktop-bridge/src/index.ts` không có `/tasks` route — Next.js gọi `POST ${bridgeUrl}/tasks` nhưng Bridge trả 404
**Fix:** Tạo `desktop-bridge/src/routes/tasks.ts` (scan vault cho `- [ ] tasks`) + đăng ký trong `index.ts`
**Files:** `desktop-bridge/src/routes/tasks.ts` (new), `desktop-bridge/src/index.ts`

### BUG-003: Không có nút Đăng xuất
**Root cause:** UI thiếu logout button — user bị kẹt khi auth fail, không có cách reset
**Fix:** Thêm button "Đăng xuất" vào header `app/page.tsx` — gọi `POST /api/auth/logout` rồi redirect `/setup`
**File:** `app/page.tsx`

## Deploy

- Platform: Vercel
- Production (v1): `master` branch → auto-deploy
- Preview (v2): branch `v2/develop` → deploy thủ công với `vercel --prod`
- Preview URL: https://tuyet-ashen.vercel.app

## Pipeline Dobby

Project được quản lý bởi Dobby orchestrator tại:
`C:\Users\caong\OneDrive\Máy tính\Hà\Claude\Bài tập\Dobby\`

Dùng slash commands trong Claude Code:
- `/evolve <mô tả tính năng>` — thêm tính năng mới
- `/hotfix <mô tả lỗi>` — fix lỗi production
- `/status` — xem trạng thái project

Project memory v2: `Dobby\projects\tuyet-v2\`
