const pool = require('../config/database');

class SaleController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 10, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT s.*, c.name as customer_name, u.username as created_by_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN users u ON s.created_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      if (start_date) {
        query += ` AND s.sale_date >= $${paramIndex}`;
        params.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND s.sale_date <= $${paramIndex}`;
        params.push(end_date);
        paramIndex++;
      }

      query += ` ORDER BY s.sale_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      const countQuery = `
        SELECT COUNT(*) FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE 1=1
      `;
      
      const countParams = [];
      let countParamIndex = 1;

      if (start_date) {
        countQuery += ` AND s.sale_date >= $${countParamIndex}`;
        countParams.push(start_date);
        countParamIndex++;
      }

      if (end_date) {
        countQuery += ` AND s.sale_date <= $${countParamIndex}`;
        countParams.push(end_date);
      }

      const countResult = await pool.query(countQuery, countParams);

      res.json({
        sales: result.rows,
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
      
      const saleResult = await pool.query(
        'SELECT s.*, c.name as customer_name, u.username as created_by_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.created_by = u.id WHERE s.id = $1',
        [id]
      );

      if (saleResult.rows.length === 0) {
        return res.status(404).json({ error: 'Venda não encontrada' });
      }

      const itemsResult = await pool.query(
        `SELECT si.*, p.name as product_name 
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         WHERE si.sale_id = $1`,
        [id]
      );

      const sale = saleResult.rows[0];
      sale.items = itemsResult.rows;

      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { customer_id, items, payment_method = 'cash' } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Itens da venda são obrigatórios' });
      }

      let totalAmount = 0;
      const saleItems = [];

      for (const item of items) {
        const productResult = await client.query(
          'SELECT * FROM products WHERE id = $1',
          [item.product_id]
        );

        if (productResult.rows.length === 0) {
          throw new Error(`Produto ${item.product_id} não encontrado`);
        }

        const product = productResult.rows[0];
        
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Estoque insuficiente para o produto ${product.name}`);
        }

        const totalPrice = product.price * item.quantity;
        totalAmount += totalPrice;

        saleItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price,
          total_price: totalPrice
        });

        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      const saleResult = await client.query(
        'INSERT INTO sales (customer_id, total_amount, payment_method, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [customer_id, totalAmount, payment_method, req.user.id]
      );

      const sale = saleResult.rows[0];

      for (const item of saleItems) {
        await client.query(
          'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES ($1, $2, $3, $4, $5)',
          [sale.id, item.product_id, item.quantity, item.unit_price, item.total_price]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Venda criada com sucesso',
        sale
      });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: error.message });
    } finally {
      client.release();
    }
  }

  async delete(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const { id } = req.params;

      const itemsResult = await client.query(
        'SELECT * FROM sale_items WHERE sale_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('DELETE FROM sales WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({ message: 'Venda cancelada com sucesso' });
    } catch (error) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      client.release();
    }
  }
}

module.exports = new SaleController();
