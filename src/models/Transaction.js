const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        type: {
            type: String,
            required: [true, 'Please select a type (income, expense, or transfer)'],
            enum: ['income', 'expense', 'transfer'],
        },
        amount: {
            type: Number,
            required: [true, 'Please add an amount'],
            min: [0.01, 'Amount must be greater than 0'],
        },
        fromAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: [true, 'Please select an account'],
        },
        toAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account',
            required: function () {
                return this.type === 'transfer';
            },
        },
        category: {
            type: String,
            required: function () {
                return this.type !== 'transfer';
            },
        },
        division: {
            type: String,
            required: [true, 'Please select a division'],
            enum: ['office', 'personal'],
        },
        description: {
            type: String,
            required: [true, 'Please add a description'],
            maxlength: [100, 'Description cannot be more than 100 characters'],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Transaction', transactionSchema);
