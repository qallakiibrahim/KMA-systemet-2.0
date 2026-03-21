import urllib.request
try:
    response = urllib.request.urlopen('http://127.0.0.1:8000/api/tasks/')
    print(response.read())
except Exception as e:
    print(e)
