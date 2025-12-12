/**
 * 测试视频生成环境
 * 运行: node scripts/test-video-gen.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 开始检查视频生成环境...\n');

// 1. 检查 Python 环境
console.log('1️⃣ 检查 Python 环境');
const pythonProcess = spawn('python', ['--version']);

pythonProcess.stdout.on('data', (data) => {
  console.log(`   ✅ Python 版本: ${data.toString().trim()}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.log(`   ✅ Python 版本: ${data.toString().trim()}`);
});

pythonProcess.on('close', (code) => {
  if (code !== 0) {
    console.log('   ❌ Python 未安装或无法访问');
    process.exit(1);
  }

  // 2. 检查 Python 脚本文件
  console.log('\n2️⃣ 检查 Python 脚本文件');
  const scriptPath = path.join(__dirname, 'video_gen', 'generate_daily_video.py');
  if (fs.existsSync(scriptPath)) {
    console.log(`   ✅ 脚本文件存在: ${scriptPath}`);
  } else {
    console.log(`   ❌ 脚本文件不存在: ${scriptPath}`);
    process.exit(1);
  }

  // 3. 检查字体文件
  console.log('\n3️⃣ 检查字体文件');
  const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'simhei.ttf');
  if (fs.existsSync(fontPath)) {
    console.log(`   ✅ 字体文件存在: ${fontPath}`);
  } else {
    console.log(`   ⚠️  字体文件不存在: ${fontPath}`);
    console.log('      视频生成可能会使用系统默认字体');
  }

  // 4. 检查输出目录
  console.log('\n4️⃣ 检查输出目录');
  const videoDir = path.join(__dirname, '..', '..', 'RG_data', 'videos');
  if (fs.existsSync(videoDir)) {
    console.log(`   ✅ 视频目录存在: ${videoDir}`);
    const files = fs.readdirSync(videoDir);
    console.log(`   📁 目录中有 ${files.length} 个文件`);
    if (files.length > 0) {
      console.log(`   📄 文件列表:`);
      files.forEach(f => console.log(`      - ${f}`));
    }
  } else {
    console.log(`   ⚠️  视频目录不存在: ${videoDir}`);
    console.log('      将在首次生成时自动创建');
  }

  // 5. 检查环境变量
  console.log('\n5️⃣ 检查环境变量');
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  
  const requiredEnvVars = [
    'SILICONFLOW_API_KEY',
    'DOUBAO_API_KEY',
    'COS_SECRET_ID',
    'COS_SECRET_KEY',
    'COS_BUCKET_NAME'
  ];

  let envOk = true;
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      const value = process.env[varName];
      const masked = value.substring(0, 8) + '***';
      console.log(`   ✅ ${varName}: ${masked}`);
    } else {
      console.log(`   ❌ ${varName}: 未配置`);
      envOk = false;
    }
  });

  // 6. 测试 Python 依赖
  console.log('\n6️⃣ 检查 Python 依赖');
  const checkDeps = spawn('python', ['-c', 'import moviepy; import gtts; import PIL; import numpy; import qcloud_cos; print("所有依赖已安装")']);
  
  checkDeps.stdout.on('data', (data) => {
    console.log(`   ✅ ${data.toString().trim()}`);
  });

  checkDeps.stderr.on('data', (data) => {
    console.log(`   ❌ 缺少依赖: ${data.toString().trim()}`);
    console.log('\n   💡 修复方法：');
    console.log('      cd backend/scripts/video_gen');
    console.log('      pip install -r requirements.txt');
  });

  checkDeps.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ 环境检查完成！可以尝试生成视频');
      console.log('\n💡 下一步：');
      console.log('   1. 在前端页面点击 "🎬 生成今日视频" 按钮');
      console.log('   2. 或者在后端运行: POST /api/video/generate');
    } else {
      console.log('\n❌ 环境检查失败，请先安装 Python 依赖');
    }
  });
});
