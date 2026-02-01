const express = require('express');
const router = express.Router();
const { getAccounts, addAccount, updateAccount, deleteAccount } = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getAccounts).post(addAccount);
router.route('/:id').put(updateAccount).delete(deleteAccount);

module.exports = router;
