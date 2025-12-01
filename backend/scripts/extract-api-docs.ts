/**
 * API 文档自动提取工具
 * 从后端控制器代码中提取实际的 API 响应结构
 * 生成 BACKEND_API_ACTUAL_RESPONSES.md
 */

import * as fs from 'fs';
import * as path from 'path';

interface ApiEndpoint {
  method: string;
  path: string;
  controller: string;
  responseExample: string;
  description?: string;
}

const controllersDir = path.join(__dirname, '../src/controllers');
const outputFile = path.join(__dirname, '../../BACKEND_API_ACTUAL_RESPONSES.md');

/**
 * 读取所有控制器文件
 */
function getControllerFiles(): string[] {
  const files = fs.readdirSync(controllersDir);
  return files.filter(file => file.endsWith('.controller.ts'));
}

/**
 * 从控制器代码中提取 API 信息
 * 这是一个简化版本，实际需要更复杂的 AST 解析
 */
function extractApiInfo(filePath: string): ApiEndpoint[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const endpoints: ApiEndpoint[] = [];
  
  // 简单的正则匹配（生产环境建议使用 TypeScript Compiler API）
  const exportPattern = /export const (\w+) = async/g;
  const resJsonPattern = /res\.json\(([\s\S]*?)\);/g;
  
  let match;
  while ((match = exportPattern.exec(content)) !== null) {
    const functionName = match[1];
    
    // 查找该函数内的 res.json 调用
    const functionStart = match.index;
    const nextFunctionMatch = exportPattern.exec(content);
    const functionEnd = nextFunctionMatch ? nextFunctionMatch.index : content.length;
    exportPattern.lastIndex = functionStart + 1; // 重置
    
    const functionBody = content.substring(functionStart, functionEnd);
    
    // 提取响应示例
    const responseMatches = [...functionBody.matchAll(resJsonPattern)];
    if (responseMatches.length > 0) {
      endpoints.push({
        method: 'GET/POST/PUT/DELETE', // 需要从路由中获取
        path: '/api/...',
        controller: functionName,
        responseExample: responseMatches[0][1]
      });
    }
  }
  
  return endpoints;
}

/**
 * 生成 Markdown 文档
 */
function generateMarkdown(endpointsByController: Record<string, ApiEndpoint[]>): string {
  let markdown = `# BACKEND API — 实际成功响应格式（自动生成）

**生成时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
**数据来源**: 后端控制器源码自动提取

---

## ⚠️ 重要说明

- 本文档由脚本自动生成，反映后端实际返回结构
- 前端类型定义必须严格遵循本文档
- 如需更新，请运行：\`npm run extract-api-docs\`

---

## 通用响应格式

\`\`\`typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
\`\`\`

---

`;

  // 按控制器分组输出
  for (const [controller, endpoints] of Object.entries(endpointsByController)) {
    markdown += `## ${controller}\n\n`;
    
    endpoints.forEach((endpoint, index) => {
      markdown += `### ${index + 1}. ${endpoint.controller}\n\n`;
      markdown += `**路径**: \`${endpoint.method} ${endpoint.path}\`\n\n`;
      
      if (endpoint.description) {
        markdown += `**说明**: ${endpoint.description}\n\n`;
      }
      
      markdown += `**成功响应示例**:\n\n\`\`\`json\n${endpoint.responseExample}\n\`\`\`\n\n`;
      markdown += `---\n\n`;
    });
  }

  return markdown;
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始扫描控制器文件...');
  
  const controllerFiles = getControllerFiles();
  console.log(`📁 找到 ${controllerFiles.length} 个控制器文件`);
  
  const allEndpoints: Record<string, ApiEndpoint[]> = {};
  
  for (const file of controllerFiles) {
    const filePath = path.join(controllersDir, file);
    const controllerName = file.replace('.controller.ts', '');
    
    console.log(`  ⚙️  解析 ${file}...`);
    
    try {
      const endpoints = extractApiInfo(filePath);
      if (endpoints.length > 0) {
        allEndpoints[controllerName] = endpoints;
      }
    } catch (error) {
      console.error(`  ❌ 解析 ${file} 失败:`, error);
    }
  }
  
  console.log('\n📝 生成 Markdown 文档...');
  const markdown = generateMarkdown(allEndpoints);
  
  fs.writeFileSync(outputFile, markdown, 'utf-8');
  console.log(`✅ 文档已生成: ${outputFile}`);
  console.log('\n💡 提示: 这是一个基础版本的提取工具');
  console.log('   建议手动审查生成的文档，确保格式正确');
}

// 运行
main().catch(console.error);
