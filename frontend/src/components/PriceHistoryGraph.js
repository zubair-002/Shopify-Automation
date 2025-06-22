import React, { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";


const overlay = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000
};

const modal = {
  position: "relative",
  background: "#fff",
  padding: 20,
  borderRadius: 8,
  width: "90%",
  maxWidth: 650,
  boxShadow: "0 0 10px rgba(0,0,0,0.25)",
};

const closeBtnStyle = {
  position: "absolute",
  top: 10,
  right: 16,
  background: "transparent",
  border: "none",
  fontSize: 28,
  cursor: "pointer",
  color: "#764ba2"
};

const graphWidth = 600;
const graphHeight = 260;
const padding = 48;

const PriceHistoryGraph = ({ alertId, onClose }) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alertId) return;
    setLoading(true);
    fetch(`http://localhost:5000/price_history/${alertId}`)
      .then(res => res.json())
      .then(data => {
        setPriceHistory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [alertId]);

  if (loading) return (
    <div style={overlay}>
      <div style={modal}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        <div>Loading...</div>
      </div>
    </div>
  );
  if (!priceHistory.length) return (
    <div style={overlay}>
      <div style={modal}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        <div>No price history data.</div>
      </div>
    </div>
  );

  // Compute scales
  const prices = priceHistory.map(p => p.price);
  const dates = priceHistory.map(p => new Date(p.timestamp));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDate = Math.min(...dates.map(d => d.getTime()));
  const maxDate = Math.max(...dates.map(d => d.getTime()));

  // Scale functions
  const xScale = (date) =>
    padding +
    ((new Date(date).getTime() - minDate) / (maxDate - minDate || 1)) *
      (graphWidth - 2 * padding);
  const yScale = (price) =>
    graphHeight -
    padding -
    ((price - minPrice) / (maxPrice - minPrice || 1)) *
      (graphHeight - 2 * padding);

  // Build points string for polyline
  const points = priceHistory
    .map(p => `${xScale(p.timestamp)},${yScale(p.price)}`)
    .join(" ");

  return (
    <div style={overlay}>
      <div style={modal}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        <h3 style={{ color: "#764ba2" }}>Price History Graph</h3>
        <svg width={graphWidth} height={graphHeight} style={{ background: "#222", borderRadius: 8 }}>
          {/* Axes */}
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={graphHeight - padding}
            stroke="#888"
            strokeWidth={2}
          />
          <line
            x1={padding}
            y1={graphHeight - padding}
            x2={graphWidth - padding}
            y2={graphHeight - padding}
            stroke="#888"
            strokeWidth={2}
          />

          {/* Polyline */}
          <polyline
            fill="none"
            stroke="#7c4dff"
            strokeWidth={3}
            points={points}
          />

          {/* Price points */}
          {priceHistory.map((p, i) => (
            <circle
              key={i}
              cx={xScale(new Date(p.timestamp))}
              cy={yScale(p.price)}
              r={4}
              fill="#7c4dff"
            />
          ))}

          {/* Labels */}
          <text
            x={padding}
            y={padding - 10}
            fill="#aaa"
            fontSize="12"
          >
            {maxPrice.toFixed(2)}
          </text>
          <text
            x={padding}
            y={graphHeight - padding + 20}
            fill="#aaa"
            fontSize="12"
          >
            {dates.length ? dates[0].toLocaleDateString() : ""}
          </text>
          <text
            x={graphWidth - padding - 80}
            y={graphHeight - padding + 20}
            fill="#aaa"
            fontSize="12"
          >
            {dates.length ? dates[dates.length - 1].toLocaleDateString() : ""}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default PriceHistoryGraph;
