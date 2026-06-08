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
const categoriesCol = collection(db, "categories");

// Runtime State Tracker Indicators
let currentEditId = null;
let currentUser = null;
let unsubscribeExpenses = null;
let unsubscribeCategories = null;

let allUserExpenses = []; 
let currentMonthFilter = ""; 

const defaultCategories = ["Food", "Grocery", "Transport", "Bills", "Salary", "Business", "Other"];
let customCategoriesMap = {}; 

function initMonthSelector() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    currentMonthFilter = `${yyyy}-${mm}`;
    document.getElementById('month-selector').value = currentMonthFilter;
}

document.getElementById('month-selector').addEventListener('change', (e) => {
    currentMonthFilter = e.target.value;
    renderTransactions();
});

// --- Authentication Listeners & State Validation ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initMonthSelector();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid'; // Matches CSS grid layout
        loadUserData();
    } else {
        currentUser = null;
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        
        if (unsubscribeExpenses) unsubscribeExpenses();
        if (unsubscribeCategories) unsubscribeCategories();
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    try { await signInWithPopup(auth, provider); } 
    catch (error) { console.error("Session initialization fault:", error); }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

// --- Category Mutation Actions ---
document.getElementById('add-new-cat-btn').addEventListener('click', async () => {
    const newCategory = prompt("Enter the name of your new category:");
    if (newCategory && newCategory.trim() !== "") {
        const formattedCat = newCategory.trim();
        if (defaultCategories.map(c => c.toLowerCase()).includes(formattedCat.toLowerCase())) {
            alert("This category already exists by default.");
            return;
        }
        try {
            await addDoc(categoriesCol, {
                userId: currentUser.uid,
                name: formattedCat,
                timestamp: new Date()
            });
        } catch (error) { console.error("Category insertion fault:", error); }
    }
});

document.getElementById('delete-cat-btn').addEventListener('click', async () => {
    const categorySelect = document.getElementById('category');
    const selectedCategory = categorySelect.value;
    if (defaultCategories.includes(selectedCategory)) {
        alert("Default base operational configurations cannot be removed.");
        return;
    }
    const docId = customCategoriesMap[selectedCategory];
    if (docId) {
        if (!confirm(`Are you sure you want to delete the category "${selectedCategory}"?`)) return;
        try { await deleteDoc(doc(db, "categories", docId)); } 
        catch (error) { console.error("Category removal fault:", error); }
    }
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

    const qCategories = query(categoriesCol, where("userId", "==", currentUser.uid), orderBy("timestamp", "asc"));
    unsubscribeCategories = onSnapshot(qCategories, (snapshot) => {
        const categorySelect = document.getElementById('category');
        const previousSelection = categorySelect.value;
        
        categorySelect.innerHTML = '';
        customCategoriesMap = {};

        // Rebuild standard tracking baselines
        defaultCategories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
        });

        // Inject custom configurations
        snapshot.forEach((docSnapshot) => {
            const catData = docSnapshot.data();
            const catId = docSnapshot.id;
            if (catData.name) {
                customCategoriesMap[catData.name] = catId;
                categorySelect.innerHTML += `<option value="${catData.name}">${catData.name}</option>`;
            }
        });

        if (previousSelection) categorySelect.value = previousSelection;
    });
}

// --- Layout Renderer Framework ---
function renderTransactions() {
    const list = document.getElementById('expense-list');
    let totalIncome = 0;
    let totalExpense = 0;
    list.innerHTML = '';

    allUserExpenses.forEach((exp) => {
        const dateObj = exp.timestamp ? exp.timestamp.toDate() : new Date();
        const expMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const expYear = dateObj.getFullYear();
        const expMonthYear = `${expYear}-${expMonth}`;

        if (expMonthYear === currentMonthFilter) {
            const transType = exp.type || 'expense';
            if (transType === 'income') totalIncome += exp.amount;
            else totalExpense += exp.amount;
            
            const dateString = dateObj.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const safeDesc = exp.description.replace(/'/g, "\\'");
            
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
                        <span class="trans-amount" style="color: ${amountColor}; font-weight: 700;">${sign} ₹ ${exp.amount.toFixed(2)}</span>
                        <div style="display: flex; gap: 12px;">
                            <i class="fa-solid fa-pen-to-square" onclick="window.editTransaction('${exp.id}', '${transType}', ${exp.amount}, '${safeDesc}', '${exp.category}')" style="color: var(--primary); cursor: pointer; font-size: 16px;"></i>
                            <i class="fa-solid fa-trash" onclick="window.deleteTransaction('${exp.id}')" style="color: var(--danger); cursor: pointer; font-size: 16px;"></i>
                        </div>
                    </div>
                </li>
            `;
        }
    });

    const currentBalance = totalIncome - totalExpense;
    document.getElementById('total-balance').innerText = `₹ ${currentBalance.toFixed(2)}`;
    document.getElementById('income-total').innerText = `₹ ${totalIncome.toFixed(2)}`;
    document.getElementById('expense-total').innerText = `₹ ${totalExpense.toFixed(2)}`;
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
    
    const categorySelect = document.getElementById('category');
    let optionExists = Array.from(categorySelect.options).some(opt => opt.value === category);
    if (!optionExists) {
        categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
    }
    categorySelect.value = category;
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
        document.getElementById('category').value = 'Food';
    } catch (error) {
        console.error("Data tracking storage fault: ", error);
        alert("Transaction operation failed.");
    }
});