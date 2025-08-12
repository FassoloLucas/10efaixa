const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, customerController.getAll);
router.get('/:id', authenticateToken, customerController.getById);
router.post('/', authenticateToken, customerController.create);
router.put('/:id', authenticateToken, customerController.update);
router.delete('/:id', authenticateToken, customerController.delete);

module.exports = router;
