# OTTv2 — PlayHTML multiplayer

Game Oẳn tù tì v2 trên bàn cờ 9×9, chạy bằng Vanilla HTML/CSS/JS + PlayHTML.

## Luật đã triển khai

- Mỗi người: 3 Đấm, 3 Lá, 3 Kéo.
- P1 bắt đầu ở góc a1; P2 ở góc i9.
- Mỗi lượt đi đúng 1 ô theo 8 hướng như quân Vua.
- Đấm ăn Kéo.
- Kéo ăn Lá.
- Lá ăn Đấm.
- Hai quân cùng loại không ăn nhau và chặn đường nhau.
- Quân thua thế không thể đi vào ô đang có quân khắc chế.
- P1 thắng nếu một quân của P1 tới i9.
- P2 thắng nếu một quân của P2 tới a1.
- Hoặc một bên làm đối phương mất sạch một loại quân.

## Chạy local

Không cần Node.js. Có thể dùng VS Code Live Server hoặc bất kỳ static server nào.

Ví dụ với Python:

```bash
python -m http.server 8000
```

Sau đó mở:

http://localhost:8000/?room=TEST01

Mở URL đó ở cửa sổ ẩn danh/trình duyệt khác để thử 2 người.

## Deploy GitHub Pages

1. Tạo repository mới trên GitHub, ví dụ `ottv2`.
2. Upload `index.html`, `style.css`, `game.js`, `README.md`.
3. Vào `Settings` → `Pages`.
4. Chọn `Deploy from a branch`.
5. Chọn branch `main`, folder `/ (root)`.
6. Save và chờ GitHub Pages publish.
7. Mở URL Pages, ví dụ:
   `https://USERNAME.github.io/ottv2/`

### Chia phòng

URL có dạng:

`https://USERNAME.github.io/ottv2/?room=ABC123`

Hai người chỉ cần mở cùng URL để vào cùng trận.

Nút `Copy link` trong game sẽ sao chép URL phòng.

## Ghi chú về PlayHTML

Game dùng page-level shared data:

- `ottv2-room`: giữ 2 slot người chơi.
- `ottv2-game`: giữ trạng thái bàn cờ, lượt và người thắng.

PlayHTML mặc định cung cấp hạ tầng realtime/persistence, nên GitHub Pages chỉ cần phục vụ các file tĩnh; không cần chạy Node.js server riêng.

PlayHTML hiện đang ở beta. Dữ liệu phòng hiện được lưu qua hạ tầng PartyKit của dự án và không được mã hóa; ai biết room name có thể truy cập dữ liệu phòng. Không dùng triển khai này cho dữ liệu nhạy cảm.

## Lưu ý

Việc "xác nhận lượt đi" hiện nằm ở client. Đây phù hợp cho bài tập/demo multiplayer, nhưng chưa phải kiến trúc chống gian lận cấp production. Nếu cần, có thể chuyển logic xác thực nước đi sang một PartyKit worker riêng.
