#!/bin/bash
PID=$(lsof -t -i:4000  )
if [ -n "$PID" ]; then
    echo "Killing server with PID: $PID"
    kill -9 $PID
else
    echo "No server found"
fi