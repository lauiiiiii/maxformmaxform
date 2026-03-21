// 用途：简化版后端（CommonJS 语法），适合不启用 ESModule 的 Node 环境
const express = require('express')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 63002

// 中间件
app.use(cors())
app.use(express.json())

// 模拟数据
const surveys = [
  {
    id: 1,
    title: '用户满意度调查',
    description: '帮助我们了解您的使用体验',
    status: 'published',
    questions: [
      {
        id: 1,
        type: 'radio',
        title: '您对我们的服务整体满意度如何？',
        options: [
          { value: '5', label: '非常满意' },
          { value: '4', label: '满意' },
          { value: '3', label: '一般' },
          { value: '2', label: '不满意' },
          { value: '1', label: '非常不满意' }
        ]
      },
      {
        id: 2,
        type: 'checkbox',
        title: '您希望我们改进哪些方面？（多选）',
        options: [
          { value: 'ui', label: '界面设计' },
          { value: 'speed', label: '加载速度' },
          { value: 'function', label: '功能完善' },
          { value: 'support', label: '客户服务' }
        ]
      },
      {
        id: 3,
        type: 'textarea',
        title: '请留下您的宝贵建议：'
      }
    ],
    createdAt: '2024-01-01'
  }
]

// 路由
app.get('/', (req, res) => {
  res.json({ 
    message: 'TrustForm信任表单 API',
    status: 'running',
    version: '1.0.0',
    time: new Date().toLocaleString('zh-CN')
  })
})

// 获取所有问卷
app.get('/api/surveys', (req, res) => {
  res.json({
    success: true,
    data: surveys,
    message: '获取问卷列表成功'
  })
})

// 获取单个问卷
app.get('/api/surveys/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const survey = surveys.find(s => s.id === id)
  
  if (survey) {
    res.json({
      success: true,
      data: survey,
      message: '获取问卷详情成功'
    })
  } else {
    res.status(404).json({
      success: false,
      message: '问卷不存在'
    })
  }
})

// 提交问卷回答
app.post('/api/surveys/:id/responses', (req, res) => {
  const surveyId = parseInt(req.params.id)
  const answers = req.body.answers
  
  // 模拟保存逻辑
  console.log(`收到问卷 ${surveyId} 的回答:`, answers)
  
  res.json({
    success: true,
    message: '提交成功，感谢您的参与！',
    responseId: Date.now()
  })
})

// 创建新问卷
app.post('/api/surveys', (req, res) => {
  const newSurvey = {
    id: surveys.length + 1,
    title: req.body.title || '新问卷',
    description: req.body.description || '',
    status: 'draft',
    questions: req.body.questions || [],
    createdAt: new Date().toISOString().split('T')[0]
  }
  
  surveys.push(newSurvey)
  
  res.json({
    success: true,
    data: newSurvey,
    message: '问卷创建成功'
  })
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(500).json({ 
    success: false,
    message: '服务器内部错误'
  })
})

app.listen(PORT, () => {
  console.log('🚀 TrustForm信任表单 后端服务启动成功！')
  console.log(`📍 服务地址: http://127.0.0.1:${PORT}`)
  console.log(`🌐 API列表:  http://127.0.0.1:${PORT}/api/surveys`)
  console.log(`❤️  健康检查: http://127.0.0.1:${PORT}/health`)
  console.log(''.padEnd(50, '='))
})