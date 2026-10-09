// Matches Aalto course codes in free text (e.g. Sisu prerequisites). Verified to match every
// course code synced from Sisu, while not matching things like "MS-A050X", "COVID-19" or "B1.2".
// Matches may still be codes of old courses that are no longer in the database.
const COURSE_CODE_PATTERNS = [
  '[A-Z]{2,5}\\d?-[A-Z]{1,4}\\d{1,7}', // CS-A1110, ELEC-E7130, MNGT1-L1001, JOI-SCI25
  '[A-Z]{2,4}-\\d{3,4}(?:\\.\\d{4})?', // MUO-3032, PED-131.9300
  '[A-Z]{2,5}-(?:CV|EV|EF|LV|PV|VV|ARTS|ELEC|ENG)', // ELEC-EV, ABR-ARTS
  '[A-Z]{1,3}\\d{3}[A-Z]-LZ', // F006Z-LZ
  '(?:[A-Z]|[A-Z]{3})?\\d{2}[A-Z]\\d{3,8}', // 31E00500, A21E16001, MLI26C664
  // ARTS.ark.kand, MARK.20.thes, SCI020Z.lict, ARTS3101.MATR, AXM.thes-2. Sisu has a code with a trailing dot.
  '[A-Z]{1,5}\\d{0,4}[A-Za-z]?(?:\\.[a-z0-9]+)*\\.(?:[a-z][a-z0-9]*|[A-Z]{4})(?:-\\d)?\\.?',
]

// Codes are often glued to the next sentence in Sisu ("ELO-E1030Recommended prerequisites"),
// so a following capitalized word is allowed, but not a trailing letter/wildcard ("MS-A050X", "MS-A050*").
export const COURSE_CODE_REGEX = new RegExp(
  `(?<![A-Za-z0-9])(?:${COURSE_CODE_PATTERNS.join('|')})(?![a-z0-9*]|[A-Z](?![a-z]))`,
  'g',
)

/** Unique course code candidates in the text, including variants without a trailing dot. */
export const findCourseCodes = (text: string): string[] => {
  const codes = new Set<string>()
  for (const [match] of text.matchAll(COURSE_CODE_REGEX)) {
    codes.add(match)
    if (match.endsWith('.')) codes.add(match.slice(0, -1))
  }
  return [...codes]
}
