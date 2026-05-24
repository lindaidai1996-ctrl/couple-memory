# 公共 Modal 组件设计

> 适用范围：后台与设置页中的通用弹窗外壳，优先覆盖删除、停用、二次确认等确认型操作。
>
> 相关文件：
> - [`docs/design/velvet-plum-ui-system/component-tokens.md`](/Users/user/Documents/codes/work/docs/design/velvet-plum-ui-system/component-tokens.md:1)
> - [`src/components/ui/button.tsx`](/Users/user/Documents/codes/work/src/components/ui/button.tsx:1)
> - [`src/components/ui/responsive-drawer.tsx`](/Users/user/Documents/codes/work/src/components/ui/responsive-drawer.tsx:1)
> - [`src/app/globals.css`](/Users/user/Documents/codes/work/src/app/globals.css:1)

## 背景与问题

当前项目已有独立 `modal` 与 `drawer` 用法，但缺少一个可复用、可主题化、适合确认型操作的公共 `Modal` 组件。这会带来几个问题：

- 二次确认弹窗容易在业务文件中重复写遮罩、关闭逻辑、按钮区和层级样式
- 浅色与深色主题的浮层视觉容易不一致
- 未来新增“删除相册”“删除章节”“确认退出”等交互时，缺少统一交互骨架

## 设计目标

1. 提供一个放在 [`src/components/ui`](/Users/user/Documents/codes/work/src/components/ui/) 下的公共 `Modal` 组件。
2. 默认适合确认型场景，内置“取消 + 确认”操作区。
3. 支持通过 props 控制标题、宽度、遮罩、底部按钮区和确认按钮状态。
4. 明确复用现有 Velvet Plum 主题变量与按钮系统，保证浅色和深色主题都成立。

## 非目标

- 不在本次设计中引入 `ConfirmModal`、compound components 或全局 modal manager
- 不处理复杂的弹窗堆叠、焦点陷阱库接入或动画编排系统
- 不在本次设计中直接替换所有已有业务弹窗

## 核心方案

### 1. 单一 `Modal` 组件负责公共外壳

组件职责包括：

- `open` 控制显隐
- `onClose` 处理关闭
- `Esc` 关闭
- 可选遮罩点击关闭
- 标准头部：标题、可选描述、右上角关闭按钮
- 内容区：渲染 `children`
- 默认底部操作区：取消按钮 + 确认按钮

组件通过 `createPortal` 渲染到 `document.body`，与现有 [`ResponsiveDrawer`](/Users/user/Documents/codes/work/src/components/ui/responsive-drawer.tsx:1) 保持一致的挂载方式。

### 2. 确认型底部操作区内置，但允许完全移除

默认底部操作区为：

- 左侧或次级位置：取消按钮
- 右侧主位置：确认按钮

通过 `hideFooter` 可彻底隐藏底部操作区，用于只展示内容、不需要操作栏的场景。

为避免 API 过早复杂化，本次不默认开放完全自定义 `footer` 插槽；若后续出现明显场景，再增补扩展口。

### 3. 宽度和遮罩通过 props 控制

- `width` 支持预设尺寸和自定义值
- `showOverlay` 控制是否渲染遮罩
- `closeOnOverlayClick` 控制点击遮罩是否关闭

这样可以覆盖标准确认弹窗与轻量信息弹窗，而不需要复制容器代码。

## Props 设计

```ts
type ModalWidth = 'sm' | 'md' | 'lg' | 'xl' | number | string

type ModalProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  width?: ModalWidth
  showOverlay?: boolean
  closeOnOverlayClick?: boolean
  hideFooter?: boolean
  cancelText?: string
  confirmText?: string
  onCancel?: () => void
  onConfirm?: () => void | Promise<void>
  confirmVariant?: 'brand' | 'danger' | 'secondary'
  confirmLoading?: boolean
  confirmDisabled?: boolean
}
```

默认行为：

- `width` 默认为 `md`
- `showOverlay` 默认为 `true`
- `closeOnOverlayClick` 默认为 `true`
- `hideFooter` 默认为 `false`
- `onCancel` 未传时，取消按钮执行 `onClose`
- `confirmVariant` 默认为 `brand`

## 视觉与主题规则

组件样式遵循 [`component-tokens.md`](/Users/user/Documents/codes/work/docs/design/velvet-plum-ui-system/component-tokens.md:365) 的 `Modal` 规范：

- 圆角：`24px`
- 内边距：主体 `16px` 到 `18px`
- 背景：使用强层级 panel surface
- 遮罩：柔和 veil，而不是重黑遮罩
- 标题：默认无衬线字体，适合操作型弹窗

实现层面复用现有主题变量：

- 面板背景：`var(--color-warm-surface)` 或对应语义变量
- 边框：`var(--color-warm-border)`
- 正文与弱化文字：`var(--color-warm-text)`、`var(--color-warm-muted)`
- 阴影：对齐全局 dashboard shadow 语言

按钮直接复用 [`Button`](/Users/user/Documents/codes/work/src/components/ui/button.tsx:1)：

- 取消按钮默认 `secondary`
- 删除确认等高风险操作使用 `danger`
- 常规确认使用 `brand`

## 交互规则

- `open=false` 时不渲染 DOM
- 打开时锁定 `document.body` 滚动
- 监听 `Escape` 关闭
- 点击右上角关闭按钮时关闭
- 若 `showOverlay=true` 且 `closeOnOverlayClick=true`，点击遮罩关闭
- `confirmLoading=true` 时确认按钮进入加载态并禁用
- `confirmDisabled=true` 时确认按钮不可点击

## 测试与验证

至少覆盖以下行为：

1. `open=false` 时不渲染
2. `open=true` 时渲染标题与内容
3. 点击关闭按钮触发 `onClose`
4. 按下 `Escape` 触发 `onClose`
5. 点击遮罩时按配置关闭或不关闭
6. 默认展示取消和确认按钮
7. `hideFooter=true` 时不渲染底部操作区
8. `confirmVariant='danger'` 时确认按钮使用危险样式类

人工验证：

1. 浅色主题下遮罩、边框、正文层次清晰，不出现脏灰或漏底
2. 深色主题下弹窗背景足够实，不让底层内容明显穿透
3. 删除确认类场景下，危险按钮视觉层级明确
