# Home.tsx: Typography, Color và Shape Review

**Ngày review:** 2026-09-19  
**Phạm vi:** `frontend/src/pages/Home.tsx`  
**Nguồn tiêu chí:** `.agents/skills/design-taste-frontend/SKILL.md`, Section 4.1 Typography và Section 4.2 Color Calibration, kèm Color Consistency Lock và Shape Consistency Lock.  
**Chế độ:** Audit-only theo lựa chọn đã duyệt. File này **không thay đổi mã nguồn** của `Home.tsx`, `index.css` hoặc `theme.css`.

## 1. Design read và phạm vi đánh giá

Đây là một dashboard AQI có mật độ dữ liệu cao, phục vụ người dùng phổ thông và các nhóm cần thông tin sức khỏe. Vì vậy các directive dành cho landing page trong skill cần được áp dụng có điều kiện:

- Không áp dụng máy móc display headline `text-4xl md:text-6xl` cho mọi khu vực.
- Không xem màu đỏ, xanh lá, xanh dương của trạng thái AQI, xu hướng và thời tiết là lỗi nếu chúng đang truyền tải nghĩa semantic.
- Vẫn phải khóa một accent thương hiệu, khóa hệ radius, bảo đảm contrast và tránh để mọi card cùng có mức nổi bật.

**Dial baseline đề xuất cho lần chỉnh sửa sau:** `DESIGN_VARIANCE 4`, `MOTION_INTENSITY 3`, `VISUAL_DENSITY 6`. Đây là hướng ổn định, dễ quét và phù hợp dashboard hơn baseline landing page `8 / 6 / 4`.

## 2. Tóm tắt kết quả

| Hạng mục | Kết quả hiện tại | Mức độ |
|---|---|---|
| Font family | Runtime đang dùng system sans ở `theme.css` và `index.css`; không còn bằng chứng `Fira Sans`/`Inter` như audit cũ | Đạt một phần |
| Typography scale | Có hierarchy, nhưng metadata và body nhỏ xuất hiện dày (`text-xs`, `text-[10px]`, chart `fontSize: 11`) | Cần cải thiện |
| Color Consistency Lock | Chưa khóa hoàn toàn: cam, xanh dương, xanh lá, đỏ cùng xuất hiện; semantic colors là hợp lý nhưng CTA xanh đang cạnh tranh accent cam | Chưa đạt |
| Theme token consistency | Trộn CSS variables, Tailwind slate/orange/sky và hard-coded chart colors | Chưa đạt |
| Shape Consistency Lock | Trộn `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`; shadow từ `sm` đến `2xl` | Chưa đạt |
| Light/dark parity | Có dark variants ở nhiều nơi, nhưng chart tooltip dùng nền dark hard-coded và một số text không có dark variant | Cần kiểm tra |
| Button contrast | Cam đậm và sky đậm tốt hơn các màu sáng, nhưng cần kiểm tra cả focus/disabled và từng trạng thái | Cần xác minh |

## 3. Section 4.1: Typography

### 3.1 Những điểm đang làm tốt

