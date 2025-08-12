const pool = require('../config/database');

class PurchaseController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 10, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT p.*, s.name as supplier_name, u.username as created_by_name
        FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (start_date) {
        query += ` AND p.purchase_date >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND p.purchase_date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      query += ` ORDER BY p.purchase_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      const countQuery = `
        SELECT COUNT(*) FROM purchases p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE 1=1
      `;
      
      const countParams = [];
      let countParamIndex = 1;

      if (start_date) {
        countQuery += ` AND p.purchase_date >= $${countParamIndex}`;
        countParams.push(start_date);
        countParamIndex++;
      }

      if (end_date) {
        countQuery += ` AND p.purchase_date <= $${countParamIndex}`;
        countParams.push(end_date);
      }

      const countResult = await pool.query(countQuery, countParams);

      res.json({
        purchases: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        pages: Math.ceil(countResult.rows[0].count / limit)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const purchaseResult = await pool.query(
        'SELECT p.*, s.name as supplier_name, u.username as created_by_name FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id LEFT JOIN users u ON p.created_by = u.id WHERE p.id = $1',
        [id]
      );

      if (purchaseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Compra não encontrada' });
      }

      const itemsResult = await pool.query(
        `SELECT pi.*, p.name as product_name 
         FROM purchase_items pi 
         JOIN products p ON pi.product_id = p.id 
         WHERE pi.purchase_id = $1`,
        [id]
      );

      const purchase = purchaseResult.rows[0];
      purchase.items = itemsResult.rows;

      res.json(purchase);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { supplier_id, items, expected_delivery } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Itens da compra são obrigatórios' });
      }

      let totalAmount = 0;
      const purchaseItems = [];

      for (const item of items) {
        const productResult = await client.query(
          'SELECT * FROM products WHERE id = $1',
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Produto ${item.product_id} não encontrado`);
        }

        const product = productResult.rows[0];
        const totalPrice = item.unit_price * item.quantity;
        totalAmount += totalPrice;

        purchaseItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: totalPrice
        });
      }

      const purchaseResult = await client.query(
        'INSERT INTO purchases (supplier_id, total_amount, expected_delivery, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [supplier_id, totalAmount, expected_delivery, req.user.id]
      );

      const purchase = purchaseResult.rows[0];

      for (const item of purchaseItems) {
        await client.query(
          'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [purchase.id, item.product_id, item.quantity, item.unit_price, item.total_price]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Compra criada com sucesso',
        purchase
      });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await pool.query(
        'UPDATE purchases SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Compra não encontrada' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;

      const itemsResult = await client.query(
        'SELECT * FROM purchase_items WHERE purchase_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('DELETE FROM purchases WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({ message: 'Compra cancelada com sucesso' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new PurchaseController();
