/**
 * Strip common non-IUPAC qualifiers from a chemical name so PubChem lookups
 * succeed for names like "Xylenes, certified ACS grade" or "Acetone (99%)".
 * The original name should still be stored; this is only for lookup fallbacks.
 */
export function cleanChemicalName(raw: string): string {
  return raw
    // purity in parens: (99%), (≥99.9%), (>98%)
    .replace(/\s*\([≥>]?\d+\.?\d*\s*%\)/g, '')
    // concentration + solvent: "25% in water", "10 wt% in toluene"
    .replace(/\s+\d+\.?\d*\s*(?:wt)?%\s+in\s+\S+/gi, '')
    // grade qualifiers after comma: ", ACS grade", ", certified HPLC grade", ", reagent grade"
    .replace(/,\s*(?:certified\s+)?(?:[A-Z]{2,5}|reagent|analytical|technical|spectroscopic)\s+grade\b.*/gi, '')
    // standalone "certified" suffix
    .replace(/,\s+certified\b.*/i, '')
    // trailing "anhydrous" / "absolute" modifiers
    .replace(/,\s*(?:anhydrous|absolute|monohydrate|dihydrate|trihydrate)\b.*/i, '')
    // same modifiers with or without a comma: "Ethyl alcohol absolute", "Sodium sulfate anhydrous", "Ethyl alcohol, denatured"
    .replace(/[,\s]+(?:absolute|anhydrous|denatured|dehydrated|extra\s+dry)\b.*$/gi, '')
    // "absolute" run together with digits: "absolute200" → "absolute"
    .replace(/\babsolute\d+\b/gi, 'absolute')
    // "for synthesis", "for analysis" suffixes
    .replace(/\s+for\s+(?:synthesis|analysis|HPLC|GC)\b.*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}
