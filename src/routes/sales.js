const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, saleController.getAll);
router.get('/:id', authenticateToken, saleController.getById);
router.post('/', authenticateToken, saleController.create);
router.delete('/:id', authenticateToken, saleController.delete);

module.exports = router;
