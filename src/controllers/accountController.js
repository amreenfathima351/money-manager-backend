const Account = require('../models/Account');

const getAccounts = async (req, res) => {
    try {
        const accounts = await Account.find({ user: req.user.id });
        res.status(200).json(accounts);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const addAccount = async (req, res) => {
    try {
        const { name, type, balance } = req.body;
        const account = await Account.create({
            user: req.user.id,
            name,
            type,
            balance: balance || 0
        });
        res.status(201).json(account);
    } catch (error) {
        res.status(400).json({ message: 'Invalid data', error: error.message });
    }
};

const updateAccount = async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);
        if (!account || account.user.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Account not found' });
        }
        const updatedAccount = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedAccount);
    } catch (error) {
        res.status(400).json({ message: 'Update failed', error: error.message });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);
        if (!account || account.user.toString() !== req.user.id) {
            return res.status(404).json({ message: 'Account not found' });
        }
        await account.deleteOne();
        res.status(200).json({ message: 'Account removed' });
    } catch (error) {
        res.status(500).json({ message: 'Delete failed', error: error.message });
    }
};

module.exports = { getAccounts, addAccount, updateAccount, deleteAccount };
