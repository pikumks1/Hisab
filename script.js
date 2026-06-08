import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

let currentEditId = null;
let currentUser = null;
let unsubscribeData = null; // Stops loading data when logged out

const defaultCategories = ["Food", "Grocery", "Transport", "Bills", "Salary", "Business", "Other"];

// --- Authentication Logic ---

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        loadUserData();
    } else {
        currentUser = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        if (unsubscribeData) unsubscribeData(); // Stop fetching data
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { console.error("Login Error:", error); }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// --- Database Logic ---

function loadUserData() {
    // Only fetch data where userId matches the currently logged-in user
    const q = query(expensesCol, where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
    
    unsubscribeData = onSnapshot(q, (snapshot) => {
        const list = document.getElementById('expense-list');
        let totalIncome = 0;
        let totalExpense = 0;
        const uniqueCategories = new Set(defaultCategories);
        
        list.innerHTML = '';

        snapshot.forEach((docSnapshot) => {
            const exp = docSnapshot.data();
            const docId = docSnapshot.id;
            
            if (exp.category) uniqueCategories.add(exp.category);
            
            const transType = exp.type || 'expense';
            if (transType === 'income') totalIncome += exp.amount;
            else totalExpense += exp.amount;
            
            const dateObj = exp.timestamp ? exp.timestamp.toDate() : new Date();
            const dateString = dateObj.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const safeDesc = exp.description.replace(/'/g, "\\'");
            const amountColor = transType === 'income' ? '#4ade80' : '#ef4444';
            const sign = transType === 'income' ? '+' : '-';

            list.innerHTML += `
                <li>
                    <div class="trans-info">
                        <strong>${exp.description}</strong> <br>
                        <span>${exp.category}</span>
                        <small style="color: #9ca3af; font-size: 11px;">${dateString}</small>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span class="trans-amount" style="color: ${amountColor}; font-weight: bold;">${sign} ₹ ${exp.amount.toFixed(2)}</span>
                        <div style="display: flex; gap: 12px;">
                            <i class="fa-solid fa-pen-to-square" onclick="window.editTransaction('${docId}', '${transType}', ${exp.amount}, '${safeDesc}', '${exp.category}')" style="color: #6b4ce6; cursor: pointer; font-size: 16px;"></i>
                            <i class="fa-solid fa-trash" onclick="window.deleteTransaction('${docId}')" style="color: #ef4444; cursor: pointer; font-size: 16px;"></i>
                        </div>
                    </div>
                </li>
            `;
        });

        const datalist = document.getElementById('category-options');
        datalist.innerHTML = '';
        uniqueCategories.forEach(cat => { datalist.innerHTML += `<option value="${cat}"></option>`; });

        const currentBalance = totalIncome - totalExpense;
        document.getElementById('total-balance').innerText = `₹ ${currentBalance.toFixed(2)}`;
        document.getElementById('income-total').innerText = `₹ ${totalIncome.toFixed(2)}`;
        document.getElementById('expense-total').innerText = `₹ ${totalExpense.toFixed(2)}`;
    });
}

window.deleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try { await deleteDoc(doc(db, "expenses", id)); } 
    catch (error) { console.error(error); }
};

window.editTransaction = (id, type, amount, desc, category) => {
    document.getElementById('type').value = type;
    document.getElementById('amount').value = amount;
    document.getElementById('desc').value = desc;
    document.getElementById('category').value = category;
    currentEditId = id;
    
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = 'Update Transaction';
    saveBtn.style.background = '#4ade80';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('save-btn').addEventListener('click', async () => {
    const type = document.getElementById('type').value;
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;

    if (!amount || !desc || !category) {
        alert("Amount, Description, and Category are required.");
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
            // Attach the current user's ID to the new transaction
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
        document.getElementById('category').value = '';
    } catch (error) {
        console.error("Error saving document: ", error);
        alert("Error saving transaction. Check console.");
    }
});