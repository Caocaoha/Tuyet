# Hotfix Tuyet — Fix lỗi production

Chạy Dobby hotfix mode cho project Tuyet. Dùng khi app đã deploy mà gặp lỗi.

```bash
python "C:\Users\caong\OneDrive\Máy tính\Hà\Claude\Bài tập\Dobby\orchestrator_v6.py" hotfix --project tuyet --issue "$ARGUMENTS"
```

## Cách dùng

```
/hotfix iPhone không xin quyền microphone khi bấm Record
/hotfix Footer nav không hiển thị đúng trên màn hình nhỏ
/hotfix Offline queue không sync khi mạng được restore
/hotfix Bridge trả về 404 trên endpoint /notes
```

## Lưu ý
- Chỉ touch đúng files cần fix — không refactor code xung quanh
- Orchestrator tự chạy: Analyzer → Developer patch → Tester verify
- Kết quả lưu tại: `Dobby\projects\tuyet\hotfixes\`
- Nếu lỗi lặp lại lần 3 cùng loại → orchestrator sẽ hỏi bạn
