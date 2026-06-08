from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime
import pytz

app = Flask(__name__)

# Create the database if it doesn't exist
def init_db():
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS expenses
                 (id INTEGER PRIMARY KEY, amount REAL, description TEXT, category TEXT, date TEXT)''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/expenses', methods=['GET', 'POST'])
def manage_expenses():
    conn = sqlite3.connect('expenses.db')
    c = conn.cursor()
    
    if request.method == 'POST':
        data = request.json
        # Set timestamp to IST
        ist = pytz.timezone('Asia/Kolkata')
        current_time = datetime.now(ist).strftime('%b %d, %I:%M %p')
        
        c.execute("INSERT INTO expenses (amount, description, category, date) VALUES (?, ?, ?, ?)",
                  (data['amount'], data['description'], data['category'], current_time))
        conn.commit()
        conn.close()
        return jsonify({'status': 'success'})
    
    # Get all expenses
    c.execute("SELECT * FROM expenses ORDER BY id DESC")
    expenses = [{'id': row[0], 'amount': row[1], 'description': row[2], 'category': row[3], 'date': row[4]} for row in c.fetchall()]
    conn.close()
    return jsonify(expenses)

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)