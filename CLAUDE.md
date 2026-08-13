# vietart-site-scorecard

Ứng dụng Next.js chấm điểm mặt bằng (site scorecard) cho VietArt. Dữ liệu lấy từ Google Sheets, xuất báo cáo ra XLSX và PDF.

## Stack

Next.js (App Router, JavaScript — không phải TypeScript), Tailwind CSS, Recharts để vẽ biểu đồ, `googleapis` đọc Sheets, `xlsx` và `jspdf` + `jspdf-autotable` để xuất file.

```
app/page.js          giao diện chính
app/layout.js        layout gốc
app/api/sheets/      route đọc dữ liệu từ Google Sheets
app/api/debug/       route chẩn đoán, dùng khi auth lỗi
lib/sheets.js        lớp gọi Google Sheets API
lib/data.js          xử lý và biến đổi dữ liệu
```

## Chạy

`npm run dev` — không có script test hay lint trong `package.json`, nên kiểm chứng thay đổi bằng cách chạy thật và mở trang.

## Lưu ý

- Cần `.env.local` với credential Google; mẫu ở `.env.local.example`. Không commit file thật, không in nội dung ra.
- Xác thực Google là chỗ đã hỏng nhiều lần (xem lịch sử commit `Fix Google Auth`, `Fix auth + add debug`). Khi lỗi, dùng `app/api/debug/route.js` trước khi sửa mò.
- Dự án dùng JavaScript thuần, không thêm TypeScript trừ khi được yêu cầu.
