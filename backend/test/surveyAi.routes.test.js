import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import config from '../src/config/index.js'
import SystemConfig from '../src/models/SystemConfig.js'
import { registerApiRouteHarness } from './helpers/apiRouteHarness.js'

const { request, requestPublic } = registerApiRouteHarness()

function createToken(payload = {}) {
  return jwt.sign(
    { sub: 2, username: 'user', roleCode: 'user', ...payload },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

test('GET /api/surveys/ai/protocol returns the survey AI generation protocol', { concurrency: false }, async () => {
  const { response, json } = await request('/surveys/ai/protocol')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.kind, 'survey.generation.protocol')
  assert.equal(json.data.version, '2026-03-31')
  assert.equal(json.data.output.kind, 'survey.generation.result')
  assert.equal(json.data.promptTemplate.version, '2026-03-31')
  assert.ok(Array.isArray(json.data.supportedQuestionTypes))
  assert.ok(json.data.supportedQuestionTypes.some(item => item.type === 'radio'))
})

test('POST /api/surveys/ai/generate returns generated survey draft from configured provider', { concurrency: false }, async () => {
  const originalFetch = global.fetch

  SystemConfig.findByKey = async () => ({
    id: 1,
    configKey: 'ai_provider',
    configValue: {
      providerId: 'openai',
      providerLabel: 'OpenAI',
      apiKey: 'sk-proj-test-001',
      apiBase: 'https://api.openai.com',
      endpoint: '/v1/chat/completions',
      model: 'gpt-4.1-mini'
    }
  })

  global.fetch = async (url, init) => {
    const normalizedUrl = String(url)
    if (normalizedUrl.startsWith('http://127.0.0.1:')) {
      return originalFetch(url, init)
    }

    assert.equal(normalizedUrl, 'https://api.openai.com/v1/chat/completions')
    const payload = JSON.parse(String(init?.body || '{}'))
    assert.equal(payload.model, 'gpt-4.1-mini')

    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                kind: 'survey.generation.result',
                version: '2026-03-31',
                title: 'Employee satisfaction survey',
                description: 'Quarterly employee experience check-in',
                questions: [
                  {
                    qid: 'Q1',
                    title: 'How satisfied are you with your overall work experience?',
                    type: 'radio',
                    required: true,
                    options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied']
                  },
                  {
                    qid: 'Q2',
                    title: 'Which areas should be improved first?',
                    type: 'checkbox',
                    required: false,
                    options: ['Compensation', 'Communication', 'Growth', 'Work environment']
                  },
                  {
                    qid: 'Q3',
                    title: 'Rate the current collaboration efficiency',
                    type: 'number',
                    required: true,
                    validation: { min: 1, max: 10, step: 1 }
                  }
                ]
              })
            }
          }
        ]
      })
    }
  }

  try {
    const { response, json } = await request('/surveys/ai/generate', {
      method: 'POST',
      body: {
        prompt: 'Generate an employee satisfaction survey'
      }
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.kind, 'survey.generation.result')
    assert.equal(json.data.protocolVersion, '2026-03-31')
    assert.equal(json.data.promptTemplateVersion, '2026-03-31')
    assert.equal(json.data.title, 'Employee satisfaction survey')
    assert.equal(json.data.provider.providerId, 'openai')
    assert.equal(json.data.provider.model, 'gpt-4.1-mini')
    assert.equal(json.data.aiMeta.source, 'survey.ai.generate')
    assert.equal(json.data.aiMeta.generatedBy, 'gpt-4.1-mini')
    assert.equal(json.data.aiMeta.providerId, 'openai')
    assert.equal(json.data.aiMeta.protocolVersion, '2026-03-31')
    assert.equal(json.data.aiMeta.promptTemplateVersion, '2026-03-31')
    assert.equal(json.data.aiMeta.reviewStatus, 'draft')
    assert.match(String(json.data.aiMeta.generatedAt || ''), /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(json.data.questions.length, 3)
    assert.equal(json.data.questions[0].legacyType, 3)
    assert.equal(json.data.questions[1].legacyType, 4)
    assert.equal(json.data.questions[2].legacyType, 8)
  } finally {
    global.fetch = originalFetch
  }
})

test('POST /api/surveys/ai/generate allows normal authenticated users', { concurrency: false }, async () => {
  const originalFetch = global.fetch

  SystemConfig.findByKey = async () => ({
    id: 1,
    configKey: 'ai_provider',
    configValue: {
      providerId: 'openai',
      providerLabel: 'OpenAI',
      apiKey: 'sk-proj-test-001',
      apiBase: 'https://api.openai.com',
      endpoint: '/v1/chat/completions',
      model: 'gpt-4.1-mini'
    }
  })

  global.fetch = async (url, init) => {
    const normalizedUrl = String(url)
    if (normalizedUrl.startsWith('http://127.0.0.1:')) {
      return originalFetch(url, init)
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                kind: 'survey.generation.result',
                version: '2026-03-31',
                title: 'Customer follow-up survey',
                description: '',
                questions: [
                  {
                    qid: 'Q1',
                    title: 'Would you buy from us again?',
                    type: 'radio',
                    required: true,
                    options: ['Yes', 'No']
                  }
                ]
              })
            }
          }
        ]
      })
    }
  }

  try {
    const { response, json } = await requestPublic('/surveys/ai/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${createToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: 'Generate a customer follow-up survey' })
    })

    assert.equal(response.status, 200)
    assert.equal(json.success, true)
    assert.equal(json.data.questions[0].legacyType, 3)
  } finally {
    global.fetch = originalFetch
  }
})

test('POST /api/surveys/ai/generate rejects missing AI provider config', { concurrency: false }, async () => {
  SystemConfig.findByKey = async () => null

  const { response, json } = await request('/surveys/ai/generate', {
    method: 'POST',
    body: {
      prompt: 'Generate a market research survey'
    }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'AI_SURVEY_PROVIDER_NOT_CONFIGURED')
})
