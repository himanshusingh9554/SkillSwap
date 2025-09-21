const API_BASE = "http://localhost:3000/api/v1";
let currentUser = null;


const userNameEl = document.getElementById("userName");
const userCreditsEl = document.getElementById("userCredits");
const skillsListEl = document.getElementById("skillsList");
const publishSkillForm = document.getElementById("publishSkillForm");
const logoutBtn = document.getElementById("logoutBtn");
const editModal = document.getElementById('editSkillModal');
const editSkillForm = document.getElementById('editSkillForm');
const closeModalBtn = document.querySelector('.close-button');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResultsEl = document.getElementById('searchResults');
const chatsListEl = document.getElementById("chatsList");
const notificationBell = document.getElementById('notification-bell');
const notificationCount = document.getElementById('notification-count');
const notificationDropdown = document.getElementById('notification-dropdown');

async function fetchUser() {
    try {
        const res = await fetch(`${API_BASE}/users/me`, { credentials: "include" });
        if (!res.ok) {
            window.location.href = "index.html";
            return;
        }
        const responseData = await res.json();
        currentUser = responseData.user;
        
        if (currentUser) {
            userNameEl.textContent = currentUser.fullName;
            userCreditsEl.textContent = currentUser.credits || 0;
            fetchMySkills();
            fetchMyChats(); 
           fetchAndDisplayNotifications();
        } else {
            window.location.href = "index.html";
        }
    } catch (err) {
        console.error("User fetch error:", err);
        window.location.href = "index.html";
    }
}
async function fetchAndDisplayNotifications() {
    try {
        const res = await fetch(`${API_BASE}/notifications`, { credentials: 'include' });
        const data = await res.json();

        if (data.success && data.notifications) {
            const notifications = data.notifications;
            notificationDropdown.innerHTML = ''; // Clear old notifications

            const unreadCount = notifications.filter(n => !n.isRead).length;

            if (unreadCount > 0) {
                notificationCount.textContent = unreadCount;
                notificationCount.style.display = 'block';
            } else {
                notificationCount.style.display = 'none';
            }

            if (notifications.length === 0) {
                 notificationDropdown.innerHTML = '<div class="notification-item">No new notifications.</div>';
                 return;
            }

            notifications.forEach(n => {
                const item = document.createElement('div');
                item.className = 'notification-item';
                if (!n.isRead) {
                    item.classList.add('unread');
                }
                item.textContent = n.content;
                item.dataset.notificationId = n._id;
                item.dataset.type = n.type;
                notificationDropdown.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
    }
}

async function fetchMySkills() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/skills/`, { credentials: "include" });
        const data = await res.json();
        skillsListEl.innerHTML = "";

        if (data.skills && Array.isArray(data.skills)) {
            const mySkills = data.skills.filter(skill => skill.owner._id === currentUser._id);
            if (mySkills.length > 0) {
                mySkills.forEach(skill => {
                    const skillElement = document.createElement('li');
                    skillElement.className = 'skill-card';
                    skillElement.innerHTML = `
                        <div class="skill-card-header"><h4>${skill.title}</h4><div class="skill-card-actions"><button class="btn-edit" data-skill-id="${skill._id}">Edit</button><button class="btn-delete" data-skill-id="${skill._id}">Delete</button></div></div>
                        <div class="skill-card-body"><p>${skill.description}</p></div>
                        <div class="skill-card-footer"><span>Category: ${skill.category}</span><span>Credits: ${skill.credits}</span></div>`;
                    skillElement.querySelector('.btn-edit').skillData = skill;
                    skillsListEl.appendChild(skillElement);
                });
            } else {
                skillsListEl.innerHTML = "<li>You haven't published any skills yet.</li>";
            }
        }
    } catch (err) {
        console.error("Skills fetch error:", err);
    }
}

async function fetchMyChats() {
    try {
        const res = await fetch(`${API_BASE}/chats`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch chats');
        
        const responseData = await res.json();
        const chats = responseData.data || responseData.chats || responseData;

        chatsListEl.innerHTML = '';

        if (Array.isArray(chats) && chats.length > 0) {
            chats.forEach(chat => {
                const otherParticipant = chat.participants.find(p => p._id !== currentUser._id);
                if (!otherParticipant) return;
                const chatElement = document.createElement('li');
                chatElement.className = 'chat-item';
                chatElement.innerHTML = `<a href="chat.html?chatId=${chat._id}">Chat with ${otherParticipant.fullName}</a>`;
                chatsListEl.appendChild(chatElement);
            });
        } else {
            chatsListEl.innerHTML = '<li>You have no active chats.</li>';
        }
    } catch (error) {
        console.error("Fetch chats error:", error);
        chatsListEl.innerHTML = '<li>Could not load chats.</li>';
    }
}

async function searchSkills(query) {
    searchResultsEl.innerHTML = '<p>Searching for skills...</p>';
    const url = `${API_BASE}/skills/my-skills?search=${encodeURIComponent(query)}`;
    try {
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        searchResultsEl.innerHTML = '';

        if (data.skills && data.skills.length > 0) {
            data.skills.forEach(skill => {
                if (skill.owner._id === currentUser._id) return; 

                const resultCard = document.createElement('div');
                resultCard.className = 'result-card';
                resultCard.innerHTML = `
                    <div class="result-card-header"><h4>${skill.title}</h4><span>${skill.credits} 🪙</span></div>
                    <p>${skill.description}</p>
                    <div class="result-card-footer">
                        <span>Offered by: ${skill.owner.fullName}</span>
                        <button class="btn-connect" data-skill-id="${skill._id}">Request Skill</button>
                    </div>`;
                searchResultsEl.appendChild(resultCard);
            });
        } else {
            searchResultsEl.innerHTML = '<p>No skills found matching your search.</p>';
        }
    } catch (error) {
        console.error("Search error:", error);
    }
}


async function initiateChat(receiverId) {
    if (receiverId === currentUser._id) {
        alert("You cannot start a chat with yourself.");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ receiverId })
        });

        const responseData = await res.json();

        if (!res.ok) {
            throw new Error(responseData.message || 'Could not start chat.');
        }
        const chatId = responseData.data?._id; 

        if (chatId) {
            window.location.href = `chat.html?chatId=${chatId}`;
        } else {
            throw new Error("Chat ID was not found in the server's response.");
        }

    } catch (error) {
        console.error('Error initiating chat:', error);
        alert(`Failed to start a chat: ${error.message}`);
    }
}
skillsListEl.addEventListener('click', (e) => {
    const skillId = e.target.getAttribute('data-skill-id');
    if (!skillId) return;
    if (e.target.classList.contains('btn-delete')) handleDeleteSkill(skillId);
    if (e.target.classList.contains('btn-edit')) openEditModal(e.target.skillData);
});

searchResultsEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-connect')) {
        const skillId = e.target.dataset.skillId;
        if (skillId) {
            handleInitiateTransaction(skillId);
        }
    }
});
async function handleInitiateTransaction(skillId) {
    if (!confirm("Are you sure you want to request this skill? The required credits will be put on hold.")) {
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/transactions/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ skillId })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
            fetchUser(); 
        }
    } catch (error) {
        console.error('Error initiating transaction:', error);
        alert('An error occurred. Please try again.');
    }
}
if (notificationBell) {
    notificationBell.addEventListener('click', (e) => {
        e.preventDefault();
        notificationDropdown.style.display = notificationDropdown.style.display === 'block' ? 'none' : 'block';
    });
}

if (notificationDropdown) {
    notificationDropdown.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('notification-item')) {
            const notificationId = target.dataset.notificationId;
            const type = target.dataset.type;

            try {
                await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
                    method: 'PUT',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }

            if (type === 'TRANSACTION') {
                window.location.href = 'transactions.html';
            }
        }
    });
}

if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            searchSkills(query);
        }
    });
}
if (publishSkillForm) {
    publishSkillForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const skillData = {
            title: document.getElementById("skillTitle").value,
            description: document.getElementById("skillDescription").value,
            category: document.getElementById("skillCategory").value,
            skillType: document.getElementById("skillType").value,
            credits: Number(document.getElementById("skillCredits").value)
        };
        try {
            const res = await fetch(`${API_BASE}/skills/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(skillData)
            });
            const data = await res.json();
            if (res.ok) {
                alert("Skill published successfully!");
                publishSkillForm.reset();
                fetchMySkills();
            } else {
                alert(`Error: ${data.message || "Failed to publish skill"}`);
            }
        } catch (err) {
            console.error("Publish skill error:", err);
        }
    });
}
document.addEventListener('click', (e) => {
    if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
        notificationDropdown.style.display = 'none';
    }
});
function handleDeleteSkill(skillId) { }
function openEditModal(skill) { }
editSkillForm.addEventListener('submit', async (e) => {  });
closeModalBtn.onclick = () => editModal.style.display = 'none';
window.onclick = (event) => { if (event.target == editModal) { editModal.style.display = 'none'; } };
logoutBtn.addEventListener("click", async () => {
    try {
        await fetch(`${API_BASE}/users/logout`, { method: "POST", credentials: "include" });
        window.location.href = "index.html";
    } catch (err) {
        console.error("Logout error:", err);
    }
});

fetchUser();