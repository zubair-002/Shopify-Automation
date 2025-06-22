import pyodbc
import requests
from email.mime.text import MIMEText
import smtplib
from datetime import datetime

# === DB CONNECTION (SQL Server) ===
conn = pyodbc.connect(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\SQLEXPRESS;"
    "DATABASE=master;"
    "Trusted_Connection=Yes;"
    "MARS_Connection=Yes;"
)
cursor = conn.cursor()

# === GET ALL PRICE ALERTS ===
cursor.execute("SELECT id, url, target_price, email, user_id FROM price_alerts")
alerts = cursor.fetchall()

def get_latest_price(url):
    # Ensure .json endpoint for Shopify
    if not url.endswith(".json"):
        if url.endswith("/"):
            url = url[:-1]
        url += ".json"
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    price_str = data["product"]["variants"][0]["price"]
    return float(price_str)

def send_email(to_email, url, current_price, target_price):
    # Remove .json from end of URL if present
    if url.endswith('.json'):
        url = url[:-5]
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background: #f6f8fc; padding: 0; margin: 0;">
        <div style="max-width: 480px; margin: 32px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #7c4dff22; padding: 32px;">
          <h2 style="color: #7c4dff; margin-top: 0;">🎉 Shopify Price Alert!</h2>
          <p style="font-size: 1.1em; color: #333;">
            <b>Good news!</b> One of your tracked Shopify products has dropped in price.
          </p>
          <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #764ba2;"><b>Product Link:</b></td>
              <td><a href="{url}" style="color: #43e97b; text-decoration: none;">{url}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #764ba2;"><b>Current Price:</b></td>
              <td style="color: #43e97b; font-weight: bold;">${current_price:.2f}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #764ba2;"><b>Your Target Price:</b></td>
              <td style="color: #7c4dff; font-weight: bold;">${target_price:.2f}</td>
            </tr>
          </table>
          <div style="margin: 24px 0;">
            <a href="{url}" style="background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%); color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 1.1em;">View Product</a>
          </div>
          <p style="color: #aaa; font-size: 0.95em; margin-top: 32px;">
            You are receiving this alert from <b>Shopify Toolkit</b>.<br>
            Happy shopping! 🛒
          </p>
        </div>
      </body>
    </html>
    """
    msg = MIMEText(html, "html")
    msg["Subject"] = "🎉 Shopify Price Alert!"
    msg["From"] = "zubair.shahzad234@gmail.com"
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("softmangaming@gmail.com", "gpyn xuji cvrl lzoi")
        server.send_message(msg)
        print(f"[{datetime.now()}] Email sent to {to_email}")

for alert in alerts:
    alert_id, url, target_price, email, user_id = alert
    try:
        current_price = get_latest_price(url)
        print(f"[{datetime.now()}] OK {url} price: {current_price}")

        # Save to price_history
        cursor.execute(
            "INSERT INTO price_history (alert_id, user_id, price) VALUES (?, ?, ?)",
            (alert_id, user_id, current_price)
        )
        conn.commit()

        # Send email if price is less than or equal to target
        if current_price <= float(target_price):
            send_email(email, url, current_price, target_price)

    except Exception as e:
        print(f"[{datetime.now()}] ERROR for alert ID {alert_id}: {e}")

conn.close()