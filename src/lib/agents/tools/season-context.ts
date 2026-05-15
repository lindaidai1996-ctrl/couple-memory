export function getSeasonContext(date: Date | null): string {
  if (!date) return ''
  const month = date.getMonth() + 1
  const seasons: Record<number, string> = {
    1: '冬季·大寒', 2: '冬末·立春', 3: '春季·惊蛰',
    4: '春季·清明', 5: '初夏·立夏', 6: '夏季·芒种',
    7: '盛夏·小暑', 8: '夏末·立秋', 9: '秋季·白露',
    10: '秋季·寒露', 11: '冬季·立冬', 12: '冬季·大雪',
  }
  return seasons[month] || ''
}
