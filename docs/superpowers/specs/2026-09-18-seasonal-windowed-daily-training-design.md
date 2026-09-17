# Thiết kế: Huấn luyện SVR theo cửa sổ 30 ngày và mùa cho dự báo AQI 7 ngày

## 1. Mục tiêu

Điều chỉnh luồng dự báo AQI theo ngày để mô hình không huấn luyện trên toàn bộ lịch sử một cách không chọn lọc. Với mỗi lần dự báo 7 ngày, hệ thống sẽ:

- Dùng ngày cuối cùng có dữ liệu thực tế làm mốc `D`.
- Dự báo lần lượt các ngày `D+1` đến `D+7`.
- Với từng ngày dự báo, chọn riêng tập dữ liệu huấn luyện gồm cửa sổ 30 ngày tương ứng của năm hiện tại và các năm trước.
- Chỉ dùng các mẫu có mùa tương ứng với ngày đích cần dự báo.
- Huấn luyện 7 mô hình SVR riêng, mỗi mô hình phụ trách một horizon.

Mục tiêu là ưu tiên tính tương đồng về thời gian và mùa vụ, giảm ảnh hưởng của các giai đoạn khí hậu khác biệt, đồng thời giữ cách giải thích rõ ràng cho báo cáo nghiên cứu.

Phạm vi của thiết kế này chỉ là luồng Daily Forecast 7 ngày. Luồng Hourly Forecast không bị thay đổi.

## 2. Hiện trạng liên quan

Các thành phần hiện tại có vai trò sau:

- [`app/features/season.py`](../../../ml-service/app/features/season.py) định nghĩa 4 mùa Việt Nam:
  - Xuân: tháng 2-4
  - Hạ: tháng 5-7
  - Thu: tháng 8-10
  - Đông: tháng 11-1
- [`app/features/daily_features.py`](../../../ml-service/app/features/daily_features.py) tạo đặc trưng lịch, lag AQI, rolling statistics, lag thời tiết và target `d_1` đến `d_7`.
- [`app/training/SVR/train_svr_daily.py`](../../../ml-service/app/training/SVR/train_svr_daily.py) hiện dùng một `MultiOutputRegressor` để học đồng thời 7 target.
- [`app/services/daily_predictor.py`](../../../ml-service/app/services/daily_predictor.py) nạp một model bundle và sinh 7 giá trị dự báo.

Thay đổi cốt lõi là chuyển từ một mô hình đa đầu ra sang 7 mô hình một đầu ra. Việc này cần thiết vì điều kiện lọc mùa được áp dụng riêng cho từng ngày đích; tập mẫu phù hợp cho `D+1` có thể khác tập mẫu phù hợp cho `D+7`.

## 3. Định nghĩa dữ liệu và cửa sổ

### 3.1. Ngày dự báo

Gọi `D` là ngày cuối cùng có dữ liệu sạch và hợp lệ trong `clean_daily.parquet`.

Các ngày đích là:

```text
target_date(h) = D + h ngày, với h thuộc {1, 2, ..., 7}
```

Ngày đích không được lấy từ dữ liệu tương lai khi xây dựng input dự báo. Các feature đầu vào của lần dự báo production vẫn được tạo từ lịch sử có sẵn đến `D`.

### 3.2. Anchor date và target lịch sử

Một mẫu huấn luyện có `anchor_date = t` và target cho horizon `h` là:

```text
target_history_date = t + h ngày
target_value = AQI tại t + h
```

Điều kiện dữ liệu của mẫu phải đảm bảo:

- Có đầy đủ feature đầu vào tại `t`.
- Có giá trị AQI mục tiêu tại `t+h`.
- Không sử dụng giá trị sau `t` để tạo feature của anchor, ngoại trừ các target được dùng đúng vai trò nhãn trong dữ liệu lịch sử.
- Các rolling và lag hiện có tiếp tục được tính từ dữ liệu quá khứ, bắt đầu từ lag 1, để tránh data leakage.

### 3.3. Cửa sổ lịch tương ứng

Với mỗi horizon `h`, tập anchor date được chọn từ:

1. Cửa sổ 30 ngày ngay trước ngày chạy dự báo:
   ```text
   [D - 29 ngày, D]
   ```
2. Cửa sổ lịch tương ứng của cùng khoảng ngày ở mỗi năm lịch sử có trong dữ liệu.
3. Tập ngày trong đủ ba tháng của mùa target ở mỗi năm lịch sử, giới hạn không vượt quá ngày mốc `D` ở năm hiện tại.

Khi ánh xạ sang năm trước, ngày và tháng của cửa sổ được giữ tương ứng với `D`; năm được thay bằng từng năm lịch sử. Cần xử lý đúng ngày nhuận, đặc biệt khi khoảng thời gian chứa ngày 29/02: ngày không tồn tại ở năm không nhuận phải được bỏ qua, không thay thế âm thầm bằng ngày khác.

Tập ứng viên là hợp của cửa sổ 30 ngày và tập ba tháng mùa target. Không lấy 30 dòng dữ liệu gần nhất sau khi bỏ qua các ngày thiếu. Việc bổ sung ba tháng mùa là bắt buộc để tránh trường hợp cửa sổ 30 ngày nằm ở ranh giới mùa, sau khi lọc cùng mùa thì không đủ số mẫu tối thiểu.

### 3.4. Lọc theo mùa

Với từng horizon `h`, hệ thống xác định:

```text
target_season = season(target_date(h))
```

Một mẫu chỉ được giữ nếu:

```text
season(target_history_date) == target_season
```

Lọc theo mùa phải áp dụng cho **ngày target lịch sử `t+h`**, không chỉ cho anchor date `t`. Điều này tránh trường hợp anchor nằm ở mùa này nhưng ngày cần dự báo trong mẫu lại rơi sang mùa khác.

Điều kiện chọn mẫu đầy đủ là:

```text
anchor_date thuộc cửa sổ 30 ngày tương ứng
AND target_history_date có dữ liệu AQI
AND season(target_history_date) == season(target_date(h))
AND feature/target không thiếu
```

Nếu tuần dự báo cắt qua ranh giới mùa, mỗi horizon sẽ dùng mùa của chính ngày đích đó. Không chọn một mùa đại diện cho toàn bộ 7 ngày.

## 4. Kiến trúc đề xuất

### 4.1. Bộ chọn tập huấn luyện

Tạo một lớp hoặc nhóm hàm chuyên trách việc chọn mẫu theo:

- Ngày mốc `D`.
- Horizon `h`.
- Số ngày cửa sổ, mặc định 30.
- Danh sách năm lịch sử.
- Hàm xác định mùa dùng chung với [`season.py`](../../../ml-service/app/features/season.py).

Bộ chọn trả về tập dữ liệu riêng cho từng horizon:

```text
X_h, y_h, metadata_h
```

`metadata_h` nên chứa ngày đích, mùa đích, các năm được sử dụng, số mẫu trước/sau khi lọc và danh sách ngày bị loại do thiếu dữ liệu. Metadata dùng cho log, đánh giá và kiểm tra kết quả train; không đưa metadata dạng chuỗi vào feature model.

### 4.2. Bảy mô hình SVR

Mỗi horizon có một pipeline SVR một đầu ra, vẫn giữ các nguyên tắc đang có:

- Chuẩn hóa feature bằng `StandardScaler`.
- Chuẩn hóa target qua `TransformedTargetRegressor`.
- Dùng SVR kernel RBF.
- Tối ưu siêu tham số bằng `GridSearchCV`.
- Cross-validation theo thời gian, không xáo trộn dữ liệu.

Mỗi mô hình chỉ được `fit` trên `X_h, y_h` của horizon tương ứng. Không ghép các tập của 7 horizon thành một tập chung sau khi đã lọc mùa.

### 4.3. Model bundle

Thay vì lưu một key `model`, bundle cần lưu cấu trúc tương đương:

```text
models: {
  "d_1": model_1,
  ...
  "d_7": model_7
}
```

Bundle cũng cần lưu:

