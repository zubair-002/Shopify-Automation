import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // import useNavigate
import './AuthForm.css';

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [msg, setMsg] = useState('');
  const navigate = useNavigate(); // initialize navigate

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg('');
    const res = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    if (data.user_id && onLogin) {
      onLogin(data.user_id);         // call parent login logic
      navigate('/');                 // redirect to Landing Page
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-title">Login</h2>
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
        <button className="auth-button" type="submit">Login</button>
        <div className="auth-msg">{msg}</div>

        {/* Add this section */}
        <p style={{ marginTop: '20px', color: '#fff' }}>
          Don't have an account?{' '}
          <span
            style={{ color: '#ffd700', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}

export default Login;
