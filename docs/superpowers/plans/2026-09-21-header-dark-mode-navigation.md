# Header Dark Mode & Navigation Styling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển nền thanh điều hướng sang màu tối mờ (dark slate translucent) ở chế độ Dark Mode, in đậm chữ điều hướng mặc định, loại bỏ toàn bộ icon bên trái các mục điều hướng (desktop & mobile), và thêm hiệu ứng gạch chân màu cam mượt mà khi hover.

**Architecture:** Tinh chỉnh trực tiếp component `Header.tsx` bằng Tailwind CSS v4. Sửa lỗi cú pháp độ mờ `dark:bg-slate-900/` thành `dark:bg-slate-900/80`, tăng độ tương phản và cỡ chữ với `font-bold`, gỡ bỏ hoàn toàn việc import và render các icon bên trái mục điều hướng, đồng thời thêm thanh indicator gạch chân động `scale-x-0 group-hover:scale-x-100` ở đáy mỗi nút điều hướng.

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS v4, Lucide React, Vite

**Spec:** [Design Proposal in Conversation](file:///C:/.Study%20at%20Home/.NCKH/NCKH/frontend/src/components/Header.tsx)

## Global Constraints

- Không làm ảnh hưởng đến các tính năng khác trên Header: chuyển trang qua React Router (`navigate`), chuyển đổi theme Dark/Light (`useTheme`), chuyển ngôn ngữ VN/EN (`useLanguage`), và menu mobile toggle.
- Giữ nguyên thiết kế nhận diện thương hiệu Air VN (màu cam `orange-500` làm điểm nhấn, font bo tròn hiện đại).
- Phải vượt qua TypeScript type check (`npm run lint` / `tsc --noEmit`).

## Review Focus

1. **Hiển thị Dark Mode:** Thanh capsule ở Dark Mode phải có màu tối mờ đồng nhất, không còn viền trắng hoặc nền sáng lóa.
2. **Hiệu ứng Hover:** Khi rê chuột vào từng mục điều hướng, thanh gạch chân màu cam bo góc (2px) phải trượt/bung ra mượt mà và biến mất khi rời chuột.
3. **Trạng thái Active:** Mục đang chọn (ví dụ "Bản đồ AQI") phải giữ pill nền nổi bật rõ ràng, không bị xung đột với hiệu ứng hover.
4. **Font chữ:** Tất cả chữ điều hướng phải đậm rõ ràng (`font-bold`) ngay cả khi chưa hover.
5. **Mobile Drawer:** Menu mobile không còn hiển thị icon thừa, hiển thị text canh chỉnh cân đối.

---

### Task 1: Dọn dẹp Icon và cập nhật dữ liệu `navItems` trong Header

**Files:**
- Modify: `frontend/src/components/Header.tsx:6-43`

**Interfaces:**
- Consumes: Lucide React icons (`Sun`, `Moon`, `Globe`, `Menu`, `X`), React hooks
- Produces: Mảng `navItems` tinh gọn chỉ chứa `id`, `path`, `labelKey` (loại bỏ thuộc tính `icon`)

- [ ] **Step 1: Cập nhật import và định nghĩa `navItems`**

Trong file `frontend/src/components/Header.tsx`:
- Bỏ các icon không còn dùng: `Wind`, `ShieldAlert`, `Compass`, `Calendar`, `Info` khỏi dòng import `lucide-react`.
- Cập nhật mảng `navItems` để bỏ thuộc tính `icon`:

```tsx
// frontend/src/components/Header.tsx dòng 6:
import { Sun, Moon, Globe, Menu, X } from 'lucide-react';

// Dòng 37-43:
  const navItems = [
    { id: 'home', path: '/', labelKey: 'nav.home' },
    { id: 'maps', path: '/maps', labelKey: 'nav.maps' },
    { id: 'forecast', path: '/forecast', labelKey: 'nav.forecast' },
    { id: 'alerts', path: '/alerts', labelKey: 'nav.alerts' },
    { id: 'about', path: '/about', labelKey: 'nav.about' },
  ];
```

- [ ] **Step 2: Chạy kiểm tra TypeScript**

Chạy lệnh kiểm tra type trong thư mục `frontend`:
```powershell
npm run lint
```
(Lưu ý: Lúc này sẽ có lỗi type tạm thời do dòng 85 và 158 vẫn đang truy cập `item.icon`. Sang Task 2 và 3 sẽ xử lý hết.)

---

### Task 2: Cập nhật giao diện Desktop Navigation (Nền tối, Chữ đậm, Bỏ icon, Gạch chân Hover)

**Files:**
- Modify: `frontend/src/components/Header.tsx:82-101`

**Interfaces:**
- Consumes: `navItems`, `activePage`, `handleNavClick`, `t`
- Produces: Thanh navigation desktop với capsule dark theme hoàn chỉnh và hiệu ứng gạch chân hover

- [ ] **Step 1: Triển khai giao diện mới cho Desktop Navigation**

Thay thế khối `<nav ...>` desktop (tại dòng 82-101) bằng đoạn mã sau:

```tsx
        {/* Desktop Navigation Links - Cột giữa (Capsule mờ bo tròn hoàn toàn) */}
        <nav className="hidden lg:flex items-center justify-center p-1 rounded-full bg-white/70 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs gap-1 justify-self-center">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`relative group overflow-hidden flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${isActive
                  ? 'bg-slate-100 dark:bg-slate-800/90 text-orange-500 dark:text-orange-400 shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                  }`}
              >
                <span className="whitespace-nowrap z-10">{t(item.labelKey)}</span>
                {!isActive && (
                  <span className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 ease-out origin-center" />
                )}
              </button>
            );
          })}
        </nav>
```

- [ ] **Step 2: Xác minh cú pháp và giao diện desktop**

Kiểm tra:
1. `dark:bg-slate-900/80` thay thế cho lỗi `dark:bg-slate-900/`.
2. Không còn thẻ `<Icon ... />`.
3. Có `font-bold` cho tất cả các nút.
4. Thẻ `<span className="absolute bottom-1 ...">` tạo gạch chân chuyển động khi hover cho các nút chưa active.

---

### Task 3: Cập nhật giao diện Mobile Drawer Navigation (Bỏ icon, Chữ đậm)

**Files:**
- Modify: `frontend/src/components/Header.tsx:154-177`

**Interfaces:**
- Consumes: `navItems`, `activePage`, `handleNavClick`, `t`
- Produces: Danh sách điều hướng trên Mobile Drawer gọn gàng, không còn icon

- [ ] **Step 1: Triển khai giao diện mới cho Mobile Drawer**

Thay thế khối `<nav ...>` trong Mobile Drawer bằng:

```tsx
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-bold cursor-pointer transition-colors ${isActive
                    ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white'
                    }`}
                >
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>
```

- [ ] **Step 2: Chạy kiểm tra TypeScript và Build**

Chạy kiểm tra trong thư mục `frontend`:
```powershell
npm run lint
```
Kỳ vọng: Không có lỗi type nào (`tsc --noEmit` hoàn thành thành công).

---

### Task 4: Kiểm thử giao diện trực quan và hoàn tất

**Files:**
- Inspect: `frontend/src/components/Header.tsx`

- [ ] **Step 1: Kiểm thử giao diện Dark Mode**
- Mở ứng dụng trong trình duyệt, bật chế độ Dark Mode.
- Kiểm tra thanh điều hướng: Nền có màu tối mờ (`bg-slate-900/80`), không còn nền trắng sáng lóa.
- Kiểm tra chữ: Đậm sắc nét (`font-bold`), dễ đọc trên nền tối.

- [ ] **Step 2: Kiểm thử hiệu ứng Hover và Active**
- Rê chuột vào các mục "Trang chủ", "Dự báo 7 ngày", "Cảnh báo sức khỏe", "Về chúng tôi": gạch chân mảnh màu cam 2px xuất hiện mượt mà ở đáy nút.
- Bấm chọn một mục: mục đó trở thành active (nền pill xám/slate tối, chữ cam). Nút active không hiển thị gạch chân thừa.

- [ ] **Step 3: Kiểm thử menu Mobile**
- Thu nhỏ màn hình hoặc bật chế độ responsive (mobile view).
- Mở menu hamburger: Các mục điều hướng hiển thị chữ đậm rõ ràng, không còn icon bên trái.

- [ ] **Step 4: Commit thay đổi vào git**
```bash
git add frontend/src/components/Header.tsx docs/superpowers/plans/2026-09-21-header-dark-mode-navigation.md
git commit -m "fix(ui): update header dark mode background, bold nav text, remove nav icons and add hover underline"
```
