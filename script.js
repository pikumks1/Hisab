// Import Firebase Modular SDK elements
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Enterprise Architecture Database Configurations
const firebaseConfig = {
    apiKey: "AIzaSyC_wWIFyTQ5p1UoVobu7XekYnxAl-aOnjA",
    authDomain: "expensetrack-c82d3.firebaseapp.com",
    projectId: "expensetrack-c82d3",
    storageBucket: "expensetrack-c82d3.firebasestorage.app",
    messagingSenderId: "923275176020",
    appId: "1:923275176020:web:232bcc6d64576aaa5565c1",
    measurementId: "G-S88SKEH4J0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const expensesCol = collection(db, "expenses");

// Runtime State Tracker Indicators
let currentEditId = null;
let currentUser = null;
let unsubscribeExpenses = null;
let expenseChartInstance = null;

let allUserExpenses = []; 
let currentMonthFilter = ""; 

// Indian Currency Formatter Helper
function formatMoney(amount) {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initMonthSelector() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    currentMonthFilter = `${yyyy}-${mm}`;
    
    const selectorEl = document.getElementById('month-selector');
    if (selectorEl) {
        selectorEl.value = currentMonthFilter;
    }
}

document.getElementById('month-selector').addEventListener('change', (e) => {
    currentMonthFilter = e.target.value;
    renderTransactions();
});

// --- Authentication Listeners & State Validation ---

// --- LOCAL TEST MODE SWITCH ---
const LOCAL_TEST_MODE = true; // Isko deploy karne se pehle 'false' kar dena!

if (LOCAL_TEST_MODE) {
    // Dummy User Setup for Local Testing
    currentUser = { uid: "test-user-123" };
    
    const userNameEl = document.getElementById('user-name');
    const userPicEl = document.getElementById('user-profile-pic');
    if (userNameEl) userNameEl.innerText = 'Gaurav (Local Test)';
    if (userPicEl) userPicEl.src = 'https://via.placeholder.com/40';

    initMonthSelector();
    
    // Direct UI Toggle (Bypass Login Screen)
    const loginScreen = document.getElementById('login-screen');
    const appWrapper = document.getElementById('app-wrapper');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appWrapper) appWrapper.style.display = 'block'; 
    if (appContainer) appContainer.style.display = 'grid';
    
    loadUserData();
} else {
    // --- ORIGINAL AUTHENTICATION LOGIC ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            initMonthSelector();
            
            const userNameEl = document.getElementById('user-name');
            const userPicEl = document.getElementById('user-profile-pic');
            if (userNameEl) userNameEl.innerText = user.displayName || 'User';
            if (userPicEl) userPicEl.src = user.photoURL || 'https://via.placeholder.com/40';

            const loginScreen = document.getElementById('login-screen');
            const appWrapper = document.getElementById('app-wrapper');
            const appContainer = document.getElementById('app-container');
            
            if (loginScreen) loginScreen.style.display = 'none';
            if (appWrapper) appWrapper.style.display = 'block'; 
            if (appContainer) appContainer.style.display = 'grid';
            
            loadUserData();
        } else {
            currentUser = null;
            const loginScreen = document.getElementById('login-screen');
            const appWrapper = document.getElementById('app-wrapper');
            
            if (loginScreen) loginScreen.style.display = 'flex';
            if (appWrapper) appWrapper.style.display = 'none';
            
            if (unsubscribeExpenses) unsubscribeExpenses();
        }
    });
}

