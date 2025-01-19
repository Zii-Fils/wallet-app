const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

// Mock database
const data = {
    transactions: [],
    categories: [
        { id: 1, name: 'Food', subcategories: ['Groceries', 'Dining'] },
        { id: 2, name: 'Transport', subcategories: ['Fuel', 'Public Transport'] },
    ],
    accounts: ['Bank Account', 'Mobile Money', 'Cash'],
    budgets: {},
    notifications: [],
};

// Helper Functions
const notifyIfBudgetExceeded = (account, newAmount) => {
    if (data.budgets[account]) {
        const totalSpent = data.transactions
            .filter((t) => t.account === account && t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

        if (totalSpent + newAmount > data.budgets[account]) {
            data.notifications.push({
                id: uuidv4(),
                account,
                message: `Budget exceeded for ${account}!`,
                timestamp: new Date().toISOString(),
            });
        }
    }
};

// Routes
app.post('/add_transaction', (req, res) => {
    try {
        const { account, amount, category, subcategory, description } = req.body;

        // Validate input
        if (!data.accounts.includes(account)) {
            return res.status(400).json({ error: 'Invalid account' });
        }

        const categoryObj = data.categories.find((c) => c.name === category);
        if (!categoryObj || (subcategory && !categoryObj.subcategories.includes(subcategory))) {
            return res.status(400).json({ error: 'Invalid category or subcategory' });
        }

        const transaction = {
            id: uuidv4(),
            amount,
            account,
            category,
            subcategory: subcategory || null,
            description: description || '',
            date: new Date().toISOString(),
        };

        notifyIfBudgetExceeded(account, amount);

        data.transactions.push(transaction);

        res.status(201).json({ message: 'Transaction added successfully', transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/set_budget', (req, res) => {
    try {
        const { account, budget } = req.body;

        if (!data.accounts.includes(account)) {
            return res.status(400).json({ error: 'Invalid account' });
        }

        if (budget <= 0) {
            return res.status(400).json({ error: 'Budget must be a positive number' });
        }

        data.budgets[account] = budget;

        res.status(200).json({ message: 'Budget set successfully', account, budget });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/generate_report', (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Please provide start_date and end_date in YYYY-MM-DD format' });
        }

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        const report = data.transactions.filter((t) => {
            const transactionDate = new Date(t.date);
            return transactionDate >= startDate && transactionDate <= endDate;
        });

        res.status(200).json({ report });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/get_summary', (req, res) => {
    try {
        const summary = data.transactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

        res.status(200).json({ summary });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/get_notifications', (req, res) => {
    try {
        res.status(200).json({ notifications: data.notifications });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
