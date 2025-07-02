const fs = require('fs');

const envContent = `# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=vehicle_repair_system
DB_USER=root
DB_PASSWORD=123456

# 服务器配置
PORT=3000
NODE_ENV=development

# JWT配置 - 确保与代码一致
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 文件上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# 应用配置
APP_NAME=车辆维修管理系统
APP_VERSION=1.0.0
`;

fs.writeFileSync('.env', envContent, 'utf8');
console.log('✅ .env文件创建成功，JWT密钥已统一！'); 