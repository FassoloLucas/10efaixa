const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, purchaseController.getAll);
router.get('/:id', authenticateToken, purchaseController.getById);
router.post('/', authenticateToken, purchaseController.create);
router.put('/:id/status', authenticateToken, purchaseController.updateStatus);
router.delete('/:id', authenticateToken, purchaseController.delete);

module.exports = router;
