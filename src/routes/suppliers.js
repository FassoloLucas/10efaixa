const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, supplierController.getAll);
router.get('/:id', authenticateToken, supplierController.getById);
router.post('/', authenticateToken, supplierController.create);
router.put('/:id', authenticateToken, supplierController.update);
router.delete('/:id', authenticateToken, supplierController.delete);

module.exports = router;
