const API_BASE = "http://localhost:3000/api/v1";
const SOCKET_SERVER_URL = "http://localhost:3000";

const messageContainer = document.getElementById('message-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const otherUserProfileLink = document.getElementById('other-user-profile-link');

let currentUser = null;
let chatId = null;

const socket = io(SOCKET_SERVER_URL, {
    withCredentials: true
});

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    chatId = params.get('chatId');
    if (!chatId) {
        otherUserProfileLink.textContent = 'Error: Chat Not Found';
        return;
    }

    await fetchCurrentUser();
    if (!currentUser) return;

    await fetchChatDetails(chatId);

    socket.emit('join chat', chatId);
    await fetchMessages(chatId);

    socket.on('message received', (newMessage) => {
        if (currentUser && newMessage.sender._id !== currentUser._id) {
            appendMessage(newMessage);
        }
    });
});

async function fetchCurrentUser() {
    try {
        const res = await fetch(`${API_BASE}/users/me`, { credentials: "include" });
        if (!res.ok) throw new Error('Not authenticated');
        const data = await res.json();
        currentUser = data.user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        window.location.href = 'index.html';
    }
}

async function fetchChatDetails(cId) {
    try {
        const res = await fetch(`${API_BASE}/chats/${cId}`, { credentials: "include" });
        const responseData = await res.json();
        if (!res.ok) throw new Error(responseData.message || "Could not fetch chat details.");

        const chat = responseData.data;

        const otherUser = chat.participants.find(p => p._id !== currentUser._id);

        if (otherUser) {
            otherUserProfileLink.textContent = otherUser.fullName;
            otherUserProfileLink.href = `profile.html?userId=${otherUser._id}`;
        }
    } catch (error) {
        console.error("Fetch chat details error:", error);
        otherUserProfileLink.textContent = 'Chat';
    }
}

async function fetchMessages(cId) {
    try {
        const res = await fetch(`${API_BASE}/messages/${cId}`, { credentials: "include" });
        const responseData = await res.json();
        const messagesArray = responseData.data || responseData.messages || responseData;
        messageContainer.innerHTML = '';
        if (Array.isArray(messagesArray)) {
            messagesArray.forEach(msg => appendMessage(msg));
        }
    } catch (error) {
        console.error('Failed to fetch messages:', error);
    }
}

function appendMessage(message) {
    const isSentByMe = message.sender._id === currentUser._id;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isSentByMe ? 'sent' : 'received');
    messageDiv.innerHTML = `
        <span class="message-sender">${isSentByMe ? 'You' : message.sender.fullName}</span>
        <div class="message-bubble">${message.content}</div>`;
    messageContainer.appendChild(messageDiv);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (content && currentUser && chatId) {
        const messageData = { chatId, senderId: currentUser._id, content };
        socket.emit('new message', messageData);
        const tempMessage = { sender: { _id: currentUser._id, fullName: 'You' }, content };
        appendMessage(tempMessage);
        messageInput.value = '';
    }
});