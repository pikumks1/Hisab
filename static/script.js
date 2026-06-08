// Firebase SDKs import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Aapki Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_wWIFyTQ5p1UoVobu7XekYnxAl-aOnjA",
  authDomain: "expensetrack-c82d3.firebaseapp.com",
  projectId: "expensetrack-c82d3",
  storageBucket: "expensetrack-c82d3.firebasestorage.app",
  messagingSenderId: "923275176020",
  appId: "1:923275176020:web:232bcc6d64576aaa5565c1",
  measurementId: "G-S88SKEH4J0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const expensesCol = collection(db, "expenses");

let currentEditId = null;

// Real-time listener data load karne ke liye
const q = query(expensesCol, orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    const list = document.getElementById('expense-list');
    let total = 0;
    list.innerHTML = '';

    snapshot.forEach((docSnapshot) => {
        const exp = docSnapshot.data();
        const docId = docSnapshot.id;
        total += exp.amount;
        
        const dateObj = exp.timestamp ? exp.timestamp.toDate() : new Date();
        const dateString = dateObj.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        const safeDesc = exp.description.replace(/'/g, "\\'");

        list.innerHTML += `
            <li>
                <div class="trans-info">
                    <strong>${exp.description}</strong> <br>
                    <span>${exp.category}</span>
                    <small style="color: #9ca3af; font-size: 11px;">${dateString}</small>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span class="trans-amount">- ₹ ${exp.amount.toFixed(2)}</span>
                    <div style="display: flex; gap: 12px;">
                        <i class="fa-solid fa-pen-to-square" onclick="window.editExpense('${docId}', ${exp.amount}, '${safeDesc}', '${exp.category}')" style="color: #6b4ce6; cursor: pointer; font-size: 16px;"></i>
                        <i class="fa-solid fa-trash" onclick="window.deleteExpense('${docId}')" style="color: #ef4444; cursor: pointer; font-size: 16px;"></i>
                    </div>
                </div>
            </li>
        `;
    });

    document.getElementById('total-balance').innerText = `₹ ${total.toFixed(2)}`;
    document.getElementById('expense-total').innerText = `₹ ${total.toFixed(2)}`;
});

// Delete Function
window.deleteExpense = async (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
        await deleteDoc(doc(db, "expenses", id));
    } catch (error) {
        console.error("Error while deleting document:", error);
    }
};

// Edit Function
window.editExpense = (id, amount, desc, category) => {
    document.getElementById('amount').value = amount;
    document.getElementById('desc').value = desc;
    document.getElementById('category').value = category;
    
    currentEditId = id;
    
    const saveBtn = document.getElementById('save-btn');
    saveBtn.innerText = 'Update Expense';
    saveBtn.style.background = '#4ade80';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Save ya Update karne ka logic
document.getElementById('save-btn').addEventListener('click', async () => {
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;

    if (!amount || !desc) {
        alert("Amount and Description are required!");
        return;
    }

    try {
        if (currentEditId) {
            await updateDoc(doc(db, "expenses", currentEditId), {
                amount: parseFloat(amount),
                description: desc,
                category: category
            });
            
            currentEditId = null;
            const saveBtn = document.getElementById('save-btn');
            saveBtn.innerText = 'Save Expense';
            saveBtn.style.background = 'var(--primary)';
        } else {
            await addDoc(expensesCol, {
                amount: parseFloat(amount),
                description: desc,
                category: category,
                timestamp: new Date()
            });
        }

        document.getElementById('amount').value = '';
        document.getElementById('desc').value = '';
    } catch (e) {
        console.error("Error saving document: ", e);
        alert("error while saving expense. Please try again or check console for more details.");
    }
});