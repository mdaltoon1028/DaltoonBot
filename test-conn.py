import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,fa;q=0.8"
})

url = "https://m.daltoon-server.ir:8443/Daltoon/login"
data = {
    "username": "Daltoon",
    "password": "dummy_password_for_test"  # we just want to see the HTTP response
}

print(f"Testing POST to {url}...")
try:
    response = session.post(url, data=data, timeout=8, verify=False)
    print("Status:", response.status_code)
    print("Headers:", response.headers)
    print("Cookies:", response.cookies.get_dict())
    print("Body:", response.text[:500])
except Exception as e:
    print("Error:", e)
