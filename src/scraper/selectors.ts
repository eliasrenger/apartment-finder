// CSS selectors for booli.se pages.
// NOTE: These selectors target the live booli.se DOM and must be validated
// against the real site. The HTML fixtures in tests/fixtures/ are constructed
// to match these selectors exactly.

// ---------------------------------------------------------------------------
// Search results page
// ---------------------------------------------------------------------------

// All listing links on a search results page.
// booli.se listing hrefs always start with /bostad/ or /annons/
export const SEARCH_LISTING_HREF = 'a[href^="/bostad/"], a[href^="/annons/"]';

// ---------------------------------------------------------------------------
// Detail page — identity
// ---------------------------------------------------------------------------

export const DETAIL_ADDRESS       = '[data-testid="address"]';
export const DETAIL_NEIGHBOURHOOD = '[data-testid="neighbourhood"]';
export const DETAIL_MUNICIPALITY  = '[data-testid="municipality"]';
export const DETAIL_POSTAL_CODE   = '[data-testid="postalCode"]';
export const DETAIL_BRF_NAME      = '[data-testid="brfName"]';

// ---------------------------------------------------------------------------
// Detail page — physical characteristics
// ---------------------------------------------------------------------------

export const DETAIL_LIVING_AREA       = '[data-testid="livingArea"]';
export const DETAIL_ROOMS             = '[data-testid="rooms"]';
export const DETAIL_FLOOR             = '[data-testid="floor"]';
export const DETAIL_TOTAL_FLOORS      = '[data-testid="totalFloors"]';
export const DETAIL_CONSTRUCTION_YEAR = '[data-testid="constructionYear"]';

// ---------------------------------------------------------------------------
// Detail page — financials
// ---------------------------------------------------------------------------

export const DETAIL_LIST_PRICE        = '[data-testid="listPrice"]';
export const DETAIL_PRICE_PER_M2      = '[data-testid="pricePerM2"]';
export const DETAIL_MONTHLY_FEE       = '[data-testid="monthlyFee"]';
export const DETAIL_OPERATING_COST    = '[data-testid="operatingCost"]';
export const DETAIL_ESTIMATE_LOW      = '[data-testid="estimateLow"]';
export const DETAIL_ESTIMATE_MID      = '[data-testid="estimateMid"]';
export const DETAIL_ESTIMATE_HIGH     = '[data-testid="estimateHigh"]';

// ---------------------------------------------------------------------------
// Detail page — amenities (presence indicates true)
// ---------------------------------------------------------------------------

export const DETAIL_HAS_BALCONY   = '[data-testid="amenity-balcony"]';
export const DETAIL_HAS_PATIO     = '[data-testid="amenity-patio"]';
export const DETAIL_HAS_ELEVATOR  = '[data-testid="amenity-elevator"]';
export const DETAIL_HAS_FIREPLACE = '[data-testid="amenity-fireplace"]';
export const DETAIL_HAS_STORAGE   = '[data-testid="amenity-storage"]';

// ---------------------------------------------------------------------------
// Detail page — dates
// ---------------------------------------------------------------------------

export const DETAIL_PUBLISHED_DATE = '[data-testid="publishedDate"]';
export const DETAIL_SHOWING_DATE   = '[data-testid="showingDate"]';
