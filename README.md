# Măm

Măm là nhật ký ăn uống dạng PWA, chạy trên GitHub Pages và lưu dữ liệu vào IndexedDB trước. Có thể bắt đầu bằng tên, không cần tài khoản hay mã khóa. Mã khóa sáu chữ số là tùy chọn; mã khóa cũ vẫn được giữ khi nâng cấp.

## Sử dụng

- Hôm nay: năng lượng, ba nhóm dinh dưỡng và các bữa đã ghi.
- Ghi món: tìm tiếng Việt có hoặc không dấu, chọn khẩu phần lẻ, bữa ăn, ngày, giờ và ghi chú.
- Tự nhập món: nhập đủ số dinh dưỡng từ nhãn hoặc nguồn bạn chọn khi món chưa có trong danh mục.
- Nhật ký: chọn ngày, sửa, xóa và hoàn tác xóa. Số liệu gắn với món đã ghi, không thay đổi theo danh mục sau này.
- Cá nhân: chỉnh tên/mục tiêu, xuất JSON và kết nối tài khoản. Sao chép nhật ký thiết bị vào tài khoản là lựa chọn rõ ràng, giữ lại bản gốc.

Danh mục tích hợp hiện có 15 món. Dinh dưỡng là ước tính chưa được xác minh; không có điểm tin cậy giả, giá suy từ calories, phiếu bầu giả hay tuyên bố gợi ý dinh dưỡng cá nhân.

## Chạy và kiểm tra

Đã kiểm tra bằng Node 24 trên Windows. Cần Node/npm trên PATH.

    npm ci
    npm run dev

    npm run typecheck
    npm run lint
    npm test
    npm run build
    npm run smoke:pages
    npm run preview:pages

Preview mặc định: http://127.0.0.1:4174/mam-web/. Có thể đổi cổng để tránh cache của một lần kiểm tra trước:

    npm run preview:pages -- 4176

Frontend dùng Vite base tương đối và HashRouter. Manifest, service worker và icon PNG 192/512 dùng đường dẫn tương đối. Khi kiểm tra một bản PWA mới, đóng các tab Măm cũ rồi mở lại; không xóa dữ liệu trang vì có thể mất nhật ký chưa đồng bộ.

## Firebase

Luôn đọc Firebase agent skill phù hợp trước khi sửa Firebase. Cài bộ skill bằng:

    npx skills add firebase/agent-skills --agent=codex

Dùng đúng project mam-app-877da và web app 1:837818293257:web:1d1c79247454655f6dacd8. Database hiện có là (default), Standard, FIRESTORE_NATIVE tại asia-northeast3.

Copy .env.example thành .env.local và điền Firebase Web App config. Chỉ bật cloud khi VITE_FIREBASE_ENABLED=true. Không commit .env.local hoặc server credentials. Firebase Web config được nhúng vào client; quyền dữ liệu được kiểm soát bằng Authentication và Firestore Rules.

SDK Firebase được tải khi dùng tài khoản. Nhật ký thiết bị không cần khởi động SDK. Dữ liệu cloud riêng theo hai đường dẫn:

    users/{firebaseUid}
    users/{firebaseUid}/meals/{mealId}

Rules mới đã được phát hành vào project trên ngày 2026-10-26. Owner phải khớp Firebase UID, create/update đều kiểm tra schema và giới hạn dữ liệu.

Đăng nhập dùng Email/Password và Google; cả hai provider đã bật. Người dùng đã bỏ đăng nhập SMS để giữ gói Spark. Phone đã tắt trong Firebase và luồng SMS được gỡ khỏi app.

- [Cấu hình provider của project](https://console.firebase.google.com/project/mam-app-877da/authentication/providers)
- [Hướng dẫn Google Sign-in](https://firebase.google.com/docs/auth/web/google-signin)

Domain collide0412.github.io và localhost đã được cho phép. Khi thử Google trên máy, dùng localhost thay cho 127.0.0.1; kiểm tra triển khai tại https://collide0412.github.io/mam-web/.

## Mô hình đồng bộ

IndexedDB schema 3 giữ dữ liệu v2 và chuyển meal sang khóa gồm owner + meal ID. Lưu cục bộ và ghi outbox trong cùng transaction; các tab cùng origin nhận thông báo thay đổi. Đọc màn hình không chờ Firebase.

Outbox chỉ gửi khi identity và Firebase UID khớp nhau. Lỗi của một mục không chặn các mục khác; xác nhận một revision cũ không xóa chỉnh sửa mới. Xóa dùng tombstone, nên refresh không làm món đã xóa tự xuất hiện trở lại.

Đồng bộ gửi thay đổi nền, thử lại khi có mạng và định kỳ cho outbox. Đọc lịch sử từ server khi mở tài khoản, trở lại app hoặc yêu cầu cập nhật; không đọc lại toàn bộ collection mỗi 30 giây. Giữa các thiết bị, lần ghi được server chấp nhận cuối cùng thắng. Đây không phải hệ thống hợp nhất lịch sử chỉnh sửa.

Nhật ký rất lớn cần phân trang hoặc truy vấn tăng dần trước khi mở rộng quy mô. Ngày hiển thị theo múi giờ thiết bị; di chuyển múi giờ có thể đổi ngày hiển thị của một thời điểm đã ghi.

## Emulator

Một terminal chạy Firebase Auth và Firestore emulator (cần Java 21):

    npx firebase-tools@latest emulators:start --only auth,firestore --project demo-mam-web

Terminal khác dùng biến môi trường cho kiểm tra, không sửa config production:

    $env:VITE_FIREBASE_USE_EMULATORS='true'
    $env:VITE_FIREBASE_PROJECT_ID='demo-mam-web'
    $env:VITE_FIREBASE_API_KEY='emulator-test-key'
    $env:VITE_DISABLE_REACT_DEVTOOLS='1'
    npm run dev -- --host 127.0.0.1 --port 5173

Smoke test chỉ chấp nhận demo project và đúng hai host emulator:

    $env:GCLOUD_PROJECT='demo-mam-web'
    $env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
    $env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
    npm run smoke:firebase

Bản production không bật emulator hay bỏ qua reCAPTCHA. Dev tools React chỉ được import trong chế độ phát triển.

## Triển khai và bằng chứng

Workflow .github/workflows/deploy.yml build và deploy GitHub Pages khi push main. Firebase config được cấp qua các repository secrets VITE_FIREBASE_*. Kết quả triển khai và kiểm tra thực tế được ghi tại QA_REPORT.md.

[ARCHITECTURE.md](ARCHITECTURE.md) mô tả hợp đồng dữ liệu và giới hạn. [DESIGN.md](DESIGN.md) mô tả hệ thống giao diện. [QA_REPORT.md](QA_REPORT.md) ghi chính xác kiểm tra đã chạy, kết quả và phần chưa được chứng minh. [PRIVACY.md](PRIVACY.md) mô tả dữ liệu được lưu và xử lý.
