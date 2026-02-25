# Status Tuyet — Xem trạng thái project

Xem trạng thái hiện tại của project Tuyet và tóm tắt những gì đã làm.

```bash
python "C:\Users\caong\OneBrive\Máy tính\Hà\Claude\Bài tập\Dobby\orchestrator_v6.py" status --project tuyet
```

## Cách dùng

```
/status
```

Output sẽ hiện:
- Phase hiện tại, số fix cycles đã chạy
- Budget đã dùng trong session
- Danh sách quality gates đã pass
- Nội dung PROJECT_STATUS.md (tóm tắt trạng thái, quyết định, files stable)
- TIER2_DECISIONS.md (quyết định tự động gần đây của orchestrator)

## Dùng khi nào
- Trước khi bắt đầu session mới — để biết đang ở đâu
- Sau khi evolve/hotfix xong — để confirm kết quả
- Khi muốn xem orchestrator đã tự quyết gì trong lúc chạy
