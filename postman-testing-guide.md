# Postman Testing Guide for Knugget AI Backend

## 🚀 Initial Setup

### 1. Create Postman Environment
Create a new environment in Postman with these variables:

```
BASE_URL: http://localhost:3000/api
ACCESS_TOKEN: (will be set after login)
REFRESH_TOKEN: (will be set after login)
USER_ID: (will be set after login)
```

### 2. Start Your Backend Server
```bash
npm run dev
# Server should be running on http://localhost:3000
```

## 📋 Testing Order (Follow this sequence)

### 1. 🏥 Health Check
**Purpose**: Verify server is running and OpenAI connection works

**Request**:
```
GET {{BASE_URL}}/health
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "services": {
      "database": "connected",
      "openai": "connected"
    }
  }
}
```

### 2. 📊 API Info
**Purpose**: Get API overview

**Request**:
```
GET {{BASE_URL}}/
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "name": "Knugget AI API",
    "version": "1.0.0",
    "description": "AI-powered YouTube video summarization API",
    "endpoints": {
      "auth": "/api/auth",
      "summary": "/api/summary",
      "user": "/api/user",
      "health": "/api/health"
    }
  }
}
```

## 🔐 Authentication Flow Testing

### 3. 👤 User Registration
**Purpose**: Create a new user account

**Request**:
```
POST {{BASE_URL}}/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "testpassword123",
  "name": "Test User"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id_here",
      "email": "test@example.com",
      "name": "Test User",
      "plan": "FREE",
      "credits": 10,
      "emailVerified": false
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresAt": 1234567890
  },
  "message": "User registered successfully"
}
```

**⚠️ Important**: Copy the `accessToken` and `refreshToken` to your Postman environment variables!

### 4. 🔑 User Login (Alternative)
**Purpose**: Login with existing credentials

**Request**:
```
POST {{BASE_URL}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "testpassword123"
}
```

### 5. 👥 Get Current User
**Purpose**: Verify authentication works

**Request**:
```
GET {{BASE_URL}}/auth/me
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "user_id_here",
    "email": "test@example.com",
    "name": "Test User",
    "plan": "FREE",
    "credits": 10,
    "emailVerified": false
  }
}
```

## 🎬 Summary Generation Testing

### 6. 🤖 Generate AI Summary
**Purpose**: Test the core AI summarization feature

**Request**:
```
POST {{BASE_URL}}/summary/generate
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "transcript": [
    {
      "timestamp": "0:00",
      "text": "Welcome to this video about artificial intelligence and machine learning.",
      "startSeconds": 0
    },
    {
      "timestamp": "0:15",
      "text": "Today we'll explore how AI is transforming various industries.",
      "startSeconds": 15
    },
    {
      "timestamp": "0:30",
      "text": "Machine learning algorithms can analyze vast amounts of data.",
      "startSeconds": 30
    },
    {
      "timestamp": "0:45",
      "text": "This enables businesses to make better decisions and improve efficiency.",
      "startSeconds": 45
    }
  ],
  "videoMetadata": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Introduction to AI and Machine Learning",
    "channelName": "Tech Education Channel",
    "duration": "10:30",
    "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "thumbnailUrl": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "summary_id_here",
    "title": "Introduction to AI and Machine Learning",
    "keyPoints": [
      "AI and machine learning are transforming various industries",
      "Machine learning algorithms can analyze vast amounts of data",
      "Businesses can make better decisions and improve efficiency with AI"
    ],
    "fullSummary": "This video provides an introduction to artificial intelligence and machine learning...",
    "tags": ["ai", "machine-learning", "technology", "business", "data-analysis"],
    "status": "COMPLETED",
    "videoMetadata": {
      "videoId": "dQw4w9WgXcQ",
      "title": "Introduction to AI and Machine Learning",
      "channelName": "Tech Education Channel"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Summary generated successfully"
}
```

### 7. 📚 Get User Summaries
**Purpose**: List all summaries for the user

**Request**:
```
GET {{BASE_URL}}/summary?page=1&limit=10
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "summary_id",
        "title": "Introduction to AI and Machine Learning",
        "keyPoints": ["..."],
        "fullSummary": "...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### 8. 🔍 Get Summary by ID
**Purpose**: Get specific summary details

**Request**:
```
GET {{BASE_URL}}/summary/{{SUMMARY_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
```

### 9. ✏️ Update Summary
**Purpose**: Test summary modification

**Request**:
```
PUT {{BASE_URL}}/summary/{{SUMMARY_ID}}
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "title": "Updated Title: AI and ML Basics",
  "keyPoints": [
    "Updated key point 1",
    "Updated key point 2"
  ]
}
```

### 10. 🎥 Get Summary by Video ID
**Purpose**: Check if summary exists for a video

**Request**:
```
GET {{BASE_URL}}/summary/video/dQw4w9WgXcQ
Authorization: Bearer {{ACCESS_TOKEN}}
```

## 👤 User Management Testing

### 11. 📊 Get User Profile
**Purpose**: Get detailed user information

**Request**:
```
GET {{BASE_URL}}/user/profile
Authorization: Bearer {{ACCESS_TOKEN}}
```

### 12. ✏️ Update User Profile
**Purpose**: Test profile modification

**Request**:
```
PUT {{BASE_URL}}/user/profile
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "name": "Updated Test User",
  "avatar": "https://example.com/avatar.jpg"
}
```

### 13. 📈 Get User Statistics
**Purpose**: Get user usage stats

**Request**:
```
GET {{BASE_URL}}/user/stats
Authorization: Bearer {{ACCESS_TOKEN}}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "totalSummaries": 1,
    "summariesThisMonth": 1,
    "creditsUsed": 1,
    "creditsRemaining": 9,
    "planStatus": "FREE",
    "joinedDate": "2024-01-01T00:00:00.000Z"
  }
}
```

### 14. 💰 Add Credits (Testing)
**Purpose**: Test credit management

**Request**:
```
POST {{BASE_URL}}/user/credits/add
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "credits": 5
}
```

### 15. ⬆️ Upgrade Plan
**Purpose**: Test plan upgrade

**Request**:
```
POST {{BASE_URL}}/user/plan/upgrade
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "plan": "PREMIUM"
}
```

## 🔄 Token Management Testing

### 16. 🔄 Refresh Token
**Purpose**: Test token refresh mechanism

**Request**:
```
POST {{BASE_URL}}/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{{REFRESH_TOKEN}}"
}
```

### 17. 🚪 Logout
**Purpose**: Test user logout

**Request**:
```
POST {{BASE_URL}}/auth/logout
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "refreshToken": "{{REFRESH_TOKEN}}"
}
```

## 🚫 Error Testing

### 18. Test Unauthorized Access
**Purpose**: Verify authentication is required

**Request**:
```
GET {{BASE_URL}}/summary
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Authorization token required"
}
```

### 19. Test Invalid Token
**Purpose**: Test invalid token handling

**Request**:
```
GET {{BASE_URL}}/auth/me
Authorization: Bearer invalid_token_here
```

### 20. Test Insufficient Credits
**Purpose**: Test credit validation (after using all credits)

**Request**:
```
POST {{BASE_URL}}/summary/generate
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json

{
  "transcript": [...],
  "videoMetadata": {...}
}
```

**Expected Response** (if no credits):
```json
{
  "success": false,
  "error": "Insufficient credits"
}
```

## 🔍 Rate Limiting Testing

### 21. Test Rate Limits
**Purpose**: Verify rate limiting works

**Method**: Send multiple rapid requests to:
```
POST {{BASE_URL}}/summary/generate
```

**Expected Response** (after limit exceeded):
```json
{
  "success": false,
  "error": "Rate limit exceeded. Free users are limited to 3 requests per 1 minutes."
}
```

## 📝 Validation Testing

### 22. Test Invalid Data
**Purpose**: Test input validation

**Request**:
```
POST {{BASE_URL}}/auth/register
Content-Type: application/json

{
  "email": "invalid-email",
  "password": "123"
}
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "body.email",
        "message": "Invalid email format"
      },
      {
        "field": "body.password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

## 🎯 Chrome Extension Simulation

### 23. Simulate Extension Auth Check
**Purpose**: Test how extension checks authentication

**Request**:
```
GET {{BASE_URL}}/auth/me
Authorization: Bearer {{ACCESS_TOKEN}}
User-Agent: Knugget Chrome Extension v1.0.0
```

### 24. Simulate Extension Summary Generation
**Purpose**: Test extension workflow

**Request**:
```
POST {{BASE_URL}}/summary/generate
Authorization: Bearer {{ACCESS_TOKEN}}
Content-Type: application/json
Origin: chrome-extension://extension-id

{
  "transcript": [
    {
      "timestamp": "0:05",
      "text": "some text here"
    }
  ],
  "videoMetadata": {
    "videoId": "real_video_id",
    "title": "Real Video Title",
    "channelName": "Real Channel",
    "url": "https://youtube.com/watch?v=real_video_id"
  }
}
```

## 📋 Postman Collection Import

### Create a Collection JSON:
Save this as `knugget-api.postman_collection.json`:

```json
{
  "info": {
    "name": "Knugget AI API",
    "description": "Complete API testing for Knugget AI Backend"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{ACCESS_TOKEN}}",
        "type": "string"
      }
    ]
  },
  "event": [
    {
      "listen": "prerequest",
      "script": {
        "exec": [
          "// Auto-extract tokens from login responses",
          "if (pm.response && pm.response.json()) {",
          "  const response = pm.response.json();",
          "  if (response.data && response.data.accessToken) {",
          "    pm.environment.set('ACCESS_TOKEN', response.data.accessToken);",
          "    pm.environment.set('REFRESH_TOKEN', response.data.refreshToken);",
          "    pm.environment.set('USER_ID', response.data.user.id);",
          "  }",
          "}"
        ]
      }
    }
  ]
}
```

## 🎯 Testing Checklist

### ✅ Basic Functionality
- [ ] Server health check passes
- [ ] User registration works
- [ ] User login works
- [ ] Authentication check works
- [ ] AI summary generation works
- [ ] Summary retrieval works

### ✅ Security
- [ ] Unauthorized requests are blocked
- [ ] Invalid tokens are rejected
- [ ] Rate limiting works
- [ ] Input validation works
- [ ] CORS works for extension origins

### ✅ Business Logic
- [ ] Credits are deducted correctly
- [ ] Credits are refunded on AI failures
- [ ] Plan upgrades work
- [ ] User statistics are accurate

### ✅ Error Handling
- [ ] Graceful error responses
- [ ] Proper HTTP status codes
- [ ] Validation error messages
- [ ] Rate limit error messages

## 🚀 Quick Start Script

Run this in Postman's Pre-request Script to auto-setup:

```javascript
// Auto-setup environment
if (!pm.environment.get('BASE_URL')) {
  pm.environment.set('BASE_URL', 'http://localhost:3000/api');
}

// Auto-extract tokens from responses
if (pm.response && pm.response.json()) {
  const response = pm.response.json();
  if (response.data && response.data.accessToken) {
    pm.environment.set('ACCESS_TOKEN', response.data.accessToken);
    pm.environment.set('REFRESH_TOKEN', response.data.refreshToken);
    if (response.data.user) {
      pm.environment.set('USER_ID', response.data.user.id);
    }
  }
}
```

## 🎉 Success Indicators

Your backend is working correctly if:
1. ✅ Health check returns "healthy"
2. ✅ Registration creates user with 10 FREE credits
3. ✅ AI summary generation works and deducts 1 credit
4. ✅ Rate limiting blocks excessive requests
5. ✅ Invalid tokens are rejected
6. ✅ CORS allows chrome-extension:// origins

Happy testing! 🚀