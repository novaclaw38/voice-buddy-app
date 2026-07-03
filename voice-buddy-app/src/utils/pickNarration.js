export function pickNarration(step, childAge) {
  if (childAge <= 6 && step.narrationYoung) return step.narrationYoung
  const pool = step.narrations?.length ? step.narrations : [step.narration]
  return pool[Math.floor(Math.random() * pool.length)]
}
