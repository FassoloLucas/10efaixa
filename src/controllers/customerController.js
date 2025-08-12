const pool = require('../config/database');

class CustomerController {
  async getAll(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT * FROM customers 
        WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [`%${search}%`, limit, offset]);
      
      const countQuery = `
        SELECT COUNT(*) FROM customers 
        WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
      `;
      const countResult = await pool.query(countQuery, [`%${search}%`]);

      res.json({
        customers: result.rows,
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
      const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const { name, email, phone, address, cpf_cnpj } = req.body;

      const result = await pool.query(
        'INSERT INTO customers (name, email, phone, address, cpf_cnpj) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, phone, address, cpf_cnpj]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, email, phone, address, cpf_cnpj } = req.body;

      const result = await pool.query(
        'UPDATE customers SET name = $1, email = $2, phone = $3, address = $4, cpf_cnpj = $5 WHERE id = $6 RETURNING *',
        [name, email, phone, address, cpf_cnpj, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.json({ message: 'Cliente deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new CustomerController();
