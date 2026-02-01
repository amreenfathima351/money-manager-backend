const mongoose = require('mongoose');

const accountSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        name: {
            type: String,
            required: [true, 'Please add an account name'],
            trim: true,
        },
        type: {
            type: String,
            required: [true, 'Please select account type'],
            enum: ['bank', 'cash', 'credit', 'savings', 'other'],
            default: 'cash',
        },
        balance: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Account', accountSchema);
