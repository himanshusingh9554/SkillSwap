# SkillSwap Python Backend (FastAPI + Gen AI)

A modern, high-performance Python backend for **SkillSwap**, built with **FastAPI**, **Motor (Async MongoDB)**, **python-socketio** (for real-time chat), and **Google Gemini Gen AI**.

---

## Features

- ⚡ **FastAPI**: Fully asynchronous REST API with automatic OpenAPI interactive docs (`/docs`).
- 🍃 **Async MongoDB (Motor)**: Direct compatibility with existing SkillSwap MongoDB cluster.
- 💬 **Real-time WebSockets (`python-socketio`)**: Drop-in replacement for the Node.js Socket.io server. Zero frontend changes required for chat.
- 🔐 **JWT Authentication**: Supports both `Authorization: Bearer <token>` and `accessToken` httpOnly cookie.
- 🤖 **Gen AI Integration (Google Gemini)**:
  - **Smart Skill Matchmaker (`POST /api/v1/ai/match`)**: Semantic matching with compatibility scoring.
  - **Skill Enhancer (`POST /api/v1/ai/enhance-skill`)**: Auto-generates rich course titles, descriptions, and learning outcomes.
  - **Exchange Syllabus Roadmap (`POST /api/v1/ai/generate-roadmap`)**: Week-by-week bilateral learning plans.
  - **AI Skill Coach / Tutor (`POST /api/v1/ai/tutor`)**: Interactive AI mentor for swap consultations.

---

## Setup & Running

### 1. Activate the Virtual Environment
```bash
# Windows
.\venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 2. Configure Environment Variables (`.env`)
The `.env` file is pre-configured in `backend_python/.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://skillswap_user:himanshu123@skill-swap-cluster.3tfawry.mongodb.net/?appName=skill-swap-cluster
ACCESS_TOKEN_SECRET=your-super-secret-key
ACCESS_TOKEN_EXPIRY_DAYS=1
CORS_ORIGIN=http://localhost:5500,http://127.0.0.1:5500,https://skillswapping11.netlify.app
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: If `GEMINI_API_KEY` is not provided, the AI service runs in smart fallback mode).*

### 3. Start the Server
```bash
python run.py
```
Or with `uvicorn`:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

Interactive API documentation will be available at:
👉 **`http://localhost:3000/docs`**

---

## API Endpoints Summary

### Authentication & Users
- `POST /api/v1/users/register` - Register a new user (with 50 default credits)
- `POST /api/v1/users/login` - Authenticate user, receive JWT & cookie
- `POST /api/v1/users/logout` - Clear auth cookie
- `GET /api/v1/users/me` - Get authenticated user profile
- `PATCH /api/v1/users/update-details` - Update name and skills
- `PATCH /api/v1/users/update-avatar` - Upload avatar image
- `GET /api/v1/users/profile/{userId}` - Public profile & active skills

### Skills
- `POST /api/v1/skills/create` - List a new skill
- `GET /api/v1/skills/` - List all active skills
- `GET /api/v1/skills/my-skills?search=` - Search skills by title
- `GET /api/v1/skills/{skillId}` - Get skill details
- `PATCH /api/v1/skills/{skillId}` - Update skill
- `DELETE /api/v1/skills/{skillId}` - Delete skill

### Transactions & Credit Exchange
- `POST /api/v1/transactions/initiate` - Propose a skill exchange
- `PATCH /api/v1/transactions/accept/{transactionId}` - Provider accepts request
- `PATCH /api/v1/transactions/complete/{transactionId}` - Seeker completes & transfers credits
- `PATCH /api/v1/transactions/cancel/{transactionId}` - Cancel transaction
- `GET /api/v1/transactions/my-transactions` - List user transactions

### Real-Time Chats & Messages
- `POST /api/v1/chats/` - Access or create 1-on-1 chat
- `GET /api/v1/chats/` - List current user's chats
- `GET /api/v1/chats/{chatId}` - Get chat details
- `POST /api/v1/messages/{chatId}` - Send message
- `GET /api/v1/messages/{chatId}` - Fetch chat message history

### Notifications
- `GET /api/v1/notifications/` - Get user notifications
- `PUT /api/v1/notifications/{notificationId}/read` - Mark as read

### Gen AI
- `POST /api/v1/ai/match` - Smart skill matching with compatibility score
- `POST /api/v1/ai/enhance-skill` - Generate professional course listing
- `POST /api/v1/ai/generate-roadmap` - Generate 4-week bilateral syllabus
- `POST /api/v1/ai/tutor` - Skill swap coaching & advice