- Hero station name có hierarchy hợp lý: `text-2xl sm:text-3xl lg:text-4xl`, xem [Home.tsx:273](../../frontend/src/pages/Home.tsx#L273).
- AQI value được ưu tiên rõ bằng `text-5xl sm:text-6xl`, xem [Home.tsx:300](../../frontend/src/pages/Home.tsx#L300).
- Heading section dùng `text-xl sm:text-2xl`, giúp phân tách Forecast, Health, Pollutants, Charts và Map.
- Body quan trọng thường có `leading-relaxed`, nhất là mô tả AQI và advice.
- Font stack thực tế hiện đã đồng bộ giữa [index.css](../../frontend/src/index.css) và [theme.css](../../frontend/src/styles/theme.css): `-apple-system`, `BlinkMacSystemFont`, `"SF Pro Text"`, `"Segoe UI"`, `sans-serif`.

### 3.2 Vấn đề cần xử lý

#### A. Font stack chưa có một tên thương hiệu rõ ràng

Hiện tại đây là system sans, không phải lỗi kỹ thuật. Tuy nhiên typography có thể thay đổi theo hệ điều hành và chưa có vai trò token rõ ràng giữa display, body và data.

**Đánh giá theo 4.1:** phù hợp dashboard và accessibility hơn Inter chưa import, nhưng cần quyết định có chủ đích:

1. Giữ system sans để ưu tiên hiệu năng và tính trung tính; hoặc
2. Self-host một sans display phù hợp và vẫn giữ system fallback.

Không nên thêm serif chỉ để tạo cảm giác “premium”. AQI dashboard cần khả năng đọc và tin cậy, không phải editorial styling.

#### B. Mật độ text nhỏ cao

- Có nhiều `text-xs` cho metadata, filter, subtitle, card content và advice.
- Weather labels dùng `text-[10px]` ở các metric, xem [Home.tsx:352-396](../../frontend/src/pages/Home.tsx#L352-L396).
- Chart axes dùng `fontSize: 11`, xem [Home.tsx:795-868](../../frontend/src/pages/Home.tsx#L795-L868).
- Một số giá trị hỗ trợ dùng `text-slate-400`; nếu kết hợp với cỡ nhỏ thì khả năng đọc giảm mạnh.

**Đề xuất:** đặt minimum đọc mặc định cho nội dung có nghĩa ở `text-sm` hoặc tương đương `14px`; chỉ giữ 10-12px cho metadata phụ thật sự. Với 6 weather metrics, ưu tiên nhãn `12px` và value `14px`, hoặc giảm số metric hiển thị thay vì nén chữ.

#### C. Weight bị dồn về `font-black`

`font-black` đang được dùng cho station ID, AQI value, nhiều heading, pollutant value và table value. Khi nhiều thành phần cùng nặng, AQI chính không còn độc quyền về thị giác.

**Đề xuất weight scale:**

- `font-black`: chỉ cho AQI value và H1.
- `font-bold`: section heading, CTA, status label.
- `font-semibold`: metric value phụ, table value, labels quan trọng.
- `font-normal`/`font-medium`: metadata và body.

#### D. Line-height chưa được token hóa

Body dài đã có `leading-relaxed`, nhưng nhiều subtitle và metadata không có line-height explicit. Song ngữ Việt/Anh có thể tạo chiều cao dòng khác nhau.

**Đề xuất:** xác định một token body `leading-6`, compact metadata `leading-5`, và chỉ dùng `leading-tight` cho số liệu lớn hoặc heading ngắn.

### 3.3 Kết luận Typography

**Đạt một phần.** Font stack hiện tại tốt hơn audit cũ vì đã nhất quán, nhưng cần giảm cỡ chữ nhỏ và phân phối lại weight. Đây là ưu tiên cao vì ảnh hưởng trực tiếp tới khả năng đọc dữ liệu AQI.

## 4. Section 4.2: Color Calibration

### 4.1 Palette đang tồn tại

#### Accent và action

- Cam: `orange-500`, `orange-700`, `orange-800`, cùng `--accent-orange` và `--accent-orange-strong`.
- Xanh dương: `sky-500`, `sky-600`, `sky-700`, `sky-800`, dùng cho location, thời tiết, mưa và một số chart.

#### Semantic data colors

- Đỏ: xu hướng tăng, vượt giới hạn hoặc nguy cơ cao.
- Xanh lá: xu hướng giảm, an toàn và tips.
- Màu AQI động từ `getAQICategory`, là màu semantic theo cấp độ ô nhiễm.

#### Neutral và surfaces

- Tailwind `slate-*`.
- CSS variables: `--bg-primary`, `--bg-card`, `--bg-card-header`, `--border-color`, `--text-main`, `--text-muted`.
- Chart tooltip/grid/axis dùng hard-coded hex: `#0F172A`, `#334155`, `#94A3B8`, `#F8FAFC`.

### 4.2 Color Consistency Lock

**Trạng thái: Chưa đạt hoàn toàn, nhưng có thể sửa mà không phá semantic meaning.**

Theo skill, một page cần một accent dùng xuyên suốt. Với Home, lựa chọn hợp lý nhất là **cam đất/cam đậm làm accent thương hiệu**, vì:

- AQI hero và focus state đã dùng cam.
- Notification CTA dùng cam đậm.
- Nhiều icon và active tab dùng cam.

Xanh dương nên được phân loại rõ là **secondary utility/status color**, không phải một CTA accent thứ hai. Hiện tại nút geolocation dùng `bg-sky-700` tại [Home.tsx:238](../../frontend/src/pages/Home.tsx#L238), trong khi các CTA điều hướng chính khác dùng cam. Điều này làm người dùng khó hiểu action nào là primary.

**Quy tắc đề xuất:**

1. Cam: primary action, active tab, focus ring, brand icon và điểm nhấn chính.
2. Xanh dương: chỉ cho location/weather/chart series hoặc trạng thái utility có nghĩa.
3. Đỏ/xanh lá: chỉ cho error/risk/trend/safe semantic, không dùng làm trang trí.
4. Neutral: dùng CSS semantic tokens, không trộn tùy ý `bg-white`, `bg-slate-*` và inline variables cho cùng một vai trò.

Đây là một **documented exception** hợp lệ của Color Consistency Lock: semantic colors được phép tồn tại khi chúng truyền tải trạng thái dữ liệu thật. Điều cần khóa là accent và neutral, không phải biến mọi dữ liệu thành một màu.

### 4.3 Token và theme parity

- [theme.css](../../frontend/src/styles/theme.css) đã định nghĩa `--bg-card-header` trong cả `:root` và `.dark`, nên nhận định cũ rằng light mode thiếu token này không còn đúng.
- Tuy nhiên Home vẫn trộn token với Tailwind: `bg-white`, `border-slate-200`, `text-slate-*`, `dark:surface-card` và inline `var(...)`.
- Chart tooltip dùng nền dark `#0F172A` ngay cả khi page đang light mode, xem [Home.tsx:825-834](../../frontend/src/pages/Home.tsx#L825-L834). Đây là rủi ro theme lock và cần chuyển sang token hoặc theme-aware config.
- Các label `text-black/60` và `text-black/85` trong weather metrics, xem [Home.tsx:352-396](../../frontend/src/pages/Home.tsx#L352-L396), không đi qua semantic text token và tạo độ tương phản khác hẳn phần còn lại.

**Đề xuất:** chọn CSS variables làm nguồn chính cho surfaces, borders, text và chart tooltip. Tailwind chỉ nên biểu diễn layout và semantic state. Không dùng hex inline nếu cùng giá trị có thể lấy từ token.

### 4.4 Contrast review

Các điểm cần đưa vào kiểm tra WCAG thực tế:

- `text-slate-400`, `placeholder-slate-400` và chart axis `#94A3B8` khi dùng ở cỡ nhỏ.
- `text-sky-600` tại status locating, [Home.tsx:246](../../frontend/src/pages/Home.tsx#L246).
- Weather labels dùng black opacity trên nền orange tint.
- Button text trắng trên mọi trạng thái `orange-*` và `sky-*`, bao gồm hover, disabled và focus.

Không nên kết luận chỉ từ tên class. Cần đo contrast trên màu nền render thực tế, cả light và dark, đặc biệt khi có opacity.

## 5. Shape Consistency Lock

### 5.1 Inventory hiện tại

- Card lớn/hero: `rounded-3xl`, xem [Home.tsx:254](../../frontend/src/pages/Home.tsx#L254).
- Search, CTA và chart tabs: `rounded-2xl`.
- Forecast filter, table badge và metric sub-block: `rounded-xl` hoặc `rounded-lg`.
- AQI badge/status: `rounded-lg`, `rounded-md`, và component `AQIBadge` có thể có rule riêng.
- Risk badge: `rounded-full`.
- Shadow: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`.

### 5.2 Kết luận

**Chưa đạt Shape Consistency Lock ở cấp page.** Hệ thống hiện không sai vì mỗi radius đều có thể có ngữ nghĩa, nhưng rule đó chưa được ghi nhận và áp dụng nhất quán. Đặc biệt:

- `rounded-3xl` xuất hiện ở nhiều section phụ, khiến card phụ có trọng lượng gần hero.
- `rounded-2xl` dùng cho cả input, dropdown, CTA và tab group, nhưng các control này có vai trò khác nhau.
- Shadow `2xl` ở autocomplete và `xl` ở table/hero làm nhiều lớp cùng “nổi” trên viewport.
- Card, input, badge và pill chưa có một scale được công bố.

### 5.3 Shape scale đề xuất

Chọn hệ **soft nhưng gọn** cho dashboard:

| Vai trò | Radius đề xuất | Shadow |
|---|---:|---|
| Page card / hero / chart | `16px` (`rounded-2xl`) | `shadow-sm` hoặc border |
| Input / select / control group | `10-12px` (`rounded-xl`) | không shadow hoặc `shadow-sm` |
| Button | `10-12px` (`rounded-xl`) | `shadow-sm` khi primary |
| Badge / status chip | `8px` (`rounded-lg`) hoặc full pill nếu là status | không shadow |
| Metric tile | `10-12px` | border hoặc rất nhẹ |
| Dropdown overlay | `12-16px` | một shadow lớn duy nhất vì đây là layer nổi |

Nếu muốn giữ `rounded-3xl` cho hero, cần ghi rõ đó là ngoại lệ duy nhất. Không nên dùng nó cho tất cả section.

## 6. Các finding theo ưu tiên

| Mức độ | Vị trí | Finding | Hướng đề xuất |
|---|---|---|---|
| Cao | [Home.tsx:238](../../frontend/src/pages/Home.tsx#L238), nhiều CTA khác | Accent cam và xanh dương cùng đóng vai trò CTA | Khóa cam là primary accent; phân loại sky là utility |
| Cao | [Home.tsx:825-834](../../frontend/src/pages/Home.tsx#L825-L834) | Tooltip chart hard-code dark trong cả light theme | Dùng semantic chart tokens và kiểm tra cả hai mode |
| Cao | [Home.tsx:352-396](../../frontend/src/pages/Home.tsx#L352-L396) | Label 10px và black opacity khó đọc | Tăng lên 12px, dùng text token có contrast rõ |
| Cao | Toàn page | Radius và shadow trộn quá nhiều cấp | Công bố một scale radius/shadow và áp dụng theo vai trò |
| Trung bình | Toàn page | `font-black` dùng quá rộng | Giữ black cho H1/AQI, hạ các heading/value phụ |
| Trung bình | [Home.tsx:795-868](../../frontend/src/pages/Home.tsx#L795-L868) | Chart axis 11px và màu `#94A3B8` | Dùng token axis, tăng cỡ nếu không ảnh hưởng layout |
| Trung bình | [Home.tsx:199](../../frontend/src/pages/Home.tsx#L199), [Home.tsx:238](../../frontend/src/pages/Home.tsx#L238) | Focus/placeholder và CTA cần đo theo trạng thái render | Chạy contrast check light/dark/hover/focus/disabled |
| Thấp | Toàn page | Token CSS và Tailwind neutral cùng tồn tại | Từng bước gom surfaces/borders/text về CSS variables |

## 7. Pre-flight checklist cho lần chỉnh sửa sau

- [ ] Có một font decision rõ ràng: system sans có chủ đích hoặc self-host sans, không import font không dùng.
- [ ] H1/AQI là nơi duy nhất dùng `font-black` ở cấp nổi bật nhất.
- [ ] Nội dung đọc được không thấp hơn 14px nếu không phải metadata phụ.
- [ ] Cam là primary accent duy nhất; sky/green/red được ghi rõ là semantic exceptions.
- [ ] Chart tooltip, axis, grid và weather labels hoạt động đúng ở light/dark.
- [ ] Tất cả CTA đạt WCAG AA ở default, hover, focus và disabled.
- [ ] Chọn một shape scale và giảm shadow mạnh ở section phụ.
- [ ] Kiểm tra desktop và mobile vì tăng cỡ chữ có thể làm forecast/table wrap.
- [ ] Duy trì `prefers-reduced-motion` cho các hiệu ứng hiện có của `FadeIn` và hover transition.

## 8. Đề xuất cải thiện thêm

### Ưu tiên 1: Token audit nhỏ, không redesign

Tạo một bảng mapping semantic cho `surface`, `surface-subtle`, `border`, `text-primary`, `text-muted`, `accent`, `accent-strong`, `chart-axis` và `chart-tooltip`. Sau đó thay dần các hard-coded chart colors và neutral utility có cùng vai trò.

### Ưu tiên 2: Typography pass theo mật độ dữ liệu

Không tăng tất cả font một cách đồng loạt. Ưu tiên weather labels, forecast subtitle, pollutant unit/safe limit, insight advice và chart axis. Có thể giảm một dòng weather metric nếu cần không gian.

### Ưu tiên 3: Hierarchy pass

Hero AQI nên là lớp nổi bật nhất. Forecast, chart và map là nhóm nội dung chính thứ hai. Notification và insights nên dùng border/spacing thay vì shadow lớn để không cạnh tranh với AQI.

### Ưu tiên 4: Visual regression

Sau khi chỉnh, kiểm tra ít nhất:

1. Home light mode.
2. Home dark mode.
3. Mobile khoảng 390px.
4. Desktop khoảng 1280px.
5. Search autocomplete, empty forecast, notification CTA và cả ba chart tabs.

## 9. Kết luận

`Home.tsx` có nền tảng tốt và hierarchy dữ liệu rõ, nhưng hiện chưa vượt qua hoàn toàn hai consistency lock của skill:

- **Color Consistency Lock:** cần khóa accent cam và định danh rõ các màu semantic.
- **Shape Consistency Lock:** cần giảm số cấp radius/shadow và ghi rule theo vai trò.
- **Typography:** font stack hiện tại đã nhất quán hơn audit cũ, nhưng cỡ chữ nhỏ và `font-black` đang được dùng quá rộng.

Đây là audit-only. Không có thay đổi mã nguồn nào được thực hiện trong lần review này.
