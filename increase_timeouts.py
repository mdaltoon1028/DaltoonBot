import sys

with open("bot.py", "r") as f:
    content = f.read()

content = content.replace("timeout=5", "timeout=20")
content = content.replace("timeout=6", "timeout=20")
content = content.replace("timeout=8", "timeout=20")

with open("bot.py", "w") as f:
    f.write(content)
