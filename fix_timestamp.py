# Gyors csere script
import re

file_path = r'D:\noteapp-pwa\js\app.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Csere
content = content.replace('window.fbDb.Timestamp', 'firebase.firestore.Timestamp')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Sikeres csere! window.fbDb.Timestamp -> firebase.firestore.Timestamp")
