const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function seed() {
  try {
    console.log('Criando usuário padrão...');
    
    const username = '10eFaixa';
    const password = '963852';
    const email = 'admin@businesscontrol.com';
    
    // Verificar se o usuário já existe
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (existingUser.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await pool.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [username, email, hashedPassword, 'admin']
      );
      
      console.log('✅ Usuário padrão criado com sucesso!');
      console.log(`Usuário: ${username}`);
      console.log(`Senha: ${password}`);
    } else {
      console.log('ℹ️ Usuário padrão já existe');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário padrão:', error.message);
  } finally {
    await pool.end();
  }
}

seed();
