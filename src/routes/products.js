const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, productController.getAll);
router.get('/low-stock', authenticateToken, productController.getLowStock);
router.get('/:id', authenticateToken, productController.getById);
router.post('/', authenticateToken, productController.create);
router.put('/:id', authenticateToken, productController.update);
router.delete('/:id', authenticateToken, productController.delete);

module.exports = router;
