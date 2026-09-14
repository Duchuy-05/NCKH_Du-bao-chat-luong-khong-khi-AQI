# Thiết kế nền tối trung tính cho các page

## Mục tiêu

Đồng bộ giao diện chế độ tối của `Maps`, `HealthAlerts`, `Forecast` và `AboutUs`
theo hệ màu trung tính đang được dùng trên `Home`: nền trang vẫn tối, còn card,
panel, ô nhập liệu và điều khiển dùng các token `color-mix` dựa trên
`--bg-primary: #0A0A0D`, thay cho sắc xanh đậm `slate`.

## Phạm vi và nguyên tắc

- Chỉ chỉnh các màu nền/viền của ô, panel, card, điều khiển và vùng biểu đồ
  trong bốn page được yêu cầu.
- Giữ nguyên nền toàn trang, màu chữ, màu AQI, màu cảnh báo, màu icon và màu
  đường dữ liệu trên biểu đồ.
- Tái sử dụng các class/token đã có: `dark:surface-card`,
  `dark:surface-card-header` và `surface-border`.
- Dùng `var(--bg-card-header)` và `var(--border-color)` cho nền/viền Tooltip
  của Recharts để Tooltip không còn nền xanh đậm.
- Không thay đổi hành vi, dữ liệu, responsive layout hoặc chế độ sáng.

## Triển khai

1. Thay các cặp `bg-white dark:bg-slate-*` của card/panel bằng
   `bg-white dark:surface-card` và `surface-border` tương ứng.
2. Thay nền tối của ô phụ, input, chip và bộ điều khiển bằng
   `dark:surface-card` hoặc `dark:surface-card-header` tùy cấp độ tương phản.
3. Cập nhật nền và viền Tooltip/CartesianGrid ở `Forecast` bằng CSS variables;
   không đổi màu các series AQI, nhiệt độ và mưa.
4. Giữ các nền mang ý nghĩa ngữ nghĩa như đỏ cảnh báo, xanh thành công và
   nền AQI theo category.

## Kiểm chứng

- Chạy build/type-check hiện có của frontend.
- Rà soát bốn page để không còn các nền card tối `dark:bg-slate-*` thuộc phạm
  vi đã nêu.
- Xác nhận chỉ các file page liên quan và spec này thay đổi.
