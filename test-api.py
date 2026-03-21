import urllib.request
import json

data = json.dumps({"title": "Test Task", "description": "Test"}).encode('utf-8')
req = urllib.request.Request('http://localhost:3000/api/tasks/', data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
