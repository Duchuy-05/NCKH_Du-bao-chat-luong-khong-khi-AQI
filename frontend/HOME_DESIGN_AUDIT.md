# Frontend Design Audit: Home

**Target:** `src/pages/Home.tsx`  
**Scope:** Chỉ đánh giá 4 tiêu chí:

1. Typography
2. Visual hierarchy & UX flow
3. Background & màu nền
4. Aesthetic / minimalist

> Đây là report đánh giá, chưa bao gồm thay đổi code.

---

## 1. Typography

### Điểm tốt

- Có phân cấp kích thước tương đối rõ:
  - Hero station name: `text-2xl` → `text-4xl`
  - AQI value: `text-5xl` → `text-6xl`
  - Section heading: `text-xl` → `text-2xl`
  - Body/supporting text: chủ yếu `text-xs` → `text-sm`
- Heading dùng `font-black`, body dùng `font-medium`/`font-normal`, giúp phân biệt nội dung chính và phụ.
- Một số đoạn dài đã có `leading-relaxed`, đặc biệt phần mô tả AQI, cảnh báo sức khỏe và advice.

### Vấn đề

- **Font family không nhất quán với design token**
  - `src/index.css` khai báo `Fira Sans` trong `--font-sans`.
  - `src/styles/theme.css` lại đặt `body` dùng `Inter`, nhưng `Inter` không được import.
  - Kết quả có thể rơi về `Segoe UI`/Roboto tùy hệ điều hành, khiến typography không ổn định.
- **Có quá nhiều text cực nhỏ**
  - `text-[10px]`, `text-[11px]`, `text-xs` xuất hiện dày đặc ở metadata, forecast, comparison và advice.
  - Với dashboard nhiều dữ liệu, cỡ chữ này làm giảm khả năng quét nhanh và đọc trên laptop nhỏ/mobile.
- **Line-height chưa nhất quán**
  - Một số body text có `leading-relaxed`, nhưng nhiều label và paragraph chỉ dùng `text-xs` mà không chỉ định line-height.
  - Nội dung song ngữ dài có thể bị dày và khó đọc, nhất là trong health/advice cards.
- `font-black` được dùng rất rộng cho station name, AQI, badge, số liệu và nhiều heading. Điều này làm giảm khác biệt giữa điểm nhấn chính và điểm nhấn phụ.

### Đánh giá

**Khá tốt về phân cấp cơ bản, nhưng chưa nhất quán về font và đang phụ thuộc quá nhiều vào cỡ chữ nhỏ.**

### Checklist chỉnh sửa

- [ ] Thống nhất font family giữa `index.css` và `theme.css`.
- [ ] Giảm số lượng text `10px`/`11px` ở nội dung có thể ảnh hưởng khả năng đọc.
- [ ] Chuẩn hóa line-height cho body text và nội dung song ngữ.
- [ ] Giảm phạm vi sử dụng `font-black` cho các cấp heading phụ.

---

## 2. Visual hierarchy & UX flow

### Điểm tốt

- Luồng nội dung tổng thể có logic:
  1. Search/location
  2. AQI hiện tại
  3. Forecast 7 ngày
  4. Health advice
  5. Alert notification
  6. Pollutant details
  7. Map
  8. Outdoor hours/insights
- AQI hiện tại được đặt trong hero card lớn, có số AQI, category badge, pollutant chính và cảnh báo sức khỏe.
- Các hành động như xem map, forecast và alert có affordance rõ qua button/card click.
- Responsive layout được cân nhắc: forecast có table desktop và card mobile riêng.

### Vấn đề

- **Search/location bar xuất hiện trước AQI hero và có visual prominence khá cao**
  - `Home.tsx:185-248`
  - Đối với trang home của ứng dụng AQI, nhiệm vụ chính thường là xem AQI hiện tại. Search có thể cạnh tranh sự chú ý với thông tin quan trọng nhất.
- **Có quá nhiều section cùng mức độ nổi bật**
  - Root dùng `space-y-16` tại `Home.tsx:180`.
  - Gần như section nào cũng có card lớn, rounded corner, border và shadow.
  - Vì vậy hierarchy giữa AQI chính, chart, map, health advice và insights chưa đủ chênh lệch.
- **Section heading khá đồng đều**
  - Hầu hết dùng `text-xl sm:text-2xl font-black`, khiến Forecast, Health, Pollutants và Map có trọng lượng tương tự dù mức độ ưu tiên khác nhau.
- **Notification CTA nằm giữa luồng thông tin**
  - `Home.tsx:605-656`
  - Khối alert có shadow lớn và button màu nổi, dễ làm người dùng rời khỏi luồng AQI → pollutant/chart/map.
- Hero chứa nhiều nhóm thông tin cạnh nhau: metadata, station name, AQI, badge, pollutant, description, health warning và 6 weather metrics. Thông tin đầy đủ nhưng vùng hero khá nặng khi quét.

### Đánh giá

**Luồng nội dung đầy đủ và có logic, nhưng visual hierarchy chưa đủ tập trung vào nhiệm vụ chính là hiểu AQI hiện tại và hành động tiếp theo.**

### Checklist chỉnh sửa

- [ ] Xác định rõ một primary action và một secondary action cho hero.
- [ ] Giảm prominence của search hoặc bố trí nó không cạnh tranh với AQI chính.
- [ ] Tạo khác biệt cấp độ rõ hơn giữa hero và các section phụ.
- [ ] Xem xét đưa notification CTA xuống sau các nội dung AQI/charts chính.
- [ ] Đánh giá lại số lượng metric hiển thị trực tiếp trong hero.

---

## 3. Background & màu nền

### Điểm tốt

- Có hệ thống token trong `src/styles/theme.css`:
  - `--bg-primary`
  - `--bg-card`
  - `--border-color`
  - `--text-main`
  - `--text-muted`
- Dark mode có quy ước màu riêng và phần lớn card đã dùng `dark:surface-card`, `surface-border`.
- Màu trạng thái AQI được tổ chức tập trung trong `src/utils/aqi.util.ts`, giúp category color có tính nhất quán.
- Text chính như `text-slate-900` trên nền sáng và `dark:text-white` trên nền tối nhìn chung có contrast tốt.

### Vấn đề về token/background

- **Token nền không hoàn toàn đồng nhất**
  - `App.tsx:61` dùng `bg-slate-50` và dark background `#0B0F17`.
  - `theme.css` định nghĩa nền là `#F8FAFC` và `#0A0A0D`.
  - Dark mode có hai nguồn màu khác nhau, dễ gây lệch giữa `body`, app shell và component.
- **`--bg-card-header` chỉ được định nghĩa trong `.dark`**
  - `theme.css:17` không có giá trị trong `:root`.
  - Home dùng trực tiếp `var(--bg-card-header)` tại hero AQI tile và health warning, ví dụ `Home.tsx:289-314`.
  - Ở light mode, biến này không tồn tại nên background inline có thể bị bỏ qua.
- Home trộn ba cách định nghĩa màu:
  - Tailwind utility: `bg-white`, `bg-slate-50`, `text-slate-*`
  - CSS variable: `var(--bg-card)`, `var(--border-color)`
  - Hardcoded chart colors: `#0F172A`, `#334155`, `#94A3B8`, v.v.
  - Điều này làm việc duy trì theme và kiểm soát contrast khó hơn.

### WCAG AA contrast

Các giá trị đáng chú ý trên nền trắng:

| Foreground | Contrast ước tính | Đánh giá |
|---|---:|---|
| `text-slate-900` / `#0F172A` | 17.85:1 | Đạt tốt |
| `text-slate-600` / `#475569` | 7.58:1 | Đạt tốt |
| `text-slate-500` / `#64748B` | 4.76:1 | Đạt AA, nhưng khá sát ngưỡng |
| `text-slate-400` / `#94A3B8` | 2.56:1 | Không đạt AA cho text thường |
| `bg-orange-500` + `text-white` | 2.80:1 | Không đạt AA cho button text |
| `bg-sky-500` + `text-white` | 2.77:1 | Không đạt AA cho button text |
| `text-sky-600` trên nền trắng | khoảng 4.10:1 | Không đạt AA cho text thường |

Các vị trí cần chú ý:

- Button `bg-orange-500` và `bg-sky-500`, ví dụ `Home.tsx:238` và `Home.tsx:926`.
- Muted text `text-slate-400`, đặc biệt các label `text-[10px]`, ví dụ `Home.tsx:1009`.
- Placeholder và metadata có cỡ chữ nhỏ kết hợp với màu nhạt, làm vấn đề contrast nghiêm trọng hơn.

### Đánh giá

