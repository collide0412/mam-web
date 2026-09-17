# Măm

Măm là PWA theo dõi calories, hoạt động local-first và có thể chạy offline. Dữ liệu hồ sơ và nhật ký được lưu trên thiết bị bằng IndexedDB.

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
