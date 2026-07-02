/** `chrome.storage.sync` map: course unit id → chosen credits for variable-credit courses. */
export const TIMELINE_VARIABLE_CREDIT_STORAGE_KEY = 'timelineVariableCourseCredits'

export function isVariableCreditRange(creditsMin: number, creditsMax: number): boolean {
  return creditsMax !== creditsMin
}

export function defaultVariablePlannedCredits(creditsMin: number, creditsMax: number): number {
  return creditsMax === creditsMin
    ? creditsMax
    : Math.round((creditsMax + creditsMin) / 2)
}

function clampCredits(n: number, creditsMin: number, creditsMax: number): number {
  return Math.min(creditsMax, Math.max(creditsMin, n))
}

export function creditChoiceIsUserSet(id: string, overrides: Record<string, number>): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, id)
}

export function resolvePlannedCredits(
  id: string,
  creditsMin: number,
  creditsMax: number,
  overrides: Record<string, number>
): number {
  if (!isVariableCreditRange(creditsMin, creditsMax)) {
    return creditsMax
  }
  if (creditChoiceIsUserSet(id, overrides)) {
    return clampCredits(Math.round(overrides[id]!), creditsMin, creditsMax)
  }
  return defaultVariablePlannedCredits(creditsMin, creditsMax)
}

export function applyPlannedCreditOverrides<
  T extends { id: string; creditsMin: number; creditsMax: number; plannedCredits: number },
>(selections: T[], overrides: Record<string, number>): T[] {
  return selections.map((s) => ({
    ...s,
    plannedCredits: resolvePlannedCredits(s.id, s.creditsMin, s.creditsMax, overrides),
  }))
}

export function normalizeStoredOverrides(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v
    }
  }
  return out
}

export async function loadTimelineVariableCreditOverrides(): Promise<Record<string, number>> {
  const data = await chrome.storage.sync.get(TIMELINE_VARIABLE_CREDIT_STORAGE_KEY)
  return normalizeStoredOverrides(data[TIMELINE_VARIABLE_CREDIT_STORAGE_KEY])
}

export async function setTimelineVariableCreditOverride(
  courseId: string,
  credits: number
): Promise<Record<string, number>> {
  const prev = await loadTimelineVariableCreditOverrides()
  const next = { ...prev, [courseId]: Math.round(credits) }
  await chrome.storage.sync.set({ [TIMELINE_VARIABLE_CREDIT_STORAGE_KEY]: next })
  return next
}
