const API_BASE = "http://localhost:3000/api/v1";
let currentUser = null;

const transactionsListEl = document.getElementById('transactions-list');
const logoutBtn = document.getElementById("logoutBtn");

document.addEventListener('DOMContentLoaded', async () => {
    await fetchCurrentUser();
    if (currentUser) {
        fetchTransactions();
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

async function fetchTransactions() {
    try {
        const res = await fetch(`${API_BASE}/transactions/my-transactions`, { credentials: 'include' });
        const data = await res.json();
        renderTransactions(data.transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        transactionsListEl.innerHTML = '<p>Could not load transactions.</p>';
    }
}

function renderTransactions(transactions) {
    transactionsListEl.innerHTML = '';
    if (!transactions || transactions.length === 0) {
        transactionsListEl.innerHTML = '<p>You have no transactions yet.</p>';
        return;
    }

    transactions.forEach(tx => {
        const card = document.createElement('div');
        card.className = 'transaction-card';

        const isSeeker = tx.seeker._id === currentUser._id;
        const otherParty = isSeeker ? tx.provider : tx.seeker;

        let actionsHtml = '';
        if (tx.status === 'pending' && !isSeeker) {
            actionsHtml = `
                <button class="btn-accept" data-tx-id="${tx._id}">Accept</button>
                <button class="btn-cancel" data-tx-id="${tx._id}">Decline</button>`;
        } else if (tx.status === 'accepted' && isSeeker) {
            actionsHtml = `
                <button class="btn-complete" data-tx-id="${tx._id}">Mark as Complete</button>
                <button class="btn-cancel" data-tx-id="${tx._id}">Cancel</button>`;
        } else if (tx.status === 'accepted' && !isSeeker) {
             actionsHtml = `<button class="btn-cancel" data-tx-id="${tx._id}">Cancel</button>`;
        }

        card.innerHTML = `
            <div class="transaction-details">
                <h4>${tx.skill.title}</h4>
                <p>With: <strong>${otherParty.fullName}</strong> | Credits: <strong>${tx.credits}</strong></p>
            </div>
            <div class="transaction-status status-${tx.status}">${tx.status}</div>
            <div class="transaction-actions">${actionsHtml}</div>
        `;
        transactionsListEl.appendChild(card);
    });
}

transactionsListEl.addEventListener('click', async (e) => {
    const target = e.target;
    const transactionId = target.dataset.txId;
    if (!transactionId) return;

    let url = '';
    const options = {
        method: 'PATCH',
        credentials: 'include'
    };

    if (target.classList.contains('btn-accept')) {
        url = `${API_BASE}/transactions/accept/${transactionId}`;
    } else if (target.classList.contains('btn-complete')) {
        url = `${API_BASE}/transactions/complete/${transactionId}`;
    } else if (target.classList.contains('btn-cancel')) {
        url = `${API_BASE}/transactions/cancel/${transactionId}`;
    }

    if (url) {
        try {
            const res = await fetch(url, options);
            const data = await res.json();
            alert(data.message);
            if (res.ok) {
                fetchTransactions(); 
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
        }
    }
});

logoutBtn.addEventListener("click", async () => {
    await fetch(`${API_BASE}/users/logout`, { method: "POST", credentials: "include" });
    window.location.href = "index.html";
});