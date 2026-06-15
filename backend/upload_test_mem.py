import requests, os
file_path = r'C:/Users/knows/Desktop/Find Devil TRUVA (2)/Find Devil TRUVA/test.mem'
url = 'http://localhost:8000/api/v1/investigations/upload'
with open(file_path, 'rb') as f:
    files = {'evidence_file': f}
    r = requests.post(url, files=files)
    print('Status:', r.status_code)
    print('Response:', r.text)
