#!/bin/bash

# -----------------------------
# تحديث الـ Client
# -----------------------------
cd /home/CeramiSys/client || exit
git reset --hard
git pull origin main
npm install

# إذا كانت شاشة client موجودة أعد تشغيلها، إذا لا أنشئها
if screen -list | grep -q "client_dev"; then
    screen -S client_dev -X quit
fi
screen -dmS client_dev npm run dev

# -----------------------------
# تحديث الـ Server              
# -----------------------------
cd /home/CeramiSys/server || exit
git reset --hard
git pull origin main
npm install

# إذا كانت شاشة server موجودة أعد تشغيلها، إذا لا أنشئها
if screen -list | grep -q "server_dev"; then
    screen -S server_dev -X quit
fi
screen -dmS server_dev npm run dev

echo "Deployment finished successfully!"