- `feature_columns` dùng chung hoặc theo từng horizon nếu có khác biệt.
- `target_columns`.
- `horizon`.
- `window_days = 30`.
- Quy tắc mùa và phiên bản/metadata liên quan.
- Ngày dữ liệu cuối cùng `D`.
- Thống kê số mẫu của từng horizon.
- Best params và metric riêng của từng horizon.
- Thời điểm train.

Không nên ghi đè model cũ bằng bundle mới nếu một horizon train thất bại. Quy trình train phải báo lỗi rõ ràng và dừng trước bước lưu model production khi chưa tạo đủ 7 model hợp lệ.

### 4.4. Predictor

[`app/services/daily_predictor.py`](../../../ml-service/app/services/daily_predictor.py) sẽ:

1. Nạp 7 model từ bundle.
2. Tạo một dòng feature mới nhất tương ứng với `D`.
3. Gọi model `d_h` cho từng horizon.
4. Ghép giá trị dự báo với `D+h`.
5. Giữ nguyên schema API hiện tại: ngày, AQI, mức chất lượng, thành phố, horizon và thời gian sinh dự báo.

Nếu bundle thiếu model của bất kỳ horizon nào, predictor phải phát hiện và báo lỗi rõ ràng khi khởi tạo hoặc trước khi trả dự báo; không trả về kết quả thiếu ngày dưới dạng thành công.

## 5. Đánh giá và kiểm định

### 5.1. Tách theo thời gian

Đánh giá phải mô phỏng cách sử dụng thực tế: các mẫu validation/test chỉ dùng quá khứ để dự báo tương lai. Không dùng random split.

Với mỗi horizon, thực hiện đánh giá riêng trên các mẫu đã áp dụng đúng bộ lọc cửa sổ và mùa. Báo cáo tối thiểu:

- MAE.
- RMSE.
- Số mẫu train sau lọc.
- Số mẫu validation/test.
- Khoảng thời gian và các mùa thực sự được sử dụng.

Kết quả tổng hợp 7 ngày chỉ là thống kê bổ sung; không được che khuất metric riêng của từng horizon.

### 5.2. Kiểm tra chống leakage

Cần có kiểm thử chứng minh:

- Feature tại anchor `t` không đọc AQI tại `t+1` trở đi.
- Cửa sổ chọn mẫu không chứa anchor sau `D`.
- Dữ liệu target khác mùa bị loại.
- Mỗi `d_h` được fit bằng đúng tập `X_h/y_h`.
- Ngày 29/02 được xử lý ổn định giữa năm nhuận và không nhuận.
- Không lưu bundle production khi một horizon thiếu dữ liệu tối thiểu hoặc train thất bại.

### 5.3. Ngưỡng dữ liệu tối thiểu

Thiết kế yêu cầu train thất bại rõ ràng khi một horizon không có đủ mẫu sau lọc. Giá trị ngưỡng tối thiểu cần được cấu hình, không hard-code rải rác; khi triển khai cần chốt con số dựa trên số năm dữ liệu thực tế và yêu cầu `TimeSeriesSplit`.

Ngưỡng phải thỏa cả hai điều kiện:

- Đủ số dòng để huấn luyện SVR.
- Đủ số đoạn thời gian để thực hiện số fold cross-validation đã cấu hình.

Nếu dữ liệu không đáp ứng, hệ thống không tự động fallback sang toàn bộ lịch sử, không tự động trộn mùa khác và không âm thầm nới cửa sổ.

## 6. Xử lý trường hợp biên

- **7 ngày cắt qua mùa:** mỗi horizon dùng mùa riêng của target date.
- **Cửa sổ lịch giao với ranh giới năm:** xử lý bằng ngày-tháng tương ứng; cần kiểm tra đúng năm của target sau khi cộng horizon.
- **Năm nhuận:** bỏ ngày lịch không tồn tại ở năm được ánh xạ.
- **Ngày thiếu trong database:** bỏ mẫu thiếu feature/target và ghi nhận số lượng trong metadata; không dồn sang ngày khác để đủ 30 dòng.
- **Dữ liệu trùng ngày:** phải được xử lý từ bước làm sạch hiện có trước khi chọn mẫu; bộ chọn không tự ý chọn ngẫu nhiên.
- **Mùa Đông qua tháng 12-tháng 1:** dùng đúng hàm mùa hiện tại, trong đó tháng 11, 12 và 1 cùng thuộc `Dong`.
- **Không đủ dữ liệu:** dừng trước khi lưu bundle production, kèm thông báo horizon và điều kiện gây thiếu.
- **Cửa sổ 30 ngày không đủ mẫu cùng mùa:** dùng thêm các ngày còn lại trong đủ ba tháng của cùng mùa; đây là phạm vi chọn mẫu theo thiết kế, không phải fallback sang mùa khác.

