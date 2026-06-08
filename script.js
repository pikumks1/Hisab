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

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Collection references
const expensesCol = collection(db, "expenses");
const categoriesCol = collection(db, "categories");

// State management variables
let currentEditId = null;
let currentUser = null;
let unsubscribeExpenses = null;
let unsubscribeCategories = null;

const defaultCategories = ["Food", "Grocery", "Transport", "Bills", "Salary", "Business", "Other"];
let customCategoriesMap = {}; // Maps custom category names to their Firestore Document IDs

// --- Authentication Observers ---

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
        
        // Terminate active snapshot listeners on logout
        if (unsubscribeExpenses) unsubscribeExpenses();
        if (unsubscribeCategories) unsubscribeCategories();
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { console.error("Authentication Error:", error); }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// --- Category Event Handlers ---

// Create and save custom category to Firestore
document.getElementById('add-new-cat-btn').addEventListener('click', async () => {
    const newCategory = prompt("Enter the name of your new category:");
    if (newCategory && newCategory.trim() !== "") {
        const formattedCat = newCategory.trim();
        
        if (defaultCategories.includes(formattedCat)) {
            alert("This category already exists by default.");
            return;
        }

        try {
            await addDoc(categoriesCol, {
                userId: currentUser.uid,
                name: formattedCat,
                timestamp: new Date()
            });
        } catch (error) {
            console.error("Error writing custom category:", error);
        }
    }
});

// Delete custom category from Firestore
document.getElementById('delete-cat-btn').addEventListener('click', async () => {
    const categorySelect = document.getElementById('category');
    const selectedCategory = categorySelect.value;

    if (defaultCategories.includes(selectedCategory)) {
        alert("Default categories cannot be deleted.");
        return;
    }

    const docId = customCategoriesMap[selectedCategory];
    if (docId) {
        if (!confirm(`Are you sure you want to delete the category "${selectedCategory}"?`)) return;
        try {
            await deleteDoc(doc(db, "categories", docId));
        } catch (error) {
            console.error("Error removing custom category:", error);
        }
    }
});

// --- Core Database Engine ---

function loadUserData() {
    // Pipeline 1: Securely stream transactions isolated by User ID
    const qExpenses = query(expensesCol, where("userId", "==", currentUser.uid), orderBy("timestamp", "desc"));
    unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
        const list = document.getElementById('expense-list');
        let totalIncome = 0;
        let totalExpense = 0;
        list.innerHTML = '';

        snapshot.forEach((docSnapshot) => {
            const exp = docSnapshot.data();
            const docId = docSnapshot.id;
            
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

        const currentBalance = totalIncome - totalExpense;
        document.getElementById('total-balance').innerText = `₹ ${currentBalance.toFixed(2)}`;
        document.getElementById('income-total').innerText = `₹ ${totalIncome.toFixed(2)}`;
        document.getElementById('expense-total').innerText = `₹ ${totalExpense.toFixed(2)}`;
    });

    // Pipeline 2: Securely stream custom categories isolated by User ID
    const qCategories = query(categoriesCol, where("userId", "==", currentUser.uid), orderBy("timestamp", "asc"));
    unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
        const categorySelect = document.getElementById('category');
        const previousSelection = categorySelect.value;
        
        categorySelect.innerHTML = '';
        customCategoriesMap = {};

        // Load constant standard categories
        defaultCategories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Append user specific authenticated records
        snapshot.forEach((docSnapshot) => {
            const catData = docSnapshot.data();
            const catId = docSnapshot.id;
            if (catData.name) {
                customCategoriesMap[catData.name] = catId;
                categorySelect.innerHTML += `<option value="${catData.name}">${catData.name}</option>`;
            }
        });

        // Retain visual input state consistency across snapshots
        if (previousSelection) {
            categorySelect.value = previousSelection;
        }
    });
}

window.deleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try { 
        await deleteDoc(doc(db, "expenses", id)); 
    } catch (error) { 
        console.error("Deletion lifecycle failure:", error); 
    }
};

window.editTransaction = (id, type, amount, desc, category) => {
    document.getElementById('type').value = type;
    document.getElementById('amount').value = amount;
    document.getElementById('desc').value = desc;
    
    const categorySelect = document.getElementById('category');
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

document.getElementById('save-btn').addEventListener('click', async () => {
    const type = document.getElementById('type').value;
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;

    if (!amount || !desc || !category) {
        alert("All structural fields are required parameters.");
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
                userId: currentUser.uid, // Strict owner mapping
                type: type,
                amount: parseFloat(amount),
                description: desc,
                category: category,
                timestamp: new Date()
            });
        }

        document.getElementById('amount').value = '';
        document.getElementById('desc').value = '';
        document.getElementById('category').value = 'Food';
    } catch (error) {
        console.error("Mutation tracking fault: ", error);
        alert("Transaction persist failed.");
    }
});