/**
 * Curated aliases for chemical names that do NOT resolve on PubChem's
 * compound/name endpoint. Two situations are covered:
 *
 *  1. Common abbreviations / mild misspellings (DCM, THF, MeOH). The compound
 *     they point to IS the same substance, so we let the resolved PubChem title
 *     replace the original name during standardization (keepName left false).
 *
 *  2. Genuine mixtures with no single compound CID (xylenes, petroleum ether).
 *     We resolve to a representative isomer/component purely to pull an SDS link
 *     and GHS hazards — the hazards of the isomers are effectively identical — but
 *     we must NOT rename the entry to that component, so keepName is true.
 *
 * Keys are matched against the lowercased, trimmed name (and its cleaned form).
 */
export interface LookupAlias {
  /** A query string that PubChem's name endpoint can resolve. */
  query: string
  /** When true, keep the user's original name instead of the resolved title. */
  keepName?: boolean
}

export const LOOKUP_ALIASES: Record<string, LookupAlias> = {
  // --- Mixtures: resolve for hazards/SDS only, keep the original name ---
  'xylene': { query: 'p-xylene', keepName: true },
  'xylenes': { query: 'p-xylene', keepName: true },
  'petroleum ether': { query: 'pentane', keepName: true },
  'pet ether': { query: 'pentane', keepName: true },
  'ligroin': { query: 'heptane', keepName: true },
  'mineral spirits': { query: 'nonane', keepName: true },
  'hexanes': { query: 'hexane', keepName: true },
  'pentanes': { query: 'pentane', keepName: true },
  'cresol': { query: 'm-cresol', keepName: true },
  'cresols': { query: 'm-cresol', keepName: true },

  // --- Abbreviations / shorthand: let the PubChem title expand them ---
  'dcm': { query: 'dichloromethane' },
  'dmf': { query: 'N,N-dimethylformamide' },
  'dmso': { query: 'dimethyl sulfoxide' },
  'thf': { query: 'tetrahydrofuran' },
  'meoh': { query: 'methanol' },
  'etoh': { query: 'ethanol' },
  'iproh': { query: 'isopropyl alcohol' },
  'ipa': { query: 'isopropyl alcohol' },
  'mecn': { query: 'acetonitrile' },
  'acn': { query: 'acetonitrile' },
  'et2o': { query: 'diethyl ether' },
  'etoac': { query: 'ethyl acetate' },
  'acoh': { query: 'acetic acid' },
  'tfa': { query: 'trifluoroacetic acid' },
  'nmp': { query: 'N-methyl-2-pyrrolidone' },
  'dmac': { query: 'N,N-dimethylacetamide' },
  'dce': { query: '1,2-dichloroethane' },
}

/** Look up an alias by raw or cleaned name (both lowercased/trimmed). */
export function findAlias(raw: string, cleaned: string): LookupAlias | undefined {
  return LOOKUP_ALIASES[raw.toLowerCase().trim()] ?? LOOKUP_ALIASES[cleaned.toLowerCase().trim()]
}
