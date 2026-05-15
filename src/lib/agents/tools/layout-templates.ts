export const LAYOUT_TEMPLATES = {
  'cinema-wide': { name: '宽幅电影感', condition: '宽高比 > 1.5，风景/城市场景' },
  'side-by-side': { name: '图文并排', condition: '任意比例，有故事性的照片' },
  'portrait-hero': { name: '竖构图大图', condition: '宽高比 < 0.8，人像特写' },
  'grid-square': { name: '方格组合', condition: '宽高比接近 1:1' },
  'story-card': { name: '卡片式', condition: '任意比例，适合社交分享' },
} as const

export type LayoutTemplate = keyof typeof LAYOUT_TEMPLATES
