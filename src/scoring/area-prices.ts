/**
 * Static Stockholm area price data (2024–2025 figures, SEK/m²).
 * Update cadence: annual review — prices move slowly enough that stale data
 * is acceptable for scoring purposes.
 */

/** Average price per m² (SEK) for each Stockholm district. Tier 1–5. */
export const DISTRICT_PRICES: Record<string, number> = {
  // Tier 1 — premium inner city (≥100 000 SEK/m²)
  Östermalm: 120_000,
  Vasastan: 115_000,
  Södermalm: 112_000,
  Norrmalm: 108_000,

  // Tier 2 — inner city (80 000–100 000 SEK/m²)
  Kungsholmen: 96_000,
  "Gamla Stan": 92_000,
  "Hammarby Sjöstad": 88_000,
  Lidingö: 85_000,

  // Tier 3 — near-city (60 000–80 000 SEK/m²)
  Bromma: 76_000,
  Hägersten: 72_000,
  "Midsommarkransen": 70_000,
  Johanneshov: 68_000,
  Liljeholmen: 78_000,
  "Enskede-Årsta": 65_000,
  Sundbyberg: 65_000,
  Solna: 62_000,

  // Tier 4 — suburban (40 000–60 000 SEK/m²)
  Skarpnäck: 55_000,
  Bandhagen: 52_000,
  Farsta: 48_000,
  Vällingby: 46_000,
  Hässelby: 46_000,

  // Tier 5 — outer suburbs (<40 000 SEK/m²)
  Spånga: 38_000,
  Kista: 35_000,
  Rinkeby: 30_000,
  Tensta: 30_000,
  Skärholmen: 32_000,
  Husby: 33_000,
};

/**
 * Maps granular Booli sub-neighbourhood names to their parent district.
 * Covers the most common ~50 names; unrecognised names fall back to postal code.
 */
export const NEIGHBOURHOOD_ALIASES: Record<string, string> = {
  // Södermalm sub-areas
  SoFo: "Södermalm",
  Hornstull: "Södermalm",
  Zinkensdamm: "Södermalm",
  Mariatorget: "Södermalm",
  Medborgarplatsen: "Södermalm",
  Katarina: "Södermalm",
  Mosebacke: "Södermalm",
  Nytorget: "Södermalm",
  Slussen: "Södermalm",
  Tantolunden: "Södermalm",
  Folkungagatan: "Södermalm",
  Skanstull: "Södermalm",
  Götgatsbacken: "Södermalm",

  // Vasastan sub-areas
  Odenplan: "Vasastan",
  Rörstrand: "Vasastan",
  Sabbatsberg: "Vasastan",
  Birkastan: "Vasastan",
  Observatorielunden: "Vasastan",
  "S:t Eriksplan": "Vasastan",
  "Sankt Eriksplan": "Vasastan",

  // Östermalm sub-areas
  Gärdet: "Östermalm",
  Karlaplan: "Östermalm",
  Diplomatstaden: "Östermalm",
  Ladugårdsgärdet: "Östermalm",
  Hjorthagen: "Östermalm",
  Linnégatan: "Östermalm",
  Strandvägen: "Östermalm",
  Östermalmstorg: "Östermalm",

  // Kungsholmen sub-areas
  Fridhemsplan: "Kungsholmen",
  Stadshagen: "Kungsholmen",
  Kristineberg: "Kungsholmen",
  "Västra Kungsholmen": "Kungsholmen",
  Hornsbergs: "Kungsholmen",

  // Norrmalm sub-areas
  Hötorget: "Norrmalm",
  Kungsgatan: "Norrmalm",
  Klara: "Norrmalm",
  "City/Norrmalm": "Norrmalm",

  // Hammarby Sjöstad
  "Hammarby sjöstad": "Hammarby Sjöstad",
  "Hammarby Sjöstad": "Hammarby Sjöstad",
  Sjöstaden: "Hammarby Sjöstad",

  // Liljeholmen
  Årstadal: "Liljeholmen",
  Telefonplan: "Liljeholmen",

  // Hägersten
  "Hägersten-Älvsjö": "Hägersten",
  Älvsjö: "Hägersten",
  Fruängen: "Hägersten",

  // Bromma sub-areas
  Alvik: "Bromma",
  Abrahamsberg: "Bromma",
  Blackeberg: "Bromma",
  Riksby: "Bromma",
  "Stora Mossen": "Bromma",

  // Farsta
  "Farsta Strand": "Farsta",
};

/**
 * Maps the first 3 digits of a Swedish postal code (spaces removed) to a
 * Stockholm district. Covers codes 100–165 (central to inner suburbs).
 */
export const POSTAL_PREFIX_DISTRICTS: Record<string, string> = {
  // Inner city
  "100": "Norrmalm",
  "101": "Norrmalm",
  "102": "Södermalm",
  "103": "Norrmalm",
  "104": "Kungsholmen",
  "105": "Kungsholmen",
  "106": "Kungsholmen",
  "107": "Kungsholmen",
  "108": "Södermalm",
  "111": "Norrmalm",
  "112": "Kungsholmen",
  "113": "Vasastan",
  "114": "Östermalm",
  "115": "Östermalm",
  "116": "Södermalm",
  "117": "Södermalm",
  "118": "Södermalm",
  "119": "Södermalm",
  // Near-city
  "120": "Johanneshov",
  "121": "Bromma",
  "122": "Sundbyberg",
  "123": "Farsta",
  "124": "Bandhagen",
  "125": "Hägersten",
  "126": "Hägersten",
  "127": "Skärholmen",
  "128": "Skärholmen",
  "129": "Midsommarkransen",
  // Suburbs
  "161": "Solna",
  "162": "Solna",
  "163": "Spånga",
  "164": "Kista",
  "165": "Vällingby",
  "168": "Bromma",
};

/**
 * Last-resort per-municipality average price (SEK/m²).
 * Used when neighbourhood and postal code both fail to resolve.
 */
export const MUNICIPALITY_PRICES: Record<string, number> = {
  Stockholm: 75_000,
  Sundbyberg: 65_000,
  Solna: 62_000,
  Lidingö: 85_000,
  Nacka: 80_000,
  Danderyd: 88_000,
};
