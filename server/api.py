from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import subprocess
import sys
import os
import pyodbc
import uuid
import pandas as pd
import requests
app = Flask(__name__)
CORS(app)

conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\SQLEXPRESS;"
    "DATABASE=master;"
    "Trusted_Connection=Yes;"
    "MARS_Connection=Yes;"
)
cursor = conn.cursor()

# Create table if not exists
cursor.execute("""
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id UNIQUEIDENTIFIER DEFAULT NEWID(),
    name NVARCHAR(100),
    email NVARCHAR(100) UNIQUE,
    password NVARCHAR(100)
)
""")
conn.commit()

@app.route('/signup', methods=['POST', 'OPTIONS'])
@app.route('/signup/', methods=['POST', 'OPTIONS'])
@cross_origin()
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    user_id = str(uuid.uuid4())  # Generate a random UUID
    try:
        cursor.execute(
            "INSERT INTO users (user_id, name, email, password) VALUES (?, ?, ?, ?)",
            (user_id, name, email, password)
        )
        conn.commit()
        return jsonify({'message': 'Signup successful', 'user_id': user_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    cursor.execute("SELECT * FROM users WHERE email=? AND password=?", (email, password))
    user = cursor.fetchone()
    if user:
        # user_id is at index 2 if your columns are: id, user_id, name, email, password
        return jsonify({'message': 'Login successful', 'name': user[2], 'user_id': str(user[1])}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/scrape', methods=['POST'])
def scrape():
    data = request.get_json()
    urls = data.get('urls', [])
    user_id = data.get('user_id', 'default')
    scrape_session_id = str(uuid.uuid4())
    urls_arg = ','.join(urls)

    command = [
        sys.executable, 'scraper.py',
        '--urls', urls_arg,
        '--user_id', user_id,
        '--scrape_session_id', scrape_session_id
    ]
    # Wait for the scraper to finish
    subprocess.run(
        command,
        cwd=os.path.dirname(os.path.abspath(__file__)),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    # After scraping, fetch products
    cursor.execute("SELECT * FROM products WHERE user_id=? AND scrape_session_id=?", (user_id, scrape_session_id))
    products = cursor.fetchall()
    columns = [column[0] for column in cursor.description]
    result = [dict(zip(columns, row)) for row in products]
    return jsonify({'status': 'success', 'scrape_session_id': scrape_session_id, 'products': result})


@app.route('/products', methods=['GET'])
@cross_origin()
def get_products():
    user_id = request.args.get('user_id')
    scrape_session_id = request.args.get('scrape_session_id')
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400
    if scrape_session_id:
        cursor.execute("SELECT * FROM products WHERE user_id=? AND scrape_session_id=?", (user_id, scrape_session_id))
    else:
        cursor.execute("SELECT * FROM products WHERE user_id=?", (user_id,))
    products = cursor.fetchall()
    columns = [column[0] for column in cursor.description]
    result = [dict(zip(columns, row)) for row in products]
    return jsonify(result)

@app.route('/scrape_sessions', methods=['GET'])
@cross_origin()
def get_scrape_sessions():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400
    cursor.execute("SELECT DISTINCT scrape_session_id, MIN(created_at) as created_at FROM products WHERE user_id=? GROUP BY scrape_session_id ORDER BY created_at DESC", (user_id,))
    sessions = cursor.fetchall()
    result = [{"scrape_session_id": row[0], "created_at": row[1]} for row in sessions if row[0]]
    return jsonify(result)

@app.route('/delete_session', methods=['POST'])
@cross_origin()
def delete_session():
    data = request.get_json()
    user_id = data.get('user_id')
    scrape_session_id = data.get('scrape_session_id')
    if not user_id or not scrape_session_id:
        return jsonify({'error': 'Missing user_id or scrape_session_id'}), 400
    cursor.execute("DELETE FROM products WHERE user_id=? AND scrape_session_id=?", (user_id, scrape_session_id))
    conn.commit()
    return jsonify({'status': 'success'})

@app.route('/add_alert', methods=['POST'])
@cross_origin()
def add_alert():
    data = request.json
    url = data.get('url')
    target_price = data.get('target_price')
    email = data.get('email')
    user_id = data.get('user_id')
    # scrape_session_id = data.get('scrape_session_id') or str(uuid.uuid4())  # generate if not passed

    if not url or not target_price or not email:
        return jsonify({'error': 'Missing url, target_price, email, or user_id'}), 400

    try:
        cursor.execute(
            """
            INSERT INTO price_alerts (url, target_price, email, user_id)
            VALUES (?, ?, ?, ?)
            """,
            (url, target_price, email, user_id)
        )
        conn.commit()
        return jsonify({
            'message': 'Alert added successfully',
        }), 201
    except Exception as e:
        print("Error adding alert:", e)  # Log the error on the server
        return jsonify({'error': str(e)}), 500

@app.route("/price_alerts", methods=["GET"])
def get_price_alerts():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, url, target_price, email FROM price_alerts WHERE user_id = ?", (user_id,))
        alerts = cursor.fetchall()
        result = [
            {
                "id": row[0],
                "url": row[1],
                "target_price": str(row[2]),
                "email": row[3],
            }
            for row in alerts
        ]
        cursor.close()
        # conn.close()
        return jsonify(result), 200
    except Exception as e:
        print("Error fetching price alerts:", e)
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/price_alerts/<int:alert_id>', methods=['DELETE'])
@cross_origin()
def delete_price_alert(alert_id):
    try:
        cursor.execute("DELETE FROM price_alerts WHERE id = ?", (alert_id,))
        conn.commit()
        return jsonify({'message': 'Alert deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route("/price_history/<int:alert_id>", methods=["GET"])
@cross_origin()
def get_price_history(alert_id):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT price, timestamp
            FROM price_history
            WHERE alert_id = ?
            ORDER BY timestamp ASC
        """, (alert_id,))
        rows = cursor.fetchall()

        data = []
        for row in rows:
            price = float(row[0])
            ts = row[1]

            # Handle datetime or string timestamp
            if hasattr(ts, "strftime"):
                timestamp_str = ts.strftime("%Y-%m-%d %H:%M:%S")
            else:
                timestamp_str = str(ts).strip()

            data.append({"price": price, "timestamp": timestamp_str})

        print("Sending price history data:", data)  # Debug log
        return jsonify(data), 200
    except Exception as e:
        print("Error fetching price history:", e)
        return jsonify({"error": "Could not fetch price history"}), 500

@app.route('/bulk_add', methods=['POST'])
def bulk_add():
    file = request.files.get('file')
    api_key = request.form.get('api_key')
    shop_domain = request.form.get('shop_domain')

    if not file or not api_key or not shop_domain:
        return jsonify({'status': 'error', 'error': 'Missing file, API key, or shop domain'}), 400

    # Read CSV or Excel
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            df = pd.read_excel(file)
    except Exception as e:
        return jsonify({'status': 'error', 'error': f'File read error: {str(e)}'}), 400

    # Shopify API endpoint
    url = f"https://{shop_domain}/admin/api/2023-10/products.json"
    headers = {
        "X-Shopify-Access-Token": api_key,
        "Content-Type": "application/json"
    }

    # Required columns: title, body_html, vendor, price, etc.
    results = []
    for _, row in df.iterrows():
        product_data = {
            "product": {
                "title": str(row.get("title", "")),
                "body_html": str(row.get("body_html", "")),
                "vendor": str(row.get("vendor", "")),
                "product_type": str(row.get("product_type", "")),
                "variants": [
                    {
                        "price": str(row.get("price", ""))
                    }
                ]
            }
        }
        try:
            resp = requests.post(url, headers=headers, json=product_data)
            if resp.status_code == 201:
                results.append("ok")
            else:
                results.append(f"fail: {resp.text}")
        except Exception as e:
            results.append(f"fail: {str(e)}")

    if all(r == "ok" for r in results):
        return jsonify({'status': 'success'})
    else:
        return jsonify({'status': 'error', 'error': str(results)}), 400
if __name__ == '__main__':
    app.run(debug=True)
