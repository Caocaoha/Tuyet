# Evolve Tuyet — Thêm tính năng mới

Chạy Dobby evolve mode cho project Tuyet.

```bash
python "C:\Users\caong\OneDrive\Máy tính\Hà\Claude\Bài tập\Dobby\orchestrator_v6.py" evolve --project tuyet --feature "$ARGUMENTS"
```

## Cách dùng

```
/evolve Tái cấu trúc UI: footer navigation với 3 tab, nút record to ở giữa
/evolve Thêm voice command "Hết lưu lại" để dừng và save recording
/evolve Offline queue: tạm lưu recording khi mất kết nối, tự sync khi có mạng
```

## Lưu ý
- Orchestrator sẽ tự đánh giá scope: HOTFIX / NEW_PHASE / NEW_PROJECT
- Nếu scope là NEW_PROJECT → dừng lại, không phù hợp với v1.x
- Budget mỗi session: $15 — theo dõi trong output
- Sau khi xong, xem kết quả tại: `Dobby\projects\tuyet\memory\PROJECT_STATUS.md`