## 7. Các thay đổi dự kiến theo file

- [`app/features/season.py`](../../../ml-service/app/features/season.py): tái sử dụng hàm mùa hiện có; chỉ mở rộng nếu cần một helper xác định mùa theo `Timestamp`, không thay đổi quy ước 4 mùa hiện tại.
- [`app/features/daily_features.py`](../../../ml-service/app/features/daily_features.py): tiếp tục tạo feature lịch sử và target; có thể cần tách rõ dữ liệu feature đầy đủ với bước chọn mẫu để tránh trộn logic lọc train vào feature engineering chung.
- [`app/training/SVR/train_svr_daily.py`](../../../ml-service/app/training/SVR/train_svr_daily.py): thêm bộ chọn cửa sổ/mùa, train 7 pipeline một đầu ra, đánh giá riêng và lưu bundle mới.
- [`app/services/daily_predictor.py`](../../../ml-service/app/services/daily_predictor.py): đọc bundle 7 model và dự báo theo từng horizon.
- Tài liệu ML service: cập nhật mô tả từ “một model đa đầu ra” thành “7 model SVR theo horizon”, cùng quy tắc cửa sổ 30 ngày và mùa.

Không thay đổi API response, endpoint daily, công thức AQI, luồng hourly hoặc định nghĩa mùa nếu không phát sinh yêu cầu mới.

## 8. Quy trình xử lý dự kiến

```text
clean_daily.parquet
        |
        v
Tạo feature + target lịch sử
        |
        v
Xác định D và 7 target dates
        |
        +--> h=1: chọn cửa sổ -> lọc mùa -> train/evaluate model d_1
        +--> h=2: chọn cửa sổ -> lọc mùa -> train/evaluate model d_2
        ...
        +--> h=7: chọn cửa sổ -> lọc mùa -> train/evaluate model d_7
        |
        v
Kiểm tra đủ 7 model
        |
        v
Lưu bundle nguyên tử
        |
        v
Predictor gọi model d_h cho D+h
```

Việc lưu bundle nên mang tính nguyên tử: tạo bundle hoàn chỉnh trong bộ nhớ hoặc file tạm, chỉ thay thế file model production sau khi cả 7 horizon đều hợp lệ.

## 9. Tiêu chí hoàn thành

Thiết kế được xem là triển khai đúng khi:

1. Mỗi horizon có một mô hình và một tập mẫu được lọc riêng.
2. Mẫu train chỉ thuộc cửa sổ 30 ngày tương ứng của năm hiện tại/các năm lịch sử.
3. Target lịch sử của mẫu có cùng mùa với ngày dự báo tương ứng.
4. Không có fallback âm thầm sang dữ liệu toàn bộ hoặc mùa khác.
5. Predictor trả đủ 7 ngày theo schema hiện tại.
6. Metric, số mẫu, mùa và khoảng thời gian được ghi riêng cho từng horizon.
7. Các kiểm thử về leakage, năm nhuận, giao mùa và thiếu dữ liệu đều có kết quả xác định.
8. Tài liệu vận hành phản ánh đúng kiến trúc mới.

## 10. Các điểm cần chốt trước khi code

Thiết kế này cố ý chưa tự quyết một tham số nghiên cứu quan trọng: **ngưỡng số mẫu tối thiểu cho mỗi horizon**. Tham số này nên được chốt sau khi kiểm tra số năm dữ liệu thực tế và số fold `TimeSeriesSplit`; không nên chọn tùy ý vì nó ảnh hưởng trực tiếp đến khả năng train và độ tin cậy của kết quả.
