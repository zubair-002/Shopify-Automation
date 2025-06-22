import React, { useState } from "react";
import "./BulkAddPage.css";

function BulkAddPage() {
  const [file, setFile] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [shopDomain, setShopDomain] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMsg("");
  };

  const handleUpload = async () => {
    if (!file || !apiKey || !shopDomain) {
      setMsg("Please provide all fields.");
      return;
    }
    setUploading(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("shop_domain", shopDomain);

    try {
      const res = await fetch("http://localhost:5000/bulk_add", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setMsg("Products uploaded successfully!");
      } else {
        setMsg("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      setMsg("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  return (
    <div className="bulkadd-flex-container">
      <div className="bulkadd-form-section">
        <h2>Bulk Add Products to Shopify</h2>
        <div className="bulkadd-form">
          <label>
            Shopify Store Domain
            <input
              type="text"
              placeholder="your-store.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
            />
          </label>
          <label>
            Shopify Admin API Access Token
            <input
              type="password"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <label>
            Upload CSV or Excel File
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
            />
          </label>
          <button
            className="bulkadd-upload-btn"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          {msg && <div className="bulkadd-msg">{msg}</div>}
        </div>
      </div>
      <div className="bulkadd-help-section">
        <h4>How to get your Shopify Admin API Access Token:</h4>
        <ol>
          <li>Login to your Shopify admin dashboard.</li>
          <li>Go to <b>Apps</b> &rarr; <b>Develop apps</b>.</li>
          <li>Create a new app or select an existing one.</li>
          <li>Go to <b>Configuration</b> and add <b>write_products</b> access.</li>
          <li>Go to <b>API credentials</b> and copy the <b>Admin API access token</b>.</li>
          <li>Paste your store domain (e.g., <i>your-store.myshopify.com</i>) and API token above.</li>
        </ol>
      </div>
    </div>
  );
}

export default BulkAddPage;