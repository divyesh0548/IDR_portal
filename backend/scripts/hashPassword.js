const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Helper script to hash passwords
 * Usage: node scripts/hashPassword.js
 */
rl.question('Enter password to hash: ', async (password) => {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('\nHashed password:');
    console.log(hashedPassword);
    console.log('\nYou can use this hashed password in your database.');
    rl.close();
  } catch (error) {
    console.error('Error hashing password:', error);
    rl.close();
  }
});

