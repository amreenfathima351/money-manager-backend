const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const mongoose = require('mongoose');

const getDateFilter = (from, to, period) => {
    let dateFilter = {};
    const now = new Date();

    if (from || to) {
        if (from && to) {
            dateFilter.createdAt = {
                $gte: new Date(from),
                $lte: new Date(new Date(to).setHours(23, 59, 59, 999))
            };
        } else if (from) {
            dateFilter.createdAt = { $gte: new Date(from) };
        } else if (to) {
            dateFilter.createdAt = { $lte: new Date(new Date(to).setHours(23, 59, 59, 999)) };
        }
    } else if (period) {
        if (period === 'weekly') {
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - 7);
            dateFilter.createdAt = { $gte: startOfWeek };
        } else if (period === 'monthly') {
            const startOfMonth = new Date();
            startOfMonth.setMonth(startOfMonth.getMonth() - 1);
            dateFilter.createdAt = { $gte: startOfMonth };
        } else if (period === 'yearly') {
            const startOfYear = new Date();
            startOfYear.setFullYear(startOfYear.getFullYear() - 1);
            dateFilter.createdAt = { $gte: startOfYear };
        }
    }
    return dateFilter;
};

const getTransactions = async (req, res) => {
    try {
        const { from, to, category, division, type, period } = req.query;
        let query = { user: req.user.id };

        const dateFilter = getDateFilter(from, to, period);
        query = { ...query, ...dateFilter };

        if (category) query.category = category;
        if (division) query.division = division;
        if (type) query.type = type;

        const transactions = await Transaction.find(query)
            .populate('fromAccount', 'name')
            .populate('toAccount', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const addTransaction = async (req, res) => {
    try {
        const { type, amount, category, division, description, fromAccount, toAccount } = req.body;

        if (!type || !amount || !division || !fromAccount) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        if (type === 'transfer' && !toAccount) {
            return res.status(400).json({ message: 'Target account is required for transfers' });
        }

        const transaction = await Transaction.create({
            user: req.user.id,
            type,
            amount,
            category: type === 'transfer' ? 'Transfer' : category,
            division,
            description,
            fromAccount,
            toAccount: type === 'transfer' ? toAccount : undefined
        });

        // Update Account Balances
        if (type === 'income') {
            await Account.findByIdAndUpdate(fromAccount, { $inc: { balance: amount } });
        } else if (type === 'expense') {
            await Account.findByIdAndUpdate(fromAccount, { $inc: { balance: -amount } });
        } else if (type === 'transfer') {
            await Account.findByIdAndUpdate(fromAccount, { $inc: { balance: -amount } });
            await Account.findByIdAndUpdate(toAccount, { $inc: { balance: amount } });
        }

        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({ message: 'Invalid data', error: error.message });
    }
};

const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Revert old balances before updating
        if (transaction.type === 'income') {
            await Account.findByIdAndUpdate(transaction.fromAccount, { $inc: { balance: -transaction.amount } });
        } else if (transaction.type === 'expense') {
            await Account.findByIdAndUpdate(transaction.fromAccount, { $inc: { balance: transaction.amount } });
        } else if (transaction.type === 'transfer') {
            await Account.findByIdAndUpdate(transaction.fromAccount, { $inc: { balance: transaction.amount } });
            await Account.findByIdAndUpdate(transaction.toAccount, { $inc: { balance: -transaction.amount } });
        }

        const updatedTransaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        // Apply new balances
        if (updatedTransaction.type === 'income') {
            await Account.findByIdAndUpdate(updatedTransaction.fromAccount, { $inc: { balance: updatedTransaction.amount } });
        } else if (updatedTransaction.type === 'expense') {
            await Account.findByIdAndUpdate(updatedTransaction.fromAccount, { $inc: { balance: -updatedTransaction.amount } });
        } else if (updatedTransaction.type === 'transfer') {
            await Account.findByIdAndUpdate(updatedTransaction.fromAccount, { $inc: { balance: -updatedTransaction.amount } });
            await Account.findByIdAndUpdate(updatedTransaction.toAccount, { $inc: { balance: updatedTransaction.amount } });
        }

        res.status(200).json(updatedTransaction);
    } catch (error) {
        res.status(400).json({ message: 'Update failed', error: error.message });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        // Revert balances when deleting
        if (transaction.type === 'income') {
            await Account.findByIdAndUpdate(transaction.fromAccount, { $inc: { balance: -transaction.amount } });
        } else if (transaction.type === 'expense') {
            await Account.findByIdAndUpdate(transaction.fromAccount, { $inc: { balance: transaction.amount } });
        } else if (transaction.type === 'transfer') {
            await Account.findByIdAndUpdate(transaction.fromAccount, { $inc: { balance: transaction.amount } });
            await Account.findByIdAndUpdate(transaction.toAccount, { $inc: { balance: -transaction.amount } });
        }

        await transaction.deleteOne();
        res.status(200).json({ id: req.params.id, message: 'Transaction removed' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
};

const getSummary = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const { from, to, period } = req.query;

        const dateFilter = getDateFilter(from, to, period);

        const stats = await Transaction.aggregate([
            { $match: { user: userId, ...dateFilter } },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const summary = stats.reduce((acc, curr) => {
            if (curr._id !== 'transfer') {
                acc[curr._id] = curr.total;
            }
            return acc;
        }, { income: 0, expense: 0 });

        summary.balance = summary.income - summary.expense;

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ message: 'Aggregation failed', error: error.message });
    }
};

const getCategorySummary = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const { from, to, period } = req.query;

        const dateFilter = getDateFilter(from, to, period);

        const categoryStats = await Transaction.aggregate([
            { $match: { user: userId, type: 'expense', ...dateFilter } },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        res.status(200).json(categoryStats);
    } catch (error) {
        res.status(500).json({ message: 'Category aggregation failed', error: error.message });
    }
};

module.exports = {
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getSummary,
    getCategorySummary
};
