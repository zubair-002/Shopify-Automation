import React, { useState, useEffect } from "react";

// Inline PriceHistoryGraph modal component
const PriceHistoryGraph = ({ alertId, onClose }) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!alertId) return;

    setLoading(true);
    fetch(`http://localhost:5000/price_history/${alertId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch price history");
        return res.json();
      })
      .then((data) => {
        setPriceHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error fetching price history");
        setLoading(false);
      });
  }, [alertId]);

  // Simple line graph with SVG (you can replace with Chart.js or other libs)
  // Assumes priceHistory is [{ date: "2025-05-26", price: 123.45 }, ...]
  const graphWidth = 600;
  const graphHeight = 300;
  const padding = 40;

  if (loading) return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        <p>Loading price history...</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    </div>
  );

  if (!priceHistory.length) return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        <p>No price history data available.</p>
      </div>
    </div>
  );

  // Compute scales
  const prices = priceHistory.map(p => p.price);
  const dates = priceHistory.map(p => new Date(p.date));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);

  // Scale functions
  const xScale = (date) => 
    padding + ((date - minDate) / (maxDate - minDate)) * (graphWidth - 2 * padding);
  const yScale = (price) => 
    graphHeight - padding - ((price - minPrice) / (maxPrice - minPrice)) * (graphHeight - 2 * padding);

  // Build points string for polyline
  const points = priceHistory
    .map(p => `${xScale(new Date(p.date))},${yScale(p.price)}`)
    .join(" ");

  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <button style={closeBtnStyle} onClick={onClose}>×</button>
        <h3>Price History Graph</h3>
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

          {/* Price line */}
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
              cx={xScale(new Date(p.date))}
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
            {new Date(minDate).toLocaleDateString()}
          </text>
          <text
            x={graphWidth - padding - 80}
            y={graphHeight - padding + 20}
            fill="#aaa"
            fontSize="12"
          >
            {new Date(maxDate).toLocaleDateString()}
          </text>
        </svg>
      </div>
    </div>
  );
};

const PriceAlertSection = ({ userId }) => {
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ url: "", target_price: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Graph modal states
  const [showGraph, setShowGraph] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  // Fetch alerts when component mounts or userId changes
  useEffect(() => {
    if (!userId) return;

    fetch(`http://localhost:5000/price_alerts?user_id=${userId}`)
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch((err) => {
        console.error("Failed to fetch alerts", err);
        setError("Failed to fetch alerts");
      });
  }, [userId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.url || !form.target_price || !form.email) {
      setError("All fields are required.");
      return;
    }
    if (!userId) {
      setError("User ID missing. Please login.");
      return;
    }

    setLoading(true);
    fetch("http://localhost:5000/add_alert", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: form.url,
        target_price: parseFloat(form.target_price),
        email: form.email,
        user_id: userId,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to add alert");
        return res.json();
      })
      .then(() => {
        setForm({ url: "", target_price: "", email: "" });
        // Refresh alerts after adding
        return fetch(`http://localhost:5000/price_alerts?user_id=${userId}`);
      })
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Error adding alert");
        setLoading(false);
      });
  };

  const handleDelete = async (id) => {
    console.log("Deleting alert with ID:", id); // debug
    try {
      const response = await fetch(`http://localhost:5000/price_alerts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAlerts(alerts.filter((alert) => alert.id !== id));
      } else {
        console.error("Delete failed with status:", response.status);
      }
    } catch (error) {
      console.error("Error during delete API call:", error);
    }
  };

  const handleShowGraph = (id) => {
    setSelectedAlertId(id);
    setShowGraph(true);
  };

  const handleCloseGraph = () => {
    setShowGraph(false);
    setSelectedAlertId(null);
  };

  return (
    <div
      style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}
    >
      {/* Left: Alert list */}
      <div
        className="products-table-container"
        style={{
          flex: 1.2,
          overflowY: "auto",
          padding: "20px",
          borderRight: "2px solid #ffffff33",
          background: "transparent",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          boxShadow: "none",
          borderRadius: 0,
        }}
      >
        <h2 className="products-title">Price Alerts</h2>
        <div
          className="table-wrapper"
          style={{ maxHeight: "100%", overflowY: "auto" }}
        >
          <table className="products-table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>URL</th>
                <th style={{ width: "15%" }}>Price</th>
                <th style={{ width: "30%" }}>Email</th>
                <th style={{ width: "25%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="cell-ellipsis" title={alert.url}>
                      {alert.url}
                    </td>
                    <td>${alert.target_price}</td>
                    <td className="cell-ellipsis" title={alert.email}>
                      {alert.email}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() => handleShowGraph(alert.id)}
                          style={{
                            padding: "8px 16px",
                            fontSize: "0.95rem",
                            background: "#764ba2",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            width: "100px",
                          }}
                        >
                          Graph
                        </button>
                        <button
                          onClick={() => handleDelete(alert.id)}
                          style={{
                            padding: "8px 16px",
                            fontSize: "0.95rem",
                            background: "#764ba2",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            width: "100px",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center" }}>
                    No alerts added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Form */}
      <div
        style={{
          flex: 0.8,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "30px",
          background: "transparent",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px" }}>
          <h2
            style={{ color: "#fff", marginBottom: "20px", textAlign: "center" }}
          >
            Add New Alert
          </h2>
          {error && (
            <div
              style={{ color: "#e74c3c", marginBottom: "12px", textAlign: "center" }}
            >
              {error}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <input
              className="mainpage-urlinput"
              type="url"
              name="url"
              placeholder="Product URL"
              value={form.url}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "10px" }}
            />
            <input
              className="mainpage-urlinput"
              type="number"
              step="0.01"
              name="target_price"
              placeholder="Target Price"
              value={form.target_price}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "10px" }}
            />
            <input
              className="mainpage-urlinput"
              type="email"
              name="email"
              placeholder="Your Email"
              value={form.email}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "10px" }}
            />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                type="submit"
                disabled={loading}
                className="mainpage-scrapebtn"
                style={{
                  width: "50%",
                  padding: "10px",
                  background: "#764ba2",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                {loading ? "Adding..." : "Add Alert"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Graph Modal */}
      {showGraph && selectedAlertId && (
        <PriceHistoryGraph alertId={selectedAlertId} onClose={handleCloseGraph} />
      )}
    </div>
  );
};

// Styles for modal overlay and content
const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.8)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContentStyle = {
  backgroundColor: "#111",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 0 10px #7c4dff",
  color: "#fff",
  maxWidth: "650px",
  width: "90%",
  textAlign: "center",
};

const closeBtnStyle = {
  position: "absolute",
  top: "10px",
  right: "20px",
  background: "transparent",
  border: "none",
  fontSize: "2rem",
  color: "#fff",
  cursor: "pointer",
};

export default PriceAlertSection;
