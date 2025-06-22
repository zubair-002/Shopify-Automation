import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Import navigate
import './AuthForm.css';

function Signup({ onSignup }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [userId, setUserId] = useState('');
  const navigate = useNavigate(); // <-- Init navigate

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg('');
    setUserId('');
    const res = await fetch('http://localhost:5000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    if (data.user_id) {
      setUserId(data.user_id);
      if (onSignup) onSignup(data.user_id);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-title">Sign Up</h2>
        <input
          className="auth-input"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          className="auth-input"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          className="auth-input"
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button className="auth-button" type="submit">Sign Up</button>
        <div className="auth-msg">{msg}</div>
        {userId && (
          <div style={{ color: "#fff", marginTop: 10, wordBreak: "break-word" }}>
            <b>Your User ID:</b> {userId}
          </div>
        )}

        {/* Login navigation */}
        <div className="auth-switch">
          Already have an account?{" "}
          <span className="auth-link" onClick={() => navigate("/login")}>
            Login
          </span>
        </div>
      </form>
    </div>
  );
}

export default Signup;