/*
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initMonthSelector();
        
        // Setup User Profile details safely
        const userNameEl = document.getElementById('user-name');
        const userPicEl = document.getElementById('user-profile-pic');
        if (userNameEl) userNameEl.innerText = user.displayName || 'User';
        if (userPicEl) userPicEl.src = user.photoURL || 'https://via.placeholder.com/40';

        // Toggle UI
        const loginScreen = document.getElementById('login-screen');
        const appWrapper = document.getElementById('app-wrapper');
        const appContainer = document.getElementById('app-container');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (appWrapper) appWrapper.style.display = 'block'; 
        if (appContainer) appContainer.style.display = 'grid';
        
        loadUserData();
    } else {
        currentUser = null;
        
        const loginScreen = document.getElementById('login-screen');
        const appWrapper = document.getElementById('app-wrapper');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appWrapper) appWrapper.style.display = 'none';
        
        if (unsubscribeExpenses) unsubscribeExpenses();
    }
});
*/

document.getElementById('login-btn').addEventListener('click', async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { console.error("Session initialization fault:", error); }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// --- Realtime Document Pipelines ---
function loadUserData() {
    const qExpenses = query(expensesCol, where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
    unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
        allUserExpenses = [];
        snapshot.forEach((docSnapshot) => {
            allUserExpenses.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });
        renderTransactions();
    });
}

// --- Layout Renderer Framework ---
function renderTransactions() {
    const list = document.getElementById('expense-list');
    if (!list) return; // Fail-safe to prevent crash
    
    let totalIncome = 0;
    let totalExpense = 0;
    list.innerHTML = '';

    const categoryExpenseTotals = {};

    allUserExpenses.forEach((exp) => {
        const dateObj = exp.timestamp ? exp.timestamp.toDate() : new Date();
        const expMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const expYear = dateObj.getFullYear();
        const expMonthYear = `${expYear}-${expMonth}`;

        if (expMonthYear === currentMonthFilter) {
            const transType = exp.type || 'expense';
            
            if (transType === 'income') {
                totalIncome += exp.amount;
                // Income graph mein add NAHI hogi
            } else {
                totalExpense += exp.amount;
                // Sirf expense graph mein add hoga
                categoryExpenseTotals[exp.category] = (categoryExpenseTotals[exp.category] || 0) + exp.amount;
            }
            
            const dateString = dateObj.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });const safeDesc = exp.description.replace(/'/g, "\\'");
            
            // Premium layout visual cues setup
            const itemClass = transType === 'income' ? 'income-item' : 'expense-item';
            const amountColor = transType === 'income' ? 'var(--success)' : 'var(--danger)';
            const sign = transType === 'income' ? '+' : '-';

            list.innerHTML += `
                <li class="${itemClass}">
                    <div class="trans-info">
                        <strong>${exp.description}</strong> <br>
                        <span>${exp.category}</span>
                        <small style="color: var(--text-muted); font-size: 11px;">${dateString}</small>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="trans-amount" style="color: ${amountColor}; font-weight: 700;">${sign} ₹ ${formatMoney(exp.amount)}</span>
                        <div style="display: flex; gap: 12px;">
                            <i class="fa-solid fa-pen-to-square" onclick="window.editTransaction('${exp.id}', '${transType}', ${exp.amount}, '${safeDesc}', '${exp.category}')" style="color: var(--primary); cursor: pointer; font-size: 16px;"></i>
                            <i class="fa-solid fa-trash" onclick="window.deleteTransaction('${exp.id}')" style="color: var(--danger); cursor: pointer; font-size: 16px;"></i>
                        </div>
                    </div>
                </li>
            `;
        }
    });

    const totalBalEl = document.getElementById('total-balance');
    const incomeEl = document.getElementById('income-total');
    const expenseEl = document.getElementById('expense-total');
    
    if (totalBalEl) totalBalEl.innerText = `₹ ${formatMoney(totalIncome - totalExpense)}`;
    if (incomeEl) incomeEl.innerText = `₹ ${formatMoney(totalIncome)}`;
    if (expenseEl) expenseEl.innerText = `₹ ${formatMoney(totalExpense)}`;
    
    updateAnalytics(categoryExpenseTotals);
}

// --- CRUD Mutation Blocks ---
window.deleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try { await deleteDoc(doc(db, "expenses", id)); } 
    catch (error) { console.error("Transaction removal failure:", error); }
};

