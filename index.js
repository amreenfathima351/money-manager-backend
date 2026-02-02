const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const connectDB = require('./src/config/db');
const port = process.env.PORT;

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/transactions', require('./src/routes/transactionRoutes'));
app.use('/api/accounts', require('./src/routes/accountRoutes'));

app.get('/', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Money Manage is running' });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Money Manage is running' });
});

app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
