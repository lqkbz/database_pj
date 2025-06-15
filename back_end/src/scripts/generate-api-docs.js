#!/usr/bin/env node

/**
 * 此脚本用于生成OpenAPI规范文件
 * 可以在开发过程中手动运行，或在构建/部署前自动运行
 */

const path = require('path');
const { generateApiSpec, saveApiSpecToFile } = require('../utils/apiDocs');

async function main() {
  console.log('开始生成OpenAPI规范文档...');
  
  try {
    // 生成规范
    const spec = generateApiSpec();
    console.log('规范生成成功!');
    
    // 保存到文件
    const success = await saveApiSpecToFile(spec);
    
    if (success) {
      console.log('OpenAPI规范已保存到文件!');
      process.exit(0);
    } else {
      console.error('保存OpenAPI规范失败!');
      process.exit(1);
    }
  } catch (error) {
    console.error('生成或保存规范时出错:', error);
    process.exit(1);
  }
}

main(); 