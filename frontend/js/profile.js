const API_BASE = "http://localhost:3000/api/v1";
const userAvatarEl = document.getElementById('user-avatar');
const userFullNameEl = document.getElementById('user-fullName');
const userSkillsListEl = document.getElementById('user-skills-list');
const startChatBtn = document.getElementById('start-chat-btn');
const logoutBtn = document.getElementById("logoutBtn");

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');

    await fetchCurrentUser();
    if (!currentUser) return; 

    if (userId) {
       
        fetchUserProfile(userId);
    } else {
       
        fetchMyProfileData();
    }
});

async function fetchCurrentUser() {
    try {
        const res = await fetch(`${API_BASE}/users/me`, { credentials: "include" });
        if (!res.ok) { window.location.href = 'index.html'; return; }
        const data = await res.json();
        currentUser = data.user;
    } catch (error) {
        console.error('Authentication error', error);
        window.location.href = 'index.html';
    }
}

async function fetchUserProfile(userId) {
    try {
        const res = await fetch(`${API_BASE}/users/profile/${userId}`);
        if (!res.ok) { userFullNameEl.textContent = "User not found."; return; }
        
        const responseData = await res.json();
        displayUserProfile(responseData.data);

        if (currentUser && currentUser._id !== userId) {
            startChatBtn.style.display = 'block';
            startChatBtn.dataset.receiverId = userId;
        }
    } catch (error) {
        console.error('Failed to fetch user profile', error);
    }
}

async function fetchMyProfileData() {
    try {
        const res = await fetch(`${API_BASE}/skills/`); 
        if (!res.ok) throw new Error("Could not fetch skills");
        
        const skillsData = await res.json();
  
        const mySkills = skillsData.skills.filter(skill => skill.owner._id === currentUser._id);
        
        const profileData = {
            user: currentUser,
            skills: mySkills
        };
        displayUserProfile(profileData);
    } catch(error) {
        console.error("Failed to fetch own profile data:", error);
    }
}

function displayUserProfile(data) {
    const user = data.user;
    const skills = data.skills;

    userFullNameEl.textContent = user.fullName;
    userAvatarEl.src = user.profilePicture || `https://api.dicebear.com/8.x/initials/svg?seed=${user.fullName}`;

    userSkillsListEl.innerHTML = '';
    if (skills && skills.length > 0) {
        skills.forEach(skill => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${skill.title}</strong> (${skill.credits} credits) <br> <small>${skill.description}</small>`;
            userSkillsListEl.appendChild(li);
        });
    } else {
        userSkillsListEl.innerHTML = '<li>This user has not listed any skills.</li>';
    }
}

startChatBtn.addEventListener('click', (e) => {
    const receiverId = e.target.dataset.receiverId;
    if (receiverId) initiateChat(receiverId);
});

logoutBtn.addEventListener("click", async () => {
    await fetch(`${API_BASE}/users/logout`, { method: "POST", credentials: "include" });
    window.location.href = "index.html";
});

async function initiateChat(receiverId) {
    try {
        const res = await fetch(`${API_BASE}/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ receiverId })
        });
        const responseData = await res.json();
        if (!res.ok) throw new Error(responseData.message || 'Could not start chat.');
        
        const chatId = responseData.data?._id;
        if (chatId) {
            window.location.href = `chat.html?chatId=${chatId}`;
        } else {
            throw new Error("Chat ID was not found.");
        }
    } catch (error) {
        alert(`Failed to start a chat: ${error.message}`);
    }
}