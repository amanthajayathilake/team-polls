#!/bin/bash

# Test script for Team Polls application

API_URL="http://localhost:3000/api"

echo "1. Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST $API_URL/auth/anon)
TOKEN=$(echo $AUTH_RESPONSE | jq -r '.token')
USER_ID=$(echo $AUTH_RESPONSE | jq -r '.userId')

echo "Token: $TOKEN"
echo "User ID: $USER_ID"
echo

echo "2. Creating a poll..."
POLL_RESPONSE=$(curl -s -X POST $API_URL/poll \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is your favorite programming language?",
    "options": ["JavaScript", "TypeScript", "Python", "Go", "Rust"],
    "expiresAt": "'$(date -d '+1 hour' -Iseconds)'"
  }')

POLL_ID=$(echo $POLL_RESPONSE | jq -r '.id')
echo "Created poll with ID: $POLL_ID"
echo

echo "3. Getting poll details..."
curl -s $API_URL/poll/$POLL_ID | jq
echo

echo "4. Casting a vote..."
VOTE_RESPONSE=$(curl -s -X POST $API_URL/poll/$POLL_ID/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"optionIndex": 1}')

echo "Vote response:"
echo $VOTE_RESPONSE | jq
echo

echo "5. Getting updated poll results..."
curl -s $API_URL/poll/$POLL_ID | jq
echo

echo "6. Testing rate limiting..."
echo "Attempting 10 rapid votes..."
for i in {1..10}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $API_URL/poll/$POLL_ID/vote \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"optionIndex": 2}')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  echo "Attempt $i: HTTP $HTTP_CODE"
  if [ "$HTTP_CODE" = "429" ]; then
    echo "Rate limit hit!"
  fi
done

echo
echo "Test completed!"
echo "Open http://localhost and enter poll ID: $POLL_ID"