**Nền và palette có định hướng tốt, nhưng token light/dark chưa hoàn chỉnh và một số accent/muted text không đạt WCAG AA.**

### Checklist chỉnh sửa

- [ ] Đồng bộ background giữa `App.tsx` và `theme.css`.
- [ ] Bổ sung giá trị `--bg-card-header` cho `:root`.
- [ ] Quyết định một nguồn màu chính: CSS variables hoặc Tailwind tokens.
- [ ] Kiểm tra lại foreground của button cam/xanh với WCAG AA.
- [ ] Thay thế hoặc giới hạn việc dùng `text-slate-400` cho text có ý nghĩa.

---

## 4. Aesthetic / minimalist

### Điểm tốt

- Card style có tính nhất quán: border radius lớn, spacing rộng, icon container và màu trạng thái đồng bộ.
- Palette cam/xanh phù hợp chủ đề môi trường và AQI.
- Các card không bị trang trí bằng quá nhiều hình ảnh hoặc gradient phức tạp.

### Vấn đề

- **Trang đang thiên về dashboard nhiều module hơn là minimalist**
  - Có 8 nhóm nội dung lớn và nhiều card con.
  - Hero đã chứa AQI, health warning và 6 weather metrics; sau đó thông tin tương tự tiếp tục xuất hiện ở forecast, pollutant, map và insights.
- **Lạm dụng `rounded-2xl`/`rounded-3xl` và shadow**
  - Gần như mọi block đều có bo góc lớn và shadow (`shadow-md`, `shadow-xl`, `shadow-2xl`).
  - Khi mọi element đều nổi bật, không còn cảm giác primary card và secondary content.
- **Vertical spacing có thể bị dư**
  - Root dùng `space-y-16` tại `Home.tsx:180`.
  - Nhiều section/card tiếp tục dùng `space-y-4`, `space-y-6`.
  - Trên màn hình lớn, người dùng phải scroll qua nhiều khoảng trống trước khi đến map/insights.
- **Mật độ thông tin không đồng đều**
  - Một số khu vực dùng text rất nhỏ để nhồi nhiều dữ liệu.
  - Trong khi đó card có padding lớn `p-6`, `p-8`, tạo cảm giác vừa rộng vừa dày thông tin.
- Notification block dùng `shadow-2xl`, badge, gradient blur và button nổi bật cùng lúc tại `Home.tsx:608-656`, hơi nhiều emphasis cho một secondary feature.

### Đánh giá

**Visual language đẹp và nhất quán ở cấp component, nhưng tổng thể chưa tối giản: quá nhiều module, shadow, bo góc và spacing lớn khiến trang dễ bị nặng khi scroll.**

### Checklist chỉnh sửa

- [ ] Xác định các module thật sự cần thiết trên home page.
- [ ] Giảm số lượng shadow mạnh; giữ shadow lớn cho hero hoặc CTA chính.
- [ ] Giảm mức độ bo góc ở các card phụ.
- [ ] Rút ngắn khoảng cách dọc giữa các section nếu muốn trang gọn hơn.
- [ ] Cân bằng lại padding lớn và mật độ text nhỏ.

---

## Tổng kết ưu tiên

| Mức độ | Việc nên ưu tiên |
|---|---|
| Cao | Thống nhất font family giữa `index.css` và `theme.css`. |
| Cao | Sửa contrast của button `bg-orange-500`/`bg-sky-500` với text trắng để đạt WCAG AA. |
| Cao | Bổ sung/fallback cho `--bg-card-header` ở light mode. |
| Trung bình | Giảm mật độ `text-[10px]`/`text-[11px]`, đặc biệt ở metadata và insight cards. |
| Trung bình | Tạo hierarchy rõ hơn giữa AQI hero và các section phụ. |
| Trung bình | Giảm số lượng shadow, bo góc lớn và khoảng cách dọc để trang gọn hơn. |

---

## Ghi chú chỉnh sửa cá nhân

> Bạn có thể ghi quyết định, ý tưởng hoặc trạng thái xử lý bên dưới.

- [Tôi đồng ý với cách sửa của bạn trên ] 
- [ Giảm số lượng text `10px`/`11px` ở nội dung này, hiện tại tôi đang để là 4 ý, hãy xóa đi 1 ý và để 3 ý với độ px là lớn hơn 15% để dễ đọc hơn] 
- [ Hết ] 

