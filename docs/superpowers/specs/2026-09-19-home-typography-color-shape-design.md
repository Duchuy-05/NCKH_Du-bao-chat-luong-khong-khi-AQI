# Home.tsx: Implementation Specification cho Typography, Color và Shape

**Nguồn:** [home-typography-color-shape-review.md](./home-typography-color-shape-review.md)  
**Phạm vi:** `frontend/src/pages/Home.tsx` và các token dùng chung liên quan  
**Mục tiêu:** áp dụng audit Section 4.1, Section 4.2, Color Consistency Lock và Shape Consistency Lock mà không đổi information architecture, route, copy, data flow hoặc dependency.

> Spec này là tài liệu đặc tả để triển khai. Chưa có mã nguồn nào được thay đổi khi tạo file này.

## 1. Nguyên tắc không được phá vỡ

Giữ nguyên:

- Route `/`.
- Tên component `Home`, các props và các callback navigation.
- Thứ tự nội dung hiện tại: search/location, hero AQI, forecast, health, notification, pollutants, charts, map và insights.
- Logic dữ liệu, `getAQICategory`, `AQIBadge`, `VietnamMap`, `FadeIn` và các trạng thái tương tác.
- Nội dung song ngữ và các label hiện tại, trừ khi phát hiện lỗi hiển thị trong quá trình test.
- Lucide icons vì project đã dùng `lucide-react`; không thêm icon library mới.

Thay đổi được phép:

- Font/token CSS.
- Tailwind utility về màu, font size, font weight, line-height, radius và shadow.
- Cách cấu hình chart presentation để tôn trọng light/dark theme.
- Bổ sung test/checklist nếu project đã có nơi phù hợp.

## 2. File cần sửa

### Bắt buộc

1. `frontend/src/pages/Home.tsx`
2. `frontend/src/styles/theme.css`

### Nên kiểm tra, chỉ sửa nếu cần

3. `frontend/src/index.css`
4. `frontend/src/App.tsx`

Không tạo dependency mới. Không thay đổi package manifest.

## 3. Token contract mới

### 3.1 Typography tokens

Giữ system sans hiện tại, nhưng đặt tên vai trò rõ trong `frontend/src/index.css` hoặc `frontend/src/styles/theme.css`:

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  --font-size-body: 0.875rem;
  --font-size-meta: 0.75rem;
  --font-size-caption: 0.6875rem;
  --line-height-body: 1.5rem;
  --line-height-meta: 1.25rem;
}
```

Nếu không muốn thêm custom size tokens, dùng trực tiếp Tailwind nhưng phải tuân thủ:

- Nội dung đọc chính: tối thiểu `text-sm`.
- Metadata phụ: `text-xs`.
- `text-[10px]`: chỉ dùng khi thật sự cần cho nhãn không thể dài hơn, không dùng cho body/advice.
- `font-black`: chỉ dùng cho H1 và AQI value.
- Body/subtitle nên có `leading-5` hoặc `leading-6`.

Không thêm `Inter`, `Fira Sans` hoặc serif nếu chưa có yêu cầu brand riêng.

### 3.2 Color tokens

Bổ sung hoặc chuẩn hóa semantic tokens trong `frontend/src/styles/theme.css`:

```css
:root {
  --surface-page: #F8FAFC;
  --surface-card: #FFFFFF;
  --surface-subtle: #F1F5F9;
  --surface-header: #F1F5F9;
  --border-default: #D7E1E5;
  --text-primary: #0F172A;
  --text-secondary: #536671;
  --text-tertiary: #475569;
  --accent-primary: #C2410C;
  --accent-primary-hover: #9A3412;
  --accent-focus: #EA580C;
  --chart-axis: #64748B;
  --chart-grid: #CBD5E1;
  --chart-tooltip-surface: #FFFFFF;
  --chart-tooltip-border: #D7E1E5;
}

