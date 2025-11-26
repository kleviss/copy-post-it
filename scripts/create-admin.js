const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    console.log('Create Admin User\n');
    
    const email = await question('Email: ');
    const password = await question('Password: ');
    const name = await question('Name (optional): ') || null;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log('User with this email already exists!');
      rl.close();
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'admin',
        name,
      },
    });

    console.log('\nAdmin user created successfully!');
    console.log('ID:', admin.id);
    console.log('Email:', admin.email);
    console.log('Role:', admin.role);
    
    rl.close();
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error creating admin:', error);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();

