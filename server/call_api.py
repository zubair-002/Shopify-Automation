import requests
import subprocess
import sys
import os
import uuid
from flask import Flask, request, jsonify

app = Flask(__name__)

API_URL = 'http://127.0.0.1:5000/scrape'

urls = [
    "shop-seelenschmuck.at",
]

response = requests.post(API_URL, json={"urls": urls})

print("Status Code:", response.status_code)
print("Response:")
print(response.json())

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
    # Run as background process
    subprocess.Popen(
        command,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    return jsonify({'status': 'success', 'scrape_session_id': scrape_session_id})
