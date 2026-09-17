# Măm

Măm là PWA theo dõi calories, hoạt động local-first và có thể chạy offline. Dữ liệu hồ sơ và nhật ký được lưu trên thiết bị bằng IndexedDB.

Ở lần mở đầu tiên, Măm yêu cầu tên hiển thị và mã mở khóa 6 chữ số. Những lần sau phải nhập đúng mã để mở ứng dụng; mã không được lưu dạng văn bản mà được lưu dưới dạng hash trong bộ nhớ cục bộ của thiết bị.

Đây là cơ chế khóa riêng tư cho thiết bị, không phải hệ thống tài khoản đồng bộ giữa nhiều thiết bị. GitHub Pages chỉ chạy frontend tĩnh, vì vậy nếu cần đăng nhập email/OAuth, khôi phục tài khoản hoặc đồng bộ dữ liệu thật, cần tích hợp thêm backend xác thực như Supabase Auth + database.

## Phát triển cục bộ

```bash
npm install
npm run dev
```

Các lệnh kiểm tra chính:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke:pages
```

## Deploy GitHub Pages

Workflow tại `.github/workflows/deploy.yml` sẽ tự động chạy khi push lên nhánh `main` hoặc khi được chạy thủ công. Workflow thực hiện lint, typecheck, test, build, kiểm tra artifact Pages rồi deploy thư mục `dist` bằng GitHub Pages artifact.

Để bật deploy lần đầu:

1. Mở **Settings → Pages** trong repository GitHub.
2. Ở **Build and deployment → Source**, chọn **GitHub Actions**.
3. Push thay đổi lên `main`, hoặc chạy workflow **Deploy to GitHub Pages** trong tab **Actions**.

Vite đang dùng `base: './'`, nên ứng dụng và PWA có thể chạy đúng dưới subpath GitHub Pages của repository.

## Tích hợp Firebase từng bước

Codebase đã có sẵn Firebase SDK, cấu hình `.env.example`, Firestore repository và [firestore.rules](firestore.rules). Firebase chỉ được bật khi `VITE_FIREBASE_ENABLED=true`; nếu chưa bật, app tiếp tục dùng IndexedDB local.

### 1. Tạo Firebase project

1. Mở [Firebase Console](https://console.firebase.google.com/) và chọn **Add project**.
2. Đặt tên project, ví dụ `mam-web-prod`.
3. Google Analytics có thể tắt trong giai đoạn đầu để cấu hình đơn giản.
4. Vào **Project settings → Your apps → Web app**.
5. Đăng ký app với nickname `mam-web-pages` và copy Firebase configuration.

### 2. Bật đăng nhập

1. Vào **Authentication → Get started**.
2. Mở **Sign-in method**.
3. Bật **Email/Password**.
4. Trong **Settings → Authorized domains**, thêm domain GitHub Pages của bạn: `collide0412.github.io`.

### 3. Tạo Firestore

1. Vào **Firestore Database → Create database**.
2. Chọn region gần người dùng nhất. Region không thể đổi dễ dàng sau khi tạo.
3. Chọn production mode.
4. Mở **Rules**, dán nội dung từ [firestore.rules](firestore.rules), rồi bấm **Publish**.

Schema dữ liệu của Măm:

```text
users/{firebaseUid}
users/{firebaseUid}/meals/{mealId}
```

Rules chỉ cho phép người dùng đọc/ghi document có `{firebaseUid}` đúng bằng `request.auth.uid`.

### 4. Cấu hình local

Copy `.env.example` thành `.env.local`, rồi điền các giá trị trong Firebase Web App configuration:

```env
VITE_FIREBASE_ENABLED=true
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=mam-web-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mam-web-prod
VITE_FIREBASE_STORAGE_BUCKET=mam-web-prod.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Không commit `.env.local`. Các giá trị Firebase Web config không phải server secret, nhưng vẫn nên quản lý qua biến môi trường để tránh nhầm project.

### 5. Cấu hình GitHub Actions

Trong GitHub repository mở **Settings → Secrets and variables → Actions → New repository secret** và tạo 7 secrets với đúng tên:

`VITE_FIREBASE_ENABLED`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

Đặt `VITE_FIREBASE_ENABLED` là `true`. Workflow deploy đã truyền các secrets này vào bước Vite build.

### Tự động deploy Firestore Rules

Workflow [firestore-rules.yml](.github/workflows/firestore-rules.yml) sẽ tự deploy rules khi `firestore.rules` hoặc `firebase.json` thay đổi trên nhánh `main`. Có thể chạy thủ công bằng **Actions → Deploy Firestore Rules → Run workflow**.

Để cấp quyền cho workflow:

1. Vào **Firebase Console → Project settings → Service accounts**.
2. Chọn **Generate new private key** và tải file JSON về máy.
3. Trong GitHub vào **Settings → Secrets and variables → Actions → New repository secret**.
4. Đặt Name là `FIREBASE_SERVICE_ACCOUNT`.
5. Mở file JSON, copy toàn bộ nội dung vào Secret, rồi bấm **Add secret**.

File JSON này là credential nhạy cảm. Không commit vào repository, không đặt trong `.env.local`, và không dán vào chat. Workflow chỉ dùng secret này trên GitHub Actions để deploy rules.

### 6. Kiểm tra

```bash
npm install
npm run dev
```

Mở app ở địa chỉ Vite hiển thị, tạo một tài khoản test, rồi kiểm tra document trong Firestore. Sau khi push lên `main`, workflow Pages sẽ build với Firebase config và deploy frontend.

Các helper Firebase được tách ở [src/firebase.ts](src/firebase.ts), [src/firebaseAuth.ts](src/firebaseAuth.ts) và [src/firebaseStore.ts](src/firebaseStore.ts). Màn hình identity đã gọi `signIn`/`register`; profile và meal được lưu local trước rồi đồng bộ cloud.

### Offline sync

Măm lưu mọi thay đổi vào IndexedDB trước. Nếu Firebase không truy cập được, thay đổi được đưa vào object store `syncQueue` với khóa ổn định theo profile hoặc meal. Queue được retry khi app mở lại, khi browser chuyển sang online và mỗi 30 giây; ghi thành công sẽ xóa item khỏi queue. Vì thao tác dùng cùng document ID, retry không tạo bản ghi trùng.

## Công nghệ

- React + TypeScript + Vite
- IndexedDB với `idb`
- PWA với `vite-plugin-pwa`
- Vitest và Oxlint

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