window.editTransaction = (id, type, amount, desc, category) => {
    document.getElementById('type').value = type;
    document.getElementById('amount').value = amount;
    document.getElementById('desc').value = desc;
    document.getElementById('category').value = category;
    
    currentEditId = id;
    
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = 'Update Transaction';
    saveBtn.style.background = 'var(--success)';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('save-btn').addEventListener('click', async () => {
    const type = document.getElementById('type').value;
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;

    if (!amount || !desc || !category) {
        alert("All fields are required to process mutations.");
        return;
    }

    try {
        if (currentEditId) {
            await updateDoc(doc(db, "expenses", currentEditId), {
                type: type,
                amount: parseFloat(amount),
                description: desc,
                category: category
            });
            currentEditId = null;
            const saveBtn = document.getElementById('save-btn');
            saveBtn.innerText = 'Save Transaction';
            saveBtn.style.background = 'var(--primary)';
        } else {
            await addDoc(expensesCol, {
                userId: currentUser.uid,
                type: type,
                amount: parseFloat(amount),
                description: desc,
                category: category,
                timestamp: new Date()
            });
        }

        document.getElementById('amount').value = '';
        document.getElementById('desc').value = '';
        document.getElementById('category').value = 'Food & Dining'; // Reset to first option
    } catch (error) {
        console.error("Data tracking storage fault: ", error);
        alert("Transaction operation failed.");
    }
});

// Chart Rendering Logic
// --- Replace only this function at the very bottom of script.js ---
// --- Chart Rendering Logic ---
// --- Chart Rendering Logic ---
// --- Chart Rendering Logic ---
// --- Chart Rendering Logic ---
// --- Chart Rendering Logic ---
function updateAnalytics(categoryData) {
    const sortedCategories = Object.entries(categoryData).sort((a, b) => b[1] - a[1]);
    const labels = sortedCategories.map(item => item[0]);
    const data = sortedCategories.map(item => item[1]);
    
    const totalMonthExpense = data.reduce((sum, val) => sum + val, 0);
    
    // 1. Text Summary List Update
    const summaryList = document.getElementById('category-summary-list');
    if(summaryList) {
        summaryList.innerHTML = '';
        if (sortedCategories.length === 0) {
            summaryList.innerHTML = '<li class="summary-item" style="justify-content: center; color: var(--text-muted);">No expenses recorded this month.</li>';
        } else {
            sortedCategories.forEach(([category, amount]) => {
                const pct = totalMonthExpense > 0 ? ((amount / totalMonthExpense) * 100).toFixed(1) : 0;
                summaryList.innerHTML += `
                    <li class="summary-item">
                        <span>${category} <small style="color: var(--text-muted); font-size: 11px;">(${pct}%)</small></span>
                        <span style="color: var(--danger); font-weight: 700;">₹ ${formatMoney(amount)}</span>
                    </li>
                `;
            });
        }
    }

    const canvas = document.getElementById('expenseChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (expenseChartInstance) {
        expenseChartInstance.destroy(); 
    }

    // 2. Render Final Chart (Lines removed, Default Legend ON)
    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#6b4ce6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#84cc16'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: 10 // Normal padding, extra space ka issue khatam
            },
            plugins: {
                // Color Legend Enable Kar Diya
                legend: { 
                    display: true, 
                    position: window.innerWidth < 600 ? 'bottom' : 'right', // Mobile pe neeche, PC pe side mein
                    labels: {
                        font: { family: "'Poppins', sans-serif", size: 11 },
                        padding: 12,
                        usePointStyle: true, // Legend ko chote dots banata hai
                        pointStyle: 'circle'
                    }
                }, 
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const pct = totalMonthExpense > 0 ? ((val / totalMonthExpense) * 100).toFixed(1) : 0;
                            return ` ₹ ${formatMoney(val)} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}