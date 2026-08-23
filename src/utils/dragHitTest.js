export function findTargetAtPoint(point, targetRects) {
  for (const [targetId, rect] of Object.entries(targetRects)) {
    if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
      return targetId
    }
  }
  return null
}
