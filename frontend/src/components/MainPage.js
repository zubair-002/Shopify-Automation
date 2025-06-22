import React, { useState, useEffect } from 'react';
import './AuthForm.css';
import './ProductTable.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function MainPage({ userId, onLogout }) {
  const [urls, setUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState('');
  const [page, setPage] = useState(1);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const rowsPerPage = 20;
  const totalPages = Math.ceil(products.length / rowsPerPage);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const res = await fetch(`http://localhost:5000/scrape_sessions?user_id=${userId}`);
    const data = await res.json();
    setSessions(data);
    if (data.length > 0 && selectedSession === null && !loading) {
      setSelectedSession(data[0].scrape_session_id);
      fetchProducts(data[0].scrape_session_id);
    }
  };

  const handleScrape = async e => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setProducts([]);
    setPage(1);
    const urlList = urls.split(',').map(u => u.trim()).filter(Boolean);
    const res = await fetch('http://localhost:5000/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: urlList, user_id: userId })
    });
    const data = await res.json();
    if (data.status === 'success') {
      
      setSelectedSession(data.scrape_session_id);
      setProducts(data.products); // <-- Use products from response
      setLoading(false);
      await fetchSessions(); // Refresh sessions
      setMsg('Scrape finished! Products loaded.');
    } else {
      setMsg('Scrape failed: ' + (data.output || 'Unknown error'));
      setLoading(false);
    }
  };

  const fetchProducts = async (scrapeSessionId) => {
    const res = await fetch(`http://localhost:5000/products?user_id=${userId}&scrape_session_id=${scrapeSessionId}`);
    const data = await res.json();
    setProducts(data);
    setLoading(false);
    setPage(1);
  };

  const handleDownload = () => {
    if (!products.length) return;
    // Get session date for filename
    const session = sessions.find(s => s.scrape_session_id === selectedSession);
    const dateStr = session && session.created_at
      ? new Date(session.created_at).toISOString().slice(0, 10)
      : 'session';
    // Prepare data
    const dataToExport = products.map(prod => {
      // Only export columns in columnOrder
      const row = {};
      columnOrder.forEach(key => row[key] = prod[key]);
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const filename = `products_${dateStr}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
  };

  const handleDeleteSession = async (scrapeSessionId) => {
    // Remove the confirm line if you don't want confirmation
    await fetch('http://localhost:5000/delete_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, scrape_session_id: scrapeSessionId })
    });
    // Refresh sessions
    const res = await fetch(`http://localhost:5000/scrape_sessions?user_id=${userId}`);
    const data = await res.json();
    setSessions(data);

    if (data.length > 0) {
      setSelectedSession(data[0].scrape_session_id);
      fetchProducts(data[0].scrape_session_id);
    } else {
      setProducts([]);
      setSelectedSession(null);
    }
  };

  // Pagination logic
  const paginatedProducts = products.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Define your desired column order:
  const columnOrder = [
    "product_id",
    "url",
    "title",
    "variant",
    "price",
    "original_price",
    "product_variant_option",
    "image",
    "description",
    "published_at",
    "created_at",
    "updated_at"
  ];

  return (
    <div className="mainpage-outer">
      <div className="mainpage-layout">
        <aside className="sidebar">
          <div className="sidebar-section">
            <span className="sidebar-label">History</span>
            {sessions.map(session => (
              <div key={session.scrape_session_id} className="sidebar-history-item">
                <button
                  className={`history-btn${selectedSession === session.scrape_session_id ? ' selected' : ''}`}
                  onClick={() => {
                    setSelectedSession(session.scrape_session_id);
                    fetchProducts(session.scrape_session_id);
                  }}
                >
                  {session.created_at ? new Date(session.created_at).toLocaleString() : session.scrape_session_id.slice(0, 8)}
                </button>
                <span
                  className="history-delete"
                  title="Delete this session"
                  onClick={() => handleDeleteSession(session.scrape_session_id)}
                >🗑️</span>
              </div>
            ))}
          </div>
          <button className="mainpage-logoutbtn" type="button" onClick={onLogout}>
            Logout
          </button>
        </aside>
        <main className="main-content">
         
          {/* Shopify Scraper bar */}
          <form className="mainpage-topbar" onSubmit={handleScrape}>
            <div className="mainpage-topbar-left">
              <span className="mainpage-title">Shopify Scraper</span>
              <input
                className="mainpage-urlinput"
                placeholder="Enter Shopify store URLs, comma separated"
                value={urls}
                onChange={e => setUrls(e.target.value)}
                required
              />
              <button className="mainpage-scrapebtn" type="submit" disabled={loading}>Scrape</button>
              <span className="mainpage-status">{msg}</span>
            </div>
            {products.length > 0 && (
              <button
                className="mainpage-downloadbtn"
                onClick={handleDownload}
                type="button"
                style={{ marginLeft: 'auto' }}
              >
                Download Excel
              </button>
            )}
          </form>
          {/* Products Table */}
          {products.length > 0 && (
            <div className="products-table-container">
              <div className="table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      {columnOrder.map(key => (
                        <th key={key}>{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((prod, idx) => (
                      <tr key={idx}>
                        {columnOrder.map((key, i) => (
                          <td key={i}>
                            <div className="cell-ellipsis" title={prod[key] && prod[key].toString()}>
                              {prod[key] && prod[key].toString().length > 30
                                ? prod[key].toString().slice(0, 30) + '...'
                                : prod[key]}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span className="pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default MainPage;