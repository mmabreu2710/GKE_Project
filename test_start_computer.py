import requests
import json

# URL to send the request
url = "http://34.38.5.121/play-computer/start"

# Payload to be sent
payload = {
    "selectedPlayer": "X",
    "selectedDifficulty": "easy"
}

# Headers to be included in the request
headers = {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate",
    "accept-language": "en-US,en",
    "connection": "keep-alive",
    "content-length": str(len(json.dumps(payload))),
    "content-type": "application/json",
    "host": "34.38.5.121",
    "origin": "http://34.38.5.121",
    "referer": "http://34.38.5.121/",
    "sec-gpc": "1",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
}

# Send 100 POST requests
for i in range(100):
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        print(f"Request {i + 1} sent successfully.")
    else:
        print(f"Request {i + 1} failed with status code {response.status_code}.")
