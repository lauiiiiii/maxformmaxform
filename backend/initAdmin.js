// 用途：初始化管理员账户脚本（连接 MongoDB，创建 admin/admin123，如已存在则跳过）
require('dotenv').config();
const bcrypt = require('bcryptjs');
const database = require('./src/database');
const User = database.getModel('User');

async function ensureAdmin() {
  try {
    await database.connect();
  } catch (err) {
    console.error('无法连接数据库：', err.message);
    process.exitCode = 1;
    return;
  }

  try {
    const exist = await User.findOne({ username: 'admin' });
    if (exist) {
      console.log('Admin user already exists');
      return;
    }

    const password = process.env.ADMIN_INIT_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(password, 10);
    await User.create({
      username: 'admin',
      password: hash,
      email: process.env.ADMIN_INIT_EMAIL || 'admin@example.com',
      role: 'admin',
      isActive: true
    });
    console.log('Admin user created');
  } catch (err) {
    console.error('初始化管理员失败：', err.message);
    process.exitCode = 1;
  } finally {
    if (database.disconnect) {
      await database.disconnect();
    }
  }
}

ensureAdmin();
