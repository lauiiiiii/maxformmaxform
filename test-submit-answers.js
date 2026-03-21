// 测试脚本：向问卷提交模拟答案数据
const http = require('http')

const BACKEND_URL = 'http://127.0.0.1:63002'
const SURVEY_ID = 1  // 使用默认的测试问卷ID

// 生成随机答案（根据真实问卷结构）
function generateRandomAnswers() {
  // 问卷1的题目结构：
  // 1. 单选题：您对我们的服务整体满意度如何？（5个选项）
  // 2. 多选题：您希望我们改进哪些方面？（4个选项）
  // 3. 填空题：请留下您的宝贵建议
  
  const satisfactionOptions = ['非常满意', '满意', '一般', '不满意', '非常不满意']
  const improvementOptions = ['界面设计', '加载速度', '功能完善', '客户服务']
  const suggestions = [
    '希望增加更多实用功能',
    '界面设计很友好，继续保持',
    '加载速度需要优化',
    '整体体验不错，期待更多更新',
    '客服响应很及时，赞一个',
    '价格合理，性价比高',
    '操作简单易上手',
    '还有改进空间，加油！'
  ]
  
  // 随机选择答案
  const randomSatisfaction = satisfactionOptions[Math.floor(Math.random() * satisfactionOptions.length)]
  const randomImprovement = []
  const numImprovements = Math.floor(Math.random() * 3) + 1  // 1-3个选项
  for (let i = 0; i < numImprovements; i++) {
    const opt = improvementOptions[Math.floor(Math.random() * improvementOptions.length)]
    if (!randomImprovement.includes(opt)) {
      randomImprovement.push(opt)
    }
  }
  const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)]
  
  return {
    answers: {
      '1': randomSatisfaction,  // 第1题：单选
      '2': randomImprovement,   // 第2题：多选
      '3': randomSuggestion     // 第3题：填空
    }
  }
}

// 提交答案
function submitAnswer(surveyId, answers) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(answers)
    const options = {
      hostname: '127.0.0.1',
      port: 63002,
      path: `/api/surveys/${surveyId}/responses`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }

    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            resolve({ responseId: 'unknown' })
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`))
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// 批量提交
async function batchSubmit(count = 50) {
  console.log(`🚀 开始向问卷 ${SURVEY_ID} 提交 ${count} 份测试答案...`)
  
  let successCount = 0
  for (let i = 0; i < count; i++) {
    try {
      const answers = generateRandomAnswers()
      const result = await submitAnswer(SURVEY_ID, answers)
      successCount++
      console.log(`✅ [${i + 1}/${count}] 提交成功:`, result.responseId || result.message)
      // 随机延迟 50-200ms
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50))
    } catch (error) {
      console.error(`❌ [${i + 1}/${count}] 提交失败:`, error.message)
    }
  }
  
  console.log(`\n✨ 批量提交完成！成功: ${successCount}/${count}`)
}

// 执行
batchSubmit(50).catch(console.error)
