// Import Firebase Modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC_wWIFyTQ5p1UoVobu7XekYnxAl-aOnjA",
    authDomain: "expensetrack-c82d3.firebaseapp.com",
    projectId: "expensetrack-c82d3",
    storageBucket: "expensetrack-c82d3.firebasestorage.app",
    messagingSenderId: "923275176020",
    appId: "1:923275176020:web:232bcc6d64576aaa5565c1",
    measurementId: "G-S88SKEH4J0"
};

// Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const expensesCol = collection(db, "expenses");

// Global state variables
let currentEditId = null;
let currentUser = null;
let unsubscribeData = null;

// Default categories to always show in the dropdown
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
        if (unsubscribeData) unsubscribeData(); // Stop fetching data when logged out
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { console.error("Login Error:", error); }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// --- Category Logic ---

// Function to handle adding a custom category via the "+" button
document.getElementById('add-new-cat-btn').addEventListener('click', () => {
    const newCategory = prompt("Enter the name of your new category:");
    
    if (newCategory && newCategory.trim() !== "") {
        const formattedCat = newCategory.trim();
        const categorySelect = document.getElementById('category');
        
        // Create new option and add it to the dropdown
        const option = document.createElement('option');
        option.value = formattedCat;
        option.innerText = formattedCat;
        
        categorySelect.appendChild(option);
        categorySelect.value = formattedCat; // Auto-select the newly added category
    }
});

// --- Database Logic ---

function loadUserData() {
    // Only fetch data for the logged-in user
    const q = query(expensesCol, where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
    
    unsubscribeData = onSnapshot(q, (snapshot) => {
        const list = document.getElementById('expense-list');
        const categorySelect = document.getElementById('category');
        
        let totalIncome = 0;
        let totalExpense = 0;
        
        // Start with default categories, adding unique ones from the database
        const uniqueCategories = new Set(defaultCategories);
        
        // Save current category selection to prevent UI reset on refresh
        const currentSelectedCategory = categorySelect.value;
        
        list.innerHTML = '';

        snapshot.forEach((docSnapshot) => {
            const exp = docSnapshot.data();
            const docId = docSnapshot.id;
            
            // Learn new categories from database history
            if (exp.category) {
                uniqueCategories.add(exp.category);
            }
            
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

        // Repopulate category dropdown
        categorySelect.innerHTML = '';
        uniqueCategories.forEach(cat => { 
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`; 
        });
        
        // Restore previous selection if it exists
        if (currentSelectedCategory && uniqueCategories.has(currentSelectedCategory)) {
            categorySelect.value = currentSelectedCategory;
        } else {
            categorySelect.value = "Food"; // Default fallback
        }

        const currentBalance = totalIncome - totalExpense;
        document.getElementById('total-balance').innerText = `₹ ${currentBalance.toFixed(2)}`;
        document.getElementById('income-total').innerText = `₹ ${totalIncome.toFixed(2)}`;
        document.getElementById('expense-total').innerText = `₹ ${totalExpense.toFixed(2)}`;
    });
}

// Method to delete a transaction
window.deleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try { await deleteDoc(doc(db, "expenses", id)); } 
    catch (error) { console.error("Delete Error:", error); }
};

// Method to populate the form for editing
window.editTransaction = (id, type, amount, desc, category) => {
    document.getElementById('type').value = type;
    document.getElementById('amount').value = amount;
    document.getElementById('desc').value = desc;
    
    const categorySelect = document.getElementById('category');
    // Ensure the category exists in the dropdown before selecting
    let optionExists = Array.from(categorySelect.options).some(opt => opt.value === category);
    if (!optionExists) {
        categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    }
    categorySelect.value = category;
    
    currentEditId = id;
    
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = 'Update Transaction';
    saveBtn.style.background = '#4ade80';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Event listener for saving/updating a transaction
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
        document.getElementById('category').value = 'Food'; // Reset to default
    } catch (error) {
        console.error("Error saving document: ", error);
        alert("Error saving transaction. Check console.");
    }
});