# Thiết kế màu sắc thẻ (Card) ở chế độ tối

## Mục tiêu

Giúp các thẻ (card) và các khối hiển thị (panel) ở chế độ tối trông sáng hơn và bớt sắc xanh-đen, đồng thời vẫn giữ nguyên màu nền trang, độ tương phản văn bản hiện tại, màu sắc AQI, màu cảnh báo và các trạng thái tương tác.

## Phạm vi

- Áp dụng đồng bộ cho các thẻ, chỉ số, ô nhập liệu, bảng, cửa sổ bật lên (modal) và các thành phần điều khiển dạng khối phụ ở chế độ tối của giao diện người dùng (frontend).
- Giữ nguyên màu nền trang ở mã `#0b0f17` để đảm bảo sự tách biệt trực quan giữa các thẻ.
- Giữ nguyên màu sắc của các thành phần mang ý nghĩa ngữ nghĩa (như AQI/trạng thái) và màu biểu tượng.
- Không thay đổi thiết kế ở chế độ sáng.

## Xử lý màu sắc

- Màu nền chính cho thẻ ở chế độ tối: `#242933`.
- Màu nền phụ cho các chỉ số, ô nhập liệu và các thành phần điều khiển tinh tế: `#2d333d`.
- Giữ nguyên màu viền hiện tại để duy trì cấu trúc và các trạng thái hiển thị khi được chọn/tập trung (focus).
- Chuyển đổi các thành phần có độ trong suốt hoặc hiệu ứng chuyển màu (gradient) sang tông màu xám than (charcoal) trung tính mới thay vì tông xanh-đen.

## Hướng triển khai

Sử dụng các biến (token) chủ đề tối dùng chung trong tệp `frontend/src/styles/theme.css` làm nguồn dữ liệu chuẩn; chỉ điều chỉnh các lớp tiện ích (utility class) hoặc hiệu ứng chuyển màu riêng lẻ ở những nơi không sử dụng các biến này. Việc này giúp đảm bảo tính nhất quán trên các trang và tránh làm thay đổi các màu nhấn mang ý nghĩa ngữ nghĩa. Kiểm tra kỹ để đảm bảo các thành phần như khu vực hiển thị chính (hero), thẻ chỉ số thời tiết, thẻ thông tin chất ô nhiễm, biểu đồ, bảng dự báo, cảnh báo, thanh điều hướng và cửa sổ bật lên đều sử dụng tông màu xám than sáng hơn này.

## Kiểm chứng

- Chạy lệnh build/kiểm tra kiểu dữ liệu (type-check) hiện có của frontend.
- Kiểm tra việc sử dụng lớp/biến đã thay đổi để đảm bảo chế độ sáng và các thành phần màu nhấn không bị ảnh hưởng.
- Xác nhận rằng không có tệp tin nào không liên quan bị thay đổi.