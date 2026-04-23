import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";

interface LastRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  listings_scraped: number;
  listings_scored: number;
  listings_analysed: number;
}

interface ListingRow {
  id: number;
  url: string;
  address: string | null;
  neighbourhood: string | null;
  rooms: number | null;
  living_area_m2: number | null;
  list_price: number | null;
  monthly_fee: number | null;
  total_score: number | null;
}

interface ListingDetail extends ListingRow {
  booli_id: number;
  listing_type: string;
  published_date: string | null;
  municipality: string | null;
  postal_code: string | null;
  brf_name: string | null;
  floor: number | null;
  total_floors: number | null;
  construction_year: number | null;
  price_per_m2: number | null;
  operating_cost: number | null;
  has_balcony: boolean;
  has_patio: boolean;
  has_elevator: boolean;
  has_fireplace: boolean;
  has_storage: boolean;
  showing_date: string | null;
  rule_breakdown: Record<string, number> | null;
  analysis: string | null;
}

interface DbInfo {
  lastModified: string | null;
}

function fmt(n: number | null, suffix = "") {
  if (n == null) return "—";
  return n.toLocaleString("sv-SE") + suffix;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span>—</span>;
  const cls = score >= 70 ? "" : score >= 45 ? " mid" : " low";
  return <span className={`score-badge${cls}`}>{score}</span>;
}

function LastRunPanel({ refresh }: { refresh: number }) {
  const [run, setRun] = useState<LastRun | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/last-run")
      .then((r) => r.json())
      .then(setRun);
  }, [refresh]);

  if (run === undefined) return <div className="card"><h2>Last Run</h2><p className="empty">Loading…</p></div>;

  return (
    <div className="card">
      <h2>Last Run</h2>
      {run == null ? (
        <p className="empty">No runs recorded yet</p>
      ) : (
        <div className="run-grid">
          <div className="run-stat">
            <div className="label">Started</div>
            <div className="value" style={{ fontSize: 14, marginTop: 4 }}>{fmtDate(run.started_at)}</div>
          </div>
          <div className="run-stat">
            <div className="label">Completed</div>
            <div className="value" style={{ fontSize: 14, marginTop: 4 }}>{fmtDate(run.completed_at)}</div>
          </div>
          <div className="run-stat">
            <div className="label">Scraped</div>
            <div className="value">{run.listings_scraped}</div>
          </div>
          <div className="run-stat">
            <div className="label">Scored</div>
            <div className="value">{run.listings_scored}</div>
          </div>
          <div className="run-stat">
            <div className="label">Analysed</div>
            <div className="value">{run.listings_analysed}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingsTable({
  refresh,
  selectedId,
  onSelect,
}: {
  refresh: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/listings")
      .then((r) => r.json())
      .then((data) => { setListings(data); setLoading(false); });
  }, [refresh]);

  return (
    <div className="card">
      <h2>Top Listings</h2>
      {loading ? (
        <p className="empty">Loading…</p>
      ) : listings.length === 0 ? (
        <p className="empty">No listings yet</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Score</th>
                <th>Address</th>
                <th>Neighbourhood</th>
                <th>Rooms</th>
                <th>m²</th>
                <th>Price</th>
                <th>Fee/mo</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr
                  key={l.id}
                  className={`clickable${selectedId === l.id ? " selected" : ""}`}
                  onClick={() => onSelect(l.id)}
                >
                  <td><ScoreBadge score={l.total_score} /></td>
                  <td>
                    <a href={l.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      {l.address ?? "—"}
                    </a>
                  </td>
                  <td>{l.neighbourhood ?? "—"}</td>
                  <td>{fmt(l.rooms)}</td>
                  <td>{fmt(l.living_area_m2)}</td>
                  <td>{fmt(l.list_price, " kr")}</td>
                  <td>{fmt(l.monthly_fee, " kr")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DetailPanel({ id, onClose }: { id: number; onClose: () => void }) {
  const [detail, setDetail] = useState<ListingDetail | null>(null);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then(setDetail);
  }, [id]);

  if (!detail) return <div className="card"><p className="empty">Loading…</p></div>;

  const fields: [string, string][] = [
    ["BRF", detail.brf_name ?? "—"],
    ["Municipality", detail.municipality ?? "—"],
    ["Postal code", detail.postal_code ?? "—"],
    ["Floor", detail.floor != null ? `${detail.floor}${detail.total_floors ? `/${detail.total_floors}` : ""}` : "—"],
    ["Built", detail.construction_year?.toString() ?? "—"],
    ["Price/m²", fmt(detail.price_per_m2, " kr")],
    ["Operating cost", fmt(detail.operating_cost, " kr")],
    ["Showing", fmtDate(detail.showing_date)],
    ["Balcony", detail.has_balcony ? "Yes" : "No"],
    ["Patio", detail.has_patio ? "Yes" : "No"],
    ["Elevator", detail.has_elevator ? "Yes" : "No"],
    ["Fireplace", detail.has_fireplace ? "Yes" : "No"],
    ["Storage", detail.has_storage ? "Yes" : "No"],
  ];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h2>{detail.address ?? "Listing"}</h2>
          <div style={{ color: "#666", fontSize: 12 }}>{detail.neighbourhood} · {detail.rooms} rooms · {detail.living_area_m2} m²</div>
        </div>
        <button onClick={onClose}>✕ Close</button>
      </div>

      <div className="detail-grid">
        {fields.map(([k, v]) => (
          <div className="detail-row" key={k}>
            <div className="key">{k}</div>
            <div className="val">{v}</div>
          </div>
        ))}
      </div>

      {detail.rule_breakdown && (
        <>
          <h2>Score Breakdown — {detail.total_score}/100</h2>
          <div className="breakdown">
            {Object.entries(detail.rule_breakdown).map(([rule, pts]) => (
              <div className="breakdown-row" key={rule}>
                <span>{rule.replace(/_/g, " ")}</span>
                <span className="pts">+{pts}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2>Analysis</h2>
      {detail.analysis ? (
        <div className="analysis-text">{detail.analysis}</div>
      ) : (
        <p className="empty">No analysis available</p>
      )}
    </div>
  );
}

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dbInfo, setDbInfo] = useState<DbInfo>({ lastModified: null });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadDbInfo = useCallback(() => {
    fetch("/api/db-info").then((r) => r.json()).then(setDbInfo);
  }, []);

  useEffect(() => { loadDbInfo(); }, [refreshKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetch("/api/refresh", { method: "POST" });
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  };

  return (
    <>
      <div className="toolbar">
        <h1>Apartment Finder</h1>
        <span className="freshness">
          {dbInfo.lastModified ? `DB: ${fmtDate(dbInfo.lastModified)}` : "No local DB"}
        </span>
        <button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh from R2"}
        </button>
      </div>

      <LastRunPanel refresh={refreshKey} />
      <ListingsTable refresh={refreshKey} selectedId={selectedId} onSelect={setSelectedId} />
      {selectedId != null && (
        <DetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
