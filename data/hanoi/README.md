# Dữ liệu tham khảo Hà Nội

Ba CSV được giữ lại từ bộ dữ liệu của dự án để tham khảo và tiếp tục biên tập. Chúng không được app đọc, không được sao chép vào bản deploy và không phải nguồn đã xác minh cho các số liệu hiện có trong `src/data/catalog.ts`.

- `danh_sach_mon_an.csv`: danh sách món và mô tả.
- `chi_tiet_calo_thanh_phan.csv`: bảng ước tính thành phần, có ghi chú và đường dẫn tham khảo trong từng dòng.
- `food-catalog-curated.csv`: bảng món đã biên tập trước đây.

Cần kiểm tra nguồn, khẩu phần và tính nhất quán dinh dưỡng trước khi nhập vào danh mục của app. Việc giữ các đường dẫn nguồn không chứng nhận số liệu là chính xác.
