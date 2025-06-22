import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

function LandingPage({ onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-header-bar">
        <button className="landing-logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
      <div className="landing-header">
        <h1>Welcome to Shopify Toolkit</h1>
        <p>
          Streamline your Shopify workflow: Scrape products, bulk import, and monitor prices.
        </p>
      </div>

      <div className="landing-actions">
        <button onClick={() => navigate("/scraper")}>Shopify Scraper</button>
        <button onClick={() => navigate("/bulk-add")}>Bulk Add Products</button>
        <button onClick={() => navigate("/tracking")}>Track Prices</button>
      </div>

      <div className="landing-footer">
        &copy; {new Date().getFullYear()} Shopify Toolkit — Empowering your e-commerce workflow.
      </div>
    </div>
  );
}

export default LandingPage;
