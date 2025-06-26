# 🛍️ Shopify Automation App

An advanced full-stack automation tool for Shopify stores built with **Python (Flask)** for the backend and **React** for the frontend. This project enables you to:

- 🔍 Scrape product data (title, price, etc.) from multiple Shopify-based stores
- 📦 Bulk import products to your own Shopify store
- 📉 Track product price changes
- 📧 Get automatic email alerts when prices drop

---

## 🚀 Features

- ✅ **Shopify Scraper** — Extract product data (title, price, image) from Shopify sites
- ✅ **Price Tracker** — Monitor selected products and get alerts when prices fall below a threshold
- ✅ **Email Notifications** — Send automated alerts to users for tracked product price drops
- ✅ **Bulk Product Uploader** — Add multiple products to your Shopify store with one click
- ✅ **Dashboard UI** — Built with React for managing scraping, tracking, and uploads

---

## 🛠️ Tech Stack

### 🔹 Backend:
- **Python 3**
- **Flask** (API server)
- **Scrapy** (web scraping)
- **PostgreSQL** (for storing products & price history)
- **SMTP** (for sending email alerts)

### 🔹 Frontend:
- **React**
- **Axios** (for API requests)
- **TailwindCSS** (or Bootstrap, depending on your styling)

---

## 📁 Project Structure
shopify-automation/
├── backend/
│ ├── app.py # Flask app
│ ├── scraper/ # Scrapy spiders
│ ├── models/ # SQLAlchemy models
│ └── utils/ # Email + helper functions
├── frontend/
│ ├── src/
│ │ ├── components/ # React components
│ │ └── pages/ # React pages (Dashboard, Tracker, Uploader)
├── requirements.txt
├── README.md
└── .gitignore

---

## 🧪 How to Run the Project

### ⚙️ Backend (Flask API + Scraper)
cd server
pip install -r requirements.txt
python app.py

🖥️ Frontend (React App)

cd frontend
npm install
npm start

📧 Email Alerts
Email alerts are sent when a tracked product’s price drops below your specified value.

Configurable SMTP settings in config.py.

🛡️ Security Note
This project is for educational or authorized business use. Avoid scraping without permission, and follow Shopify's API guidelines if using their official API.

📜 License
This project is licensed under the MIT License.

🙌 Contributions
Feel free to open issues or submit pull requests to enhance this project.

📫 Contact
If you have questions or need support:

📧 Email: zubair.shahzad234@gmail.com

🌐 GitHub: zubair-002


---

Let me know if you want:
- GitHub badges (e.g. for Flask, React, License)
- A markdown-based screenshot section
- Deployment guide (e.g. on Render, Vercel, Railway, or Heroku)


