# 🔗 SkillSwap – A Skill Exchange Platform

SkillSwap is a full-stack web application that allows users to **exchange skills** with each other using credits as a medium of transaction.  
It supports **real-time chat, notifications, skill publishing, and transactions** – making it a community-driven skill sharing platform.  

🌍 **Live Demo**:  
- Frontend: [https://skillswapping11.netlify.app](https://skillswapping11.netlify.app)  
- Backend: [https://skillswap-cih6.onrender.com](https://skillswap-cih6.onrender.com)  

---

## ✨ Features

- 🔐 **Authentication & Authorization**  
  - Signup, Login, Logout with JWT + cookies  
  - Secure sessions (`httpOnly`, `SameSite=None`)  

- 👤 **User Profile**  
  - View user details  
  - Manage credits  

- 🛠️ **Skills Management**  
  - Publish new skills  
  - Edit or delete skills  
  - Search skills  

- 💬 **Real-time Chat** (via Socket.IO)  
  - Instant messaging between users  
  - Chat rooms for each skill transaction  

- 🔔 **Notifications System**  
  - New message alerts  
  - Transaction updates  

- 💱 **Transactions**  
  - Request a skill from another user  
  - Credits deducted/added automatically  

- 📱 **Responsive Frontend** (HTML, CSS, JS)  
  - Deployed on Netlify  
  - Clean and simple UI  

---

## 🛠️ Tech Stack

**Frontend:**  
- HTML5, CSS3, JavaScript  
- Deployed on **Netlify**  

**Backend:**  
- Node.js, Express.js  
- Authentication with JWT & cookies  
- Socket.IO for real-time chat  
- CORS + cookie-based auth  
- Deployed on **Render**  

**Database:**  
- MongoDB Atlas (Cloud-hosted MongoDB)  

---

## 📂 Project Structure
skillswap/
│
├── frontend/ # Frontend (Netlify deploy)
│ ├── index.html
│ ├── dashboard.html
│ ├── css/
│ └── js/
│
├── backend/ # Backend (Node.js + Express + Socket.IO)
│ ├── index.js
│ ├── routes/
│ ├── controllers/
│ ├── models/
│ ├── config/
│ └── package.json
│
└── README.md


---

## 🚀 Getting Started (Local Development)

### 1. Clone the repo
```bash
git clone https://github.com/your-username/skillswap.git
cd skillswap

2. Setup Backend
cd backend
npm install


Create a .env file in backend/:

PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/skill_swap
ACCESS_TOKEN_SECRET=your-super-secret-key
ACCESS_TOKEN_EXPIRY=1d
CORS_ORIGIN=http://localhost:5500


Run backend:

npm start

3. Setup Frontend

Just open frontend/index.html with Live Server or host using Netlify.

Future Improvements

Push notifications

