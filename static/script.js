// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: Replace this with your app's Firebase project configuration
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

// Reference to your 'expenses' collection
const expensesCol = collection(db, "expenses");

// Listen for real-time updates from the database
const q = query(expensesCol, orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    const list = document.getElementById('expense-list');
    let total = 0;
    list.innerHTML = '';

    snapshot.forEach((doc) => {
        const exp = doc.data();
        total += exp.amount;
        
        // Format the date
        const dateObj = exp.timestamp ? exp.timestamp.toDate() : new Date();
        const dateString = dateObj.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        list.innerHTML += `
            <li>
                <div class="trans-info">
                    <strong>${exp.description}</strong> <br>
                    <span>${exp.category}</span>
                    <small style="color: #9ca3af; font-size: 11px;">${dateString}</small>
                </div>
                <span class="trans-amount">- ₹ ${exp.amount.toFixed(2)}</span>
            </li>
        `;
    });

    document.getElementById('total-balance').innerText = `₹ ${total.toFixed(2)}`;
    document.getElementById('expense-total').innerText = `₹ ${total.toFixed(2)}`;
});

// Function to add a new expense
document.getElementById('save-btn').addEventListener('click', async () => {
    const amount = document.getElementById('amount').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;

    if (!amount || !desc) {
        alert("Please enter amount and description.");
        return;
    }

    try {
        await addDoc(expensesCol, {
            amount: parseFloat(amount),
            description: desc,
            category: category,
            timestamp: new Date()
        });

        // Clear inputs after successful save
        document.getElementById('amount').value = '';
        document.getElementById('desc').value = '';
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("Error saving expense. Check console.");
    }
});