# API Testing Guide

Use these sample requests to test the API. You can use **Postman**, **Thunder Client** (VS Code extension), or **curl**.

> **Note:** Your MongoDB must be connected for these to work. If you see `ReplicaSetNoPrimary` errors, check your internet connection or MongoDB Atlas whitelist.

---

## 1. Sign Up (Register)

```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "TestUser",
  "email": "test@test.com",
  "password": "test1234"
}
```

**Expected Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "Raju Kumar", "role": "user" }
}
```

📋 **Copy the `token` value — you need it for all other requests!**

---

## 2. Sign In (Login)

```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "test1234"
}
```

**Expected Response:** Same as above (token + user).

---

## 3. Start a Check-in Conversation

```
POST http://localhost:5000/api/chat/start
Authorization: Bearer <paste-your-token-here>
```

**Expected Response:**

```json
{
  "conversationId": "65f...",
  "step": "mood",
  "reply": "Hey! Aaj kaisa raha din? Kuch batao! 😊"
}
```

📋 **Copy the `conversationId` — you need it for replies!**

---

## 4. Reply with Text (Testing Flow)

Send these one at a time, in order. Each one advances the conversation step.

### Step 1 → mood (tell about your day)

```
POST http://localhost:5000/api/chat/reply-text
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "conversationId": "<paste-conversationId>",
  "text": "Aaj bohot thak gaya yaar, bahut traffic tha"
}
```

### Step 2 → platform (which app you worked on)

```
POST http://localhost:5000/api/chat/reply-text
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "conversationId": "<same-conversationId>",
  "text": "Uber pe kaam kiya aaj"
}
```

### Step 3 → earnings (how much you earned)

```
POST http://localhost:5000/api/chat/reply-text
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "conversationId": "<same-conversationId>",
  "text": "Aaj barah sau mila, 1200 rupees"
}
```

### Step 4 → hours (how long you worked)

```
POST http://localhost:5000/api/chat/reply-text
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "conversationId": "<same-conversationId>",
  "text": "Paanch ghante kaam kiya aaj"
}
```

### Final Response (summary + done)

After Step 4, the AI gives a summary with suggestion. Response will have:

```json
{
  "step": "done",
  "isComplete": true,
  "extractedData": { "platform": "uber", "earnings": 1200, "hours": 5 }
}
```

---

## 5. Get Weather & Traffic Context

```
GET http://localhost:5000/api/chat/context?lat=12.9716&lon=77.5946
Authorization: Bearer <your-token>
```

(Uses Bangalore coordinates as example)

---

## Quick curl Commands (Windows PowerShell)

### Sign Up

```powershell
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Raju Kumar","email":"raju@test.com","password":"test1234"}'
```

### Start Chat

```powershell
curl -X POST http://localhost:5000/api/chat/start -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Send Text Reply

```powershell
curl -X POST http://localhost:5000/api/chat/reply-text -H "Authorization: Bearer YOUR_TOKEN_HERE" -H "Content-Type: application/json" -d '{"conversationId":"YOUR_CONVO_ID","text":"Aaj bohot thak gaya"}'
```
