# PDF Task Review UI Refactor — Design Document

- Date: 2026-07-29
- Topic: Full UI refactor to Apple-like (macOS) aesthetic
- Status: Approved by user

## 1. Goal

Replace the current plain Tailwind UI with a polished, Apple/macOS-style interface: generous whitespace, soft layered surfaces, rounded cards, pill badges, system font, and light/dark theme support. All pages and components are in scope.

## 2. Design Decisions (approved)

| Decision | Choice |
| --- | --- |
| Aesthetic direction | macOS desktop style (Apple Settings / Apple.com) |
| Theme support | Light + dark, with manual toggle and `prefers-color-scheme` fallback |
| Implementation | Pure Tailwind CSS + CSS variables, no third-party UI library |
| Icon library | `lucide-react` (linear, Apple-feel icons) |
| Scope | Refactor every user-facing page and component; no backend changes |

## 3. Design Tokens

Defined as CSS custom properties in `src/app/globals.css` for `:root` and `.dark`.

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | `#f5f5f7` | `#000000` |
| `--surface` | `#ffffff` | `#1c1c1e` |
| `--surface-secondary` | `#f2f2f7` | `#2c2c2e` |
| `--text-primary` | `#1d1d1f` | `#f5f5f7` |
| `--text-secondary` | `#6e6e73` | `#8e8e93` |
| `--border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)` |
| `--accent` | `#0071e3` | `#0a84ff` |
| `--accent-hover` | `#0077ed` | `#409cff` |
| `--success` | `#34c759` | `#30d158` |
| `--warning` | `#ff9f0a` | `#ffd60a` |
| `--danger` | `#ff3b30` | `#ff453a` |

Additional tokens:
- Font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif`
- Card radius: `18px` (`rounded-2xl`)
- Button/input radius: `10px` (`rounded-lg`)
- Pill radius: `9999px`
- Shadow (light): `0 4px 24px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- Transition: `150ms cubic-bezier(0.4, 0, 0.2, 1)`
- 8px grid; max content widths: list `960px`, review/result `720px`

## 4. Global Layout

- `layout.tsx` renders `bg-[var(--bg)] min-h-screen` and a fixed top toolbar.
- Toolbar is semi-transparent with backdrop blur, contains app title and a theme toggle.
- Content is centered with top padding to clear the toolbar.
- Theme handling is done by a client `ThemeProvider` that:
  - Reads `localStorage` / `prefers-color-scheme` before first paint (via inline script in `<head>` or `useEffect` + `suppressHydrationWarning`)
  - Toggles `dark` class on `<html>`

## 5. Page Designs

### 5.1 Project List (`/`)

- Header row: large title “Projects” on the left, primary blue “上传 PDF” button on the right.
- Empty state: centered, large document icon, muted text, upload prompt.
- Project cards are horizontal white cards:
  - Left: document icon + project name (bold) + original filename (muted)
  - Center: status pill badge, thin progress bar, counts text (共 N · 已通过 X · 暂留 Y · 待处理 Z)
  - Right: action pill button based on status:
    - `READY` → “开始审核”
    - `REVIEWING` → “继续审核”
    - `COMPLETED` → “查看结果”
    - `PARSING` → disabled “解析中…”
    - `FAILED` → red badge + parseError text, no action button
- Cards have hover lift (subtle shadow increase) and focus-visible ring.

### 5.2 Review Page (`/projects/[id]/review/[sequence]`)

- Top toolbar: back arrow + “返回项目列表”, project name centered.
- Progress header: large “第 N / 总条” with thin progress bar and “已处理 X / 总条”.
- Main task card (`Card`):
  - Top row: status pill left, page number right (muted)
  - Large task content text, comfortable line-height, `whitespace-pre-wrap`
- Remark area below card:
  - Label: “备注（暂时遗留时必填，不超过 2000 字）”
  - Styled textarea with focus ring
  - Character count indicator
- Action bar inside/below card, pill buttons:
  - “上一条” / “下一条/跳过”: secondary gray
  - “通过”: blue primary
  - “暂时遗留”: amber subtle
- Saving state disables all buttons and shows “保存中…” on active button.
- Feedback: a small toast/alert below the action bar, `aria-live="polite"`, green for success, red for errors.

### 5.3 Result Page (`/projects/[id]/result`)

- Title: “{projectName} — 审核结果”
- Stats card (`Card`) with 2×2 grid:
  - 任务总数 (neutral)
  - 已通过 (green)
  - 暂时遗留 (amber)
  - 待处理 (gray/red if >0)
- Circular/ring progress indicator + percentage text below.
- If `pendingTasks > 0`: amber banner “已到达最后一条，仍有 N 条待处理。”
- Action buttons:
  - “继续处理待处理任务” (blue, only if pending > 0)
  - “查看暂时遗留任务” (amber, only if deferred > 0)
  - “返回项目列表” (gray secondary)

### 5.4 404 Page (`not-found.tsx`)

- Centered layout with large document/search icon.
- Title “页面或项目不存在”
- Subtle secondary text and “返回项目列表” blue button.

## 6. Component Plan

Create a small UI kit under `src/components/ui/`:

| Component | Responsibility |
| --- | --- |
| `Button.tsx` | Pill/button variants: primary, secondary, success, warning, ghost; loading and disabled states |
| `Badge.tsx` | Status pill badges with semantic colors |
| `Card.tsx` | Rounded surface card with shadow and hover lift |
| `Progress.tsx` | Thin rounded progress bar with percentage |
| `TextArea.tsx` | Styled textarea with label, focus ring, char count |
| `ThemeProvider.tsx` | Client theme initialization, localStorage sync, class toggle |
| `TopBar.tsx` | Fixed app toolbar with title and theme toggle |

Refactor existing components:
- `ProjectCard.tsx`
- `UploadButton.tsx`
- `ReviewClient.tsx`
- `ProjectStatusBadge.tsx` (merge into `Badge` or restyle)
- `TaskStatusBadge.tsx` (merge into `Badge` or restyle)

## 7. Accessibility

- All interactive elements keep visible focus rings (`focus-visible:ring-2 ring-[var(--accent)]`).
- Buttons retain text labels (PRD requirement); icons from Lucide are decorative only.
- `aria-live` region for save feedback remains.
- Progress bars use `role="progressbar"` with `aria-valuenow/min/max`.
- Color is not the sole means of conveying status (text label inside badges).

## 8. Dependencies

- Add `lucide-react` to project dependencies.
- No other new runtime dependencies.

## 9. Implementation & Verification

- Implementation will be executed via the writing-plans skill, task-by-task.
- Each task: code changes + `npm run build` + `npm test` green.
- Final verification: Docker build + run + screenshot saved outside the project folder.

## 10. Out of Scope

- No backend/API changes.
- No new features (OCR, export, multi-user, etc.).
- No animation library; transitions are CSS-only.