.dark {
  --surface-page: #0D171B;
  --surface-card: color-mix(in srgb, var(--surface-page) 95%, white 5%);
  --surface-subtle: color-mix(in srgb, var(--surface-page) 92%, white 8%);
  --surface-header: color-mix(in srgb, var(--surface-page) 90%, white 10%);
  --border-default: color-mix(in srgb, var(--surface-page) 88%, white 12%);
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-tertiary: #94A3B8;
  --accent-primary: #E86F28;
  --accent-primary-hover: #FF9D62;
  --accent-focus: #FDBA74;
  --chart-axis: #CBD5E1;
  --chart-grid: #475569;
  --chart-tooltip-surface: #162329;
  --chart-tooltip-border: #40545C;
}
```

Nếu giữ tên token cũ để giảm phạm vi, tạo alias thay vì đổi tất cả cùng lúc:

```css
:root {
  --bg-primary: var(--surface-page);
  --bg-card: var(--surface-card);
  --bg-card-subtle: var(--surface-subtle);
  --bg-card-header: var(--surface-header);
  --border-color: var(--border-default);
  --text-main: var(--text-primary);
  --text-muted: var(--text-secondary);
}
```

### 3.3 Radius và shadow tokens

Định nghĩa rule theo vai trò:

```css
:root {
  --radius-card: 1rem;
  --radius-control: 0.75rem;
  --radius-badge: 0.5rem;
  --radius-pill: 9999px;
  --shadow-card: 0 1px 3px rgb(15 23 42 / 0.08);
  --shadow-overlay: 0 18px 40px rgb(15 23 42 / 0.16);
}
```

Không bắt buộc phải dùng arbitrary CSS variables trong mọi class. Có thể map bằng utility hiện có:

- Card/hero/chart: `rounded-2xl`.
- Input/select/button/tab group: `rounded-xl`.
- Badge/status/metric chip: `rounded-lg`.
- Risk/status pill: `rounded-full`.
- Overlay autocomplete: `rounded-xl` hoặc `rounded-2xl`, chỉ dùng shadow lớn ở đây.

## 4. Đặc tả thay đổi `Home.tsx`

### 4.1 Search và location bar

Vị trí: khu vực khoảng [Home.tsx:189-246](../../frontend/src/pages/Home.tsx#L189-L246).

Thay đổi:

1. Input:
   - Giữ `text-sm`.
   - Đổi radius về `rounded-xl`.
   - Dùng surface/border token thay vì đồng thời `bg-white`, `border-slate-200`, `surface-border`.
   - Placeholder không dùng `text-slate-400` nếu contrast không đạt; dùng token muted có contrast tối thiểu cho placeholder.
   - Focus ring dùng `accent-focus`, không tạo màu accent mới.
2. Autocomplete:
   - Giữ shadow nổi vì đây là overlay thật, nhưng chỉ overlay được phép dùng shadow lớn.
   - Dùng `rounded-xl` hoặc `rounded-2xl` nhất quán với input.
   - Các divider dùng border token.
3. Location button:
   - Không dùng sky như một CTA brand thứ hai.
   - Ưu tiên `bg-orange-700 hover:bg-orange-800` nếu đây là action chính; nếu muốn phân biệt location là utility, dùng neutral button có border và icon sky.
   - Chọn một trong hai hướng, không trộn theo từng section.
4. Status locating:
   - Dùng text token hoặc sky semantic đủ contrast.
   - Giữ sky chỉ vì nó biểu đạt location/utility.

### 4.2 Hero AQI

Vị trí: khoảng [Home.tsx:254-342](../../frontend/src/pages/Home.tsx#L254-L342).

Thay đổi:

1. Giữ hero là vùng nổi bật nhất.
2. Có thể giữ `rounded-3xl` **chỉ cho hero** nếu ghi rõ đây là ngoại lệ; các card còn lại không dùng `rounded-3xl`.
3. Giảm `shadow-xl` xuống `shadow-card` hoặc `shadow-lg` được tint theo neutral, tránh pure-black shadow.
4. Giữ H1 `font-black`; station ID chuyển về `font-semibold` nếu không phải thông tin chính.
5. AQI value vẫn `font-black`, nhưng không dùng cùng weight/scale cho mọi value phụ.
6. AQI category color lấy từ `getAQICategory` và được xem là semantic exception, không đổi thành accent cam.
7. Health warning giữ category semantic color, nhưng surface và border phải có contrast đủ ở cả light/dark.
8. Mô tả AQI nâng từ `text-xs` lên `text-sm` nếu layout còn đủ chỗ; thêm `leading-6`.

### 4.3 Sáu weather metrics

Vị trí: khoảng [Home.tsx:352-396](../../frontend/src/pages/Home.tsx#L352-L396).

Thay đổi:

1. Nhãn `text-[10px]` chuyển tối thiểu thành `text-xs`, ưu tiên `text-sm` nếu không làm vỡ grid.
2. Nhãn và value dùng semantic text token, không dùng `text-black/60`, `text-white/60`, `text-black/85`, `text-white/85`.
3. Giữ orange tint làm surface phụ vì nó liên quan hero, nhưng không thêm gradient/glow.
4. Metric tile dùng `rounded-xl`, không `rounded-3xl`.
5. Nếu tăng cỡ chữ gây chật mobile, giảm padding hoặc chuyển grid, không quay lại 10px.

### 4.4 Forecast

Vị trí: khoảng [Home.tsx:402-570](../../frontend/src/pages/Home.tsx#L402-L570).

Thay đổi:

1. Giữ desktop table và mobile cards như hiện tại.
2. Card/table wrapper dùng `rounded-2xl`, giảm `shadow-xl` xuống border + `shadow-card`.
3. Header table giữ uppercase nếu cần quét cột, nhưng không dùng uppercase cho body text.
4. Table metadata ngày và weather condition giữ `text-xs` chỉ khi vẫn đạt đọc được; nếu không, dùng `text-sm`.
5. AQI badge giữ category semantic color.
6. Màu nhiệt độ cam và xanh có nghĩa data. Không tính chúng là brand accent mới, nhưng phải dùng cùng token semantic ở toàn page.
7. Empty state button dùng accent primary; không tạo variant xanh riêng.

### 4.5 Health cards và notification

Vị trí health khoảng [Home.tsx:715-780](../../frontend/src/pages/Home.tsx#L715-L780), notification khoảng [Home.tsx:605-700](../../frontend/src/pages/Home.tsx#L605-L700).

Thay đổi:

1. Card health và notification dùng `rounded-2xl`, không dùng `rounded-3xl` cho tất cả card phụ.
2. Giảm `shadow-md`/`shadow-lg` về border + shadow-card khi card không phải overlay.
3. Giữ đỏ/cam cho risk level vì đó là semantic risk.
4. Notification CTA dùng accent primary đậm và phải test contrast ở default/hover/focus/disabled.
5. Không dùng thêm gradient, glow hoặc badge để làm notification nổi hơn hero.
6. Body/description chuyển `text-sm leading-6` nếu đây là câu hướng dẫn người dùng đọc, không phải metadata.

### 4.6 Pollutants

Vị trí: khoảng [Home.tsx:735-790](../../frontend/src/pages/Home.tsx#L735-L790).

Thay đổi:

1. Giữ giá trị pollutant lớn hơn unit/safe limit.
2. Hạ `font-black` của các value phụ xuống `font-bold` hoặc `font-semibold`; chỉ giá trị vượt ngưỡng có thể dùng accent semantic.
3. Metric card dùng `rounded-xl`.
4. Border divider dùng border token.
5. Không dùng màu accent cho mọi pollutant; chỉ dùng màu khi có trạng thái vượt ngưỡng hoặc trend.

### 4.7 Charts

Vị trí: khoảng [Home.tsx:790-930](../../frontend/src/pages/Home.tsx#L790-L930).

Thay đổi:

1. Chart container dùng `rounded-2xl`, `shadow-card`.
2. Thay toàn bộ hard-coded:
   - `#0F172A`
   - `#334155`
   - `#94A3B8`
   - `#F8FAFC`
   bằng CSS variables hoặc giá trị được đọc theo theme.
