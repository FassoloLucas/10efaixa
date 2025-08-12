const pool = require('../config/database');

class ProductController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT p.*, s.name as supplier_name 
        FROM products p 
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.name ILIKE $1 OR p.sku ILIKE $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [`%${search}%`, limit, offset]);
      
      const countQuery = `
        SELECT COUNT(*) FROM products 
        WHERE name ILIKE $1 OR sku ILIKE $1
      `;
      const countResult = await pool.query(countQuery, [`%${search}%`]);

      res.json({
        products: result.rows,
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
      const result = await pool.query(
        'SELECT p.*, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const { name, description, sku, price, stock_quantity, min_stock, supplier_id } = req.body;

      const result = await pool.query(
        'INSERT INTO products (name, description, sku, price, stock_quantity, min_stock, supplier_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, description, sku, price, stock_quantity, min_stock, supplier_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'SKU já existe' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, sku, price, stock_quantity, min_stock, supplier_id } = req.body;

      const result = await pool.query(
        'UPDATE products SET name = $1, description = $2, sku = $3, price = $4, stock_quantity = $5, min_stock = $6, supplier_id = $7 WHERE id = $8 RETURNING *',
        [name, description, sku, price, stock_quantity, min_stock, supplier_id, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'SKU já existe' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      res.json({ message: 'Produto deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getLowStock(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM products WHERE stock_quantity <= min_stock ORDER BY stock_quantity ASC'
      );

      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ProductController();
