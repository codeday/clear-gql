export function roundDecimal(n: number): number {
  return Number(Math.round(Number(n + "e2")) + "e-2")
}
