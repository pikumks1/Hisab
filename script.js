// Import Firebase Modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const expensesCol = collection(db, "expenses");

// Global state to track the document being edited
let currentEditId = null;

// Default categories
const defaultCategories = ["Food", "Grocery", "Transport", "Bills", "Salary", "Business", "Other"];

// Initialize real-time listener for Firestore collection
const q = query(expensesCol, orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    const list = document.getElementById('expense-list');
    let totalIncome = 0;
    let totalExpense = 0;
    
    // Set to store unique categories for the smart dropdown
    const uniqueCategories = new Set(defaultCategories);
    
    list.innerHTML = '';

    snapshot.forEach((docSnapshot) => {
        const exp = docSnapshot.data();
        const docId = docSnapshot.id;
        
        // Add category to our unique set so the app "learns" custom categories
        if (exp.category) {
            uniqueCategories.add(exp.category);
        }
        
        // Categorize amount based on transaction type
        const transType = exp.type || 'expense';
        if (transType === 'income') {
            totalIncome += exp.amount;
        } else {
            totalExpense += exp.amount;
        }
        
        // Format timestamp to Indian Standard Time (IST)
        const dateObj = exp.timestamp ? exp.timestamp.toDate() : new Date();
        const dateString = dateObj.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        // Sanitize strings for inline event handlers
        const safeDesc = exp.description.replace(/'/g, "\\'");

        // Determine UI styling based on transaction type
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
                        <i class="fa-solid fa-pen-to-square" onclick="window.editTransaction('${docId}', '${transType}', ${exp.amount}, '${safeDesc}', '${exp.category}')" style="color: #6b4ce6; cursor: pointer; font-size: 16px;" title="Edit"></i>
                        <i class="fa-solid fa-trash" onclick="window.deleteTransaction('${docId}')" style="color: #ef4444; cursor: pointer; font-size: 16px;" title="Delete"></i>
                    </div>
                </div>
            </li>
        `;
    });

    // Populate the datalist dropdown with unique categories
    const datalist = document.getElementById('category-options');
    datalist.innerHTML = '';
    uniqueCategories.forEach(cat => {
        datalist.innerHTML += `<option value="${cat}"></option>`;
    });

    // Update Dashboard UI with calculated totals
    const currentBalance = totalIncome - totalExpense;
    document.getElementById('total-balance').innerText = `₹ ${currentBalance.toFixed(2)}`;
    document.getElementById('income-total').innerText = `₹ ${totalIncome.toFixed(2)}`;
    document.getElementById('expense-total').innerText = `₹ ${totalExpense.toFixed(2)}`;
});

// Method to delete a transaction
window.deleteTransaction = async (id) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
        await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
        console.error("Error while deleting document:", error);
    }
};

// Method to populate the form for editing an existing transaction
window.editTransaction = (id, type, amount, desc, category) => {
    document.getElementById('type').value = type;
    document.getElementById('amount').value = amount;
    document.getElementById('desc').value = desc;
    document.getElementById('category').value = category;
    
    currentEditId = id;
    
    // Modify button state to reflect edit mode
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = 'Update Transaction';
    saveBtn.style.background = '#4ade80';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Event listener for creating or updating a transaction
document.getElementById('save-btn').addEventListener('click', async () => {
    const type = document.getElementById('type').value;
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;

    if (!amount || !desc || !category) {
        alert("Amount, Description, and Category are required to save a transaction.");
        return;
    }

    try {
        if (currentEditId) {
            // Update existing document
            await updateDoc(doc(db, "expenses", currentEditId), {
                type: type,
                amount: parseFloat(amount),
                description: desc,
                category: category
            });
            
            // Reset UI state post-update
            currentEditId = null;
            const saveBtn = document.getElementById('save-btn');
            saveBtn.innerText = 'Save Transaction';
            saveBtn.style.background = 'var(--primary)';
        } else {
            // Create a new document
            await addDoc(expensesCol, {
                type: type,
                amount: parseFloat(amount),
                description: desc,
                category: category,
                timestamp: new Date()
            });
        }

        // Clear input fields
        document.getElementById('amount').value = '';
        document.getElementById('desc').value = '';
        document.getElementById('category').value = ''; // Reset category field
    } catch (error) {
        console.error("Error processing transaction document: ", error);
        alert("An error occurred while saving the transaction. Please check the console for details.");
    }
});