# ♟️ Cờ Tướng P2P Siêu Tốc (Xiangqi Serverless & GitHub Pages)

> Web game Cờ Tướng chơi trực tuyến theo mã phòng với kết nối **WebRTC Peer-to-Peer trực tiếp siêu tốc**, hoạt động **100% Serverless (không cần máy chủ backend)**, được tối ưu hoàn chỉnh để **deploy tự động lên GitHub Pages mà không cần cài đặt Node.js hay npm trên máy cá nhân**.

---

## 🌟 Điểm nổi bật

- ⚡ **WebRTC P2P Trực Tiếp (0 Server Hops)**: Gói tin nước đi, mũi tên chiến thuật truyền thẳng giữa 2 trình duyệt qua giao thức UDP/SCTP, đạt độ trễ vật lý cực thấp (**Ping chỉ từ 1ms – 15ms**).
- ☁️ **100% Serverless & Miễn Phí**: Sử dụng hạ tầng Signaling đám mây công cộng PeerJS (`0.peerjs.com`) kết hợp cụm máy chủ STUN của Google (`stun.l.google.com:19302`). Không tốn chi phí thuê máy chủ/VPS.
- 🚀 **Deploy 1-Click lên GitHub Pages bằng GitHub Actions**: Không cần cài Node.js, không cần build thủ công vào thư mục `docs/`. Toàn bộ quá trình build Vite được thực hiện tự động trên đám mây của GitHub.
- 📱 **Tối ưu chuẩn Mobile Gaming (như ZingPlay / Chess.com)**:
  - Quân cờ to rõ (48px, chiếm 89% ô cờ), chữ Hán thư pháp nét đậm kèm phụ đề tiếng Việt dễ đọc.
  - Vùng chạm cảm ứng vô hình mở rộng, phản hồi rung xúc giác (Haptic) khi đi cờ.
  - Bàn cờ phóng to hết cỡ trên màn hình điện thoại, thẻ người chơi và đồng hồ đếm ngược bố trí công thái học ở đỉnh và đáy bàn cờ.
- 🎯 **Tương tác chiến thuật Co-op thời gian thực**:
  - **Vẽ mũi tên chiến thuật (Tactical Arrows)**: Nhấp giữ chuột phải và kéo trên bàn cờ để chỉ điểm đường công - thủ, hiển thị tức thì cho bạn bè.
  - **Chỉ điểm chiến thuật (Tactical Pings)**: Bấm chuột phải hoặc nút thanh công cụ để phát tín hiệu xung kích: 🎯 *Tấn công*, 🛡️ *Phòng thủ*, ⚠️ *Nguy hiểm*, 💡 *Gợi ý*.
  - **Biên bản ván đấu & Chat**: Hỗ trợ ghi lại biên bản cờ tướng Việt Nam chuẩn xác (*P2-5*, *M8.7*, *X1.1*, *T3/5*,...) và chat nhanh kèm âm thanh.
- 🏆 **Đầy đủ luật Cờ Tướng quốc tế**: Lộ mặt tướng, Tướng & Sĩ trong Cung, cản chân mã, cản mắt tượng, ngòi pháo, tốt qua sông, chiếu tướng (hào quang đỏ), chiếu bí, xin đi lại, cầu hòa, xin thua.
- 🔊 **Âm thanh chân thực qua Web Audio API**: Tự tổng hợp âm thanh tiếng cờ gỗ gõ đanh thép, tiếng ăn quân, chuông báo chiếu tướng mà không cần tải file MP3 ngoài.

---

## 🚀 Hướng Dẫn Deploy Lên GitHub Pages (Không Cần Cài Node.js/NPM)

Nhờ file workflow CI/CD đã cấu hình sẵn tại `.github/workflows/deploy.yml`, bạn **hoàn toàn không cần cài đặt Node.js hay chạy lệnh build trên máy cá nhân**.

### Bước 1: Đẩy mã nguồn lên GitHub Repository

1. Tạo một repository mới trên tài khoản GitHub của bạn (ví dụ đặt tên là `co-tuong-p2p`, chọn chế độ **Public**).
2. Mở terminal/Git Bash tại thư mục dự án và chạy các lệnh sau:
   ```bash
   git init
   git add .
   git commit -m "Khoi tao web game Co Tuong P2P"
   git branch -M main
   git remote add origin https://github.com/<USERNAME>/<TEN-REPO>.git
   git push -u origin main
   ```
   *(Thay `<USERNAME>` và `<TEN-REPO>` bằng thông tin tài khoản và tên repository của bạn)*

### Bước 2: Bật chế độ GitHub Actions trên GitHub Pages

1. Trên trình duyệt, truy cập vào repository GitHub vừa tạo.
2. Bấm vào tab **Settings** (ở thanh menu phía trên).
3. Ở menu bên trái, tìm và bấm chọn mục **Pages** (mục nằm trong phần *Code and automation*).
4. Tại mục **Build and deployment**:
   - Ở phần **Source**: Bấm vào menu thả xuống và chuyển từ *"Deploy from a branch"* thành **`GitHub Actions`**.
5. **Xong!** GitHub sẽ tự động khởi chạy máy ảo Ubuntu, cài đặt thư viện, build Vite và xuất bản web.
6. Sau khoảng 1-2 phút, đường link web của bạn sẽ xuất hiện ngay đầu trang Pages:
   ```
   https://<USERNAME>.github.io/<TEN-REPO>/
   ```

---

## 💡 So Sánh: Cách Mới (GitHub Actions) vs Cách Cũ (Build vào `docs/`)

| Tiêu chí | ❌ Cách cũ (Build tay vào `docs/`) | ✅ Cách mới (GitHub Actions tự động) |
| :--- | :--- | :--- |
| **Cài đặt môi trường** | Bắt buộc phải cài Node.js, npm, git trên máy cá nhân | **Không cần cài bất kỳ phần mềm nào**, sửa code trực tiếp trên web GitHub cũng tự build được |
| **Dung lượng Repository** | Bị "rác" và phình to nặng nề vì phải commit hàng trăm file `.js`, `.css` đã bundle/minify | **Repository sạch 100%**: Chỉ chứa mã nguồn gốc (`src/`, `package.json`), thư mục `dist/` được loại bỏ an toàn qua `.gitignore` |
| **Quy trình cập nhật** | Phải gõ `npm run build` trước mỗi lần commit, nếu quên thì web sẽ không cập nhật code mới | **Tự động 100%**: Bất cứ khi nào bạn push code lên `main`, GitHub tự kích hoạt runner để build và cập nhật trang web |
| **Kiểm tra trạng thái** | Không có thông báo lỗi nếu code có cú pháp sai | Bấm vào tab **Actions** trên GitHub xem được chi tiết từng bước build và thông báo lỗi rõ ràng |

---

## 🎮 Hướng Dẫn Chơi Cờ Tướng Theo Mã Phòng

### 1. Tạo phòng & Mời bạn bè
1. Truy cập vào trang web game của bạn.
2. Bấm nút **"Khởi Tạo Phòng & Chờ Bạn"**.
3. Bạn sẽ nhận được một **Mã phòng** 6 ký tự (VD: `XQ8899`).
4. Bấm **"Chép link"** và gửi cho bạn bè qua Zalo, Messenger, Telegram... (Link có dạng `https://.../?room=XQ8899`).

### 2. Vào phòng
- **Cách 1**: Người bạn chỉ cần nhấp trực tiếp vào đường link được gửi.
- **Cách 2**: Người bạn mở web, chọn tab **"Vào Bằng Mã"**, nhập mã phòng hoặc dán toàn bộ đường link rồi bấm **"Tham Gia Phòng Ngay"**.
- Hệ thống sẽ tự động chỉ định:
  - Người tạo phòng: **Cầm quân ĐỎ (Đi trước)**.
  - Người vào phòng: **Cầm quân ĐEN (Đi sau, bàn cờ tự động đảo chiều thuận mắt)**.

### 3. Các chế độ chơi có sẵn
- ⚔️ **1v1 Đối Kháng P2P**: Trực tiếp 2 kỳ thủ đối đầu, hỗ trợ đồng hồ đếm ngược (3 phút chớp, 5 phút, 10 phút hoặc không giới hạn).
- 🤝 **Co-op Đánh Cặp vs Máy (AI)**: Hai người chơi hợp sức cùng phe điều khiển quân Đỏ để đánh bại thuật toán AI cờ tướng MiniMax Alpha-Beta.
- 🧭 **Bàn Cờ Phân Tích Co-op**: Cả hai cùng điều khiển tự do để nghiên cứu các thế cờ thế, khai cuộc hoặc cờ tàn.
- 🤖 **Luyện Tập Đấu Với Máy (Offline)**: Đánh đơn với máy tính thuật toán minimax có xét điểm vị trí quân cờ.
- 👥 **2 Người 1 Máy (Pass & Play)**: Chơi luân phiên trên cùng một màn hình điện thoại hoặc máy tính.

---

## 🏗️ Cấu Trúc Mã Nguồn Dự Án

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # Workflow CI/CD tự động deploy lên GitHub Pages
├── src/
│   ├── components/
│   │   ├── Board.tsx           # Bàn cờ SVG công thái học, quân gỗ 48px, chạm cảm ứng
│   │   ├── GameSidebar.tsx     # Bảng thông tin ván đấu, biên bản, đồng hồ, chat
│   │   ├── PingMonitor.tsx     # HUD đo lường độ trễ Ping/RTT, Jitter thời gian thực
│   │   └── RoomModal.tsx       # Modal tạo/nhập mã phòng và chọn chế độ chơi
│   ├── types/
│   │   └── xiangqi.ts          # Định nghĩa kiểu dữ liệu quân cờ, nước đi, P2P packet
│   ├── utils/
│   │   ├── p2pConnection.ts    # Bộ điều phối WebRTC DataChannel + PeerJS serverless
│   │   └── xiangqiEngine.ts    # Logic luật cờ tướng, kiểm tra chiếu tướng, AI MiniMax, âm thanh
│   ├── App.tsx                 # Giao diện chính kết hợp bố cục Mobile Gaming
│   ├── index.css               # Cấu hình Tailwind CSS
│   └── main.tsx                # Entry point React
├── index.html                  # HTML entry point, font chữ thư pháp Ma Shan Zheng
├── package.json                # Danh sách thư viện phụ thuộc
├── tsconfig.json               # Cấu hình TypeScript
└── vite.config.ts              # Cấu hình Vite với base: './' cho GitHub Pages
```

---

## 💻 Chạy Thử Ở Môi Trường Local (Tùy Chọn Dành Cho Lập Trình Viên)

Nếu bạn muốn chạy thử nghiệm hoặc chỉnh sửa code trên máy cá nhân:

```bash
# 1. Cài đặt các dependencies
npm install

# 2. Khởi chạy dev server (chạy tại http://localhost:3000)
npm run dev

# 3. Kiểm tra kiểm thử TypeScript
npm run lint

# 4. Build thử gói tĩnh ra thư mục dist/
npm run build
```

---

## 📜 Giấy Phép & Bản Quyền

Dự án phát hành dưới giấy phép mã nguồn mở tự do. Mọi kỳ thủ và lập trình viên đều có thể tự do clone, fork, tùy biến giao diện và chia sẻ cho cộng đồng người yêu cờ tướng Việt Nam!