3. Tooltip:
   - Light: surface sáng, text primary, border default.
   - Dark: surface dark elevated, text primary dark, border dark.
4. Axis/grid:
   - Axis dùng `--chart-axis`.
   - Grid dùng `--chart-grid`.
5. Area/line colors:
   - AQI dùng accent primary hoặc category semantic nếu chart biểu diễn category.
   - PM2.5 và series phụ dùng secondary utility blue, không để blue trở thành CTA accent.
6. Chart axis `fontSize: 11` chỉ giữ nếu sau visual test vẫn đọc rõ; nếu không, tăng lên `12`.
7. Giữ ba tab hiện tại, không thay đổi state hoặc data shape.

### 4.8 Map và insights

Vị trí map khoảng [Home.tsx:930-980](../../frontend/src/pages/Home.tsx#L930-L980), insights khoảng [Home.tsx:980-1070](../../frontend/src/pages/Home.tsx#L980-L1070).

Thay đổi:

1. Button “view full map” dùng accent primary, cùng style với CTA chính khác.
2. Insight cards dùng `rounded-2xl`, `shadow-card` hoặc border.
3. Icon color cam/sky/emerald chỉ giữ khi thể hiện nhóm semantic:
   - Clock: utility/time.
   - Activity: comparison/data.
   - Leaf: health/environment safe.
4. City comparison và advice rows giữ hover state nhưng không thêm shadow lớn.
5. Advice paragraph nâng lên `text-sm` nếu đang là nội dung cần đọc.

## 5. `theme.css` và `index.css`

### `frontend/src/styles/theme.css`

Thực hiện theo thứ tự:

1. Thêm semantic aliases hoặc đổi tên token theo Section 3.
2. Đảm bảo `:root` và `.dark` đều có surface, border, text, accent và chart tokens.
3. Đảm bảo `body`, `.surface-card`, `.surface-card-header`, `.surface-border` dùng cùng token.
4. Không dùng pure `#000000` hoặc pure `#FFFFFF` làm text/surface mới.
5. Shadow token phải có tint slate/neutral, không dùng shadow đen nặng.

### `frontend/src/index.css`

1. Giữ `@theme --font-sans` khớp với `body`.
2. Không khai báo một font khác mà `body` không dùng.
3. Không import Google Fonts từ runtime.

### `frontend/src/App.tsx`

Chỉ sửa nếu visual test cho thấy app shell dùng token khác Home. Mục tiêu là:

- App shell dùng `bg-[var(--surface-page)]`.
- Text mặc định dùng `var(--text-primary)`.
- Không giữ một dark background riêng khác với `theme.css`.

## 6. Thứ tự triển khai đề xuất

### Phase 1: Token foundation

- Chuẩn hóa `theme.css` và `index.css`.
- Chạy build/type-check để phát hiện typo token.

### Phase 2: Shape và surface

- Chuẩn hóa radius/shadow trong `Home.tsx`.
- Không thay đổi typography và layout cùng lúc nếu muốn dễ review diff.

### Phase 3: Typography

- Hạ các `font-black` không cần thiết.
- Tăng weather labels và nội dung đọc quan trọng.
- Kiểm tra mobile để tránh wrap ngoài ý muốn.

### Phase 4: Color và chart theme

- Khóa cam là primary accent.
- Phân loại sky/green/red là semantic.
- Chuyển tooltip/axis/grid sang theme tokens.

### Phase 5: Visual/accessibility verification

- Chạy lint/build.
- Kiểm tra light/dark, desktop/mobile.
- Đo contrast CTA, placeholder, muted text, tooltip và focus ring.

## 7. Tiêu chí nghiệm thu

### Typography

- [ ] Không còn `text-[10px]` cho body, advice hoặc weather label chính.
- [ ] H1 và AQI value là hai nơi chính dùng `font-black`.
- [ ] Body/advice quan trọng dùng tối thiểu `text-sm` và line-height dễ đọc.
- [ ] `font-sans` trong Tailwind và `body` dùng cùng font stack.

### Color

- [ ] Cam là primary accent xuyên suốt Home.
- [ ] Sky chỉ còn ở location/weather/chart hoặc utility có lý do.
- [ ] Đỏ/xanh lá chỉ dùng cho trạng thái semantic.
- [ ] Chart tooltip không còn nền dark hard-coded trong light mode.
- [ ] Không có section tự chuyển sang một palette khác ngoài light/dark theme chung.

### Shape

- [ ] Card/hero/chart dùng một radius card nhất quán.
- [ ] Input/button/control dùng một radius control nhất quán.
- [ ] Badge/status dùng một radius badge/pill nhất quán.
- [ ] Shadow lớn chỉ dùng cho overlay hoặc một hierarchy rõ ràng.

### Accessibility và behavior

- [ ] CTA đạt WCAG AA ở default, hover, focus và disabled.
- [ ] Placeholder, muted text, chart axis đạt contrast phù hợp với cỡ chữ.
- [ ] Không mất focus-visible state.
- [ ] Không đổi callback, navigation, state hoặc data rendering.
- [ ] `prefers-reduced-motion` vẫn được tôn trọng qua `FadeIn` và transitions.

### Regression

- [ ] `npm run lint` trong `frontend` chạy thành công.
- [ ] `npm run build` trong `frontend` chạy thành công.
- [ ] Test light mode ở desktop khoảng 1280px.
- [ ] Test dark mode ở desktop khoảng 1280px.
- [ ] Test mobile khoảng 390px.
- [ ] Test search autocomplete, empty forecast, notification CTA và ba chart tabs.

## 8. Những việc không nằm trong spec này

- Không đổi API/backend/mock data.
- Không đổi route hoặc navigation label.
- Không thay toàn bộ dashboard bằng design system mới.
- Không thêm animation mới chỉ để trang “trông đẹp hơn”.
- Không thêm ảnh, gradient lớn, glassmorphism hoặc font serif.
- Không đổi semantic AQI colors thành một màu duy nhất nếu việc đó làm mất ý nghĩa cảnh báo.
