import systemConfigRepository from '../repositories/systemConfigRepository.js'
import { createHttpError } from '../http/errors.js'
import { validateSurveyDraft } from './surveyCommandService.js'

const AI_PROVIDER_CONFIG_KEY = 'ai_provider'
const AI_GENERATION_TIMEOUT_MS = 60000
const SURVEY_AI_PROTOCOL_KIND = 'survey.generation.protocol'
const SURVEY_AI_RESULT_KIND = 'survey.generation.result'
const SURVEY_AI_PROTOCOL_VERSION = '2026-03-31'
const SURVEY_AI_PROMPT_TEMPLATE_ID = 'survey.generate.default'
const SURVEY_AI_PROMPT_TEMPLATE_VERSION = '2026-03-31'
const CHAT_COMPLETION_PROVIDER_IDS = new Set([
  'openai',
  'openrouter',
  'deepseek',
  'moonshot',
  'qwen',
  'siliconflow',
  'zhipu',
  'baidu'
])
const DEFAULT_PROVIDER_ENDPOINTS = Object.freeze({
  openai: '/v1/chat/completions',
  openrouter: '/v1/chat/completions',
  deepseek: '/chat/completions',
  moonshot: '/v1/chat/completions',
  qwen: '/v1/chat/completions',
  siliconflow: '/v1/chat/completions',
  zhipu: '/api/paas/v4/chat/completions',
  baidu: '/v2/chat/completions',
  anthropic: '/v1/messages',
  gemini: '/v1beta/models/{model}:generateContent'
})
const ALLOWED_AI_TYPES = new Set(['radio', 'checkbox', 'text', 'textarea', 'number', 'date', 'select'])
const JSON_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i
const SURVEY_AI_SUPPORTED_QUESTION_TYPES = Object.freeze([
  { type: 'radio', label: 'Single choice', legacyType: 3, requiresOptions: true },
  { type: 'checkbox', label: 'Multiple choice', legacyType: 4, requiresOptions: true },
  { type: 'text', label: 'Single line text', legacyType: 1, requiresOptions: false },
  { type: 'textarea', label: 'Long text', legacyType: 2, requiresOptions: false },
  { type: 'number', label: 'Number', legacyType: 8, requiresOptions: false, requiresValidation: true },
  { type: 'date', label: 'Date', legacyType: 14, requiresOptions: false },
  { type: 'select', label: 'Dropdown', legacyType: 7, requiresOptions: true }
])
const SURVEY_AI_OUTPUT_RULES = Object.freeze([
  'Return only valid JSON without markdown fences or commentary.',
  'Set kind to the exact result kind and version to the exact protocol version.',
  'Do not add extra top-level fields beyond the protocol schema.',
  'Keep qid unique and stable within a single response.',
  'Use at least 2 options for radio, checkbox, and select questions.',
  'Do not include options for text, textarea, number, or date questions.',
  'Use validation only for number questions and keep min/max/step numeric.',
  'Prefer 5 to 12 questions unless the user clearly asks for a different scope.',
  'Avoid repeating existing draft intent when context questions are provided.',
  'Keep wording concise, production-ready, and directly usable in a survey editor.'
])

function normalizeText(value) {
  return String(value || '').trim()
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map(cloneJsonValue)
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneJsonValue(value[key])
      return result
    }, {})
  }
  return value
}

function joinUrl(base, endpoint) {
  const normalizedBase = normalizeText(base).replace(/\/+$/, '')
  const normalizedEndpoint = normalizeText(endpoint)

  if (!normalizedBase) return normalizedEndpoint
  if (!normalizedEndpoint) return normalizedBase
  if (/^https?:\/\//i.test(normalizedEndpoint)) return normalizedEndpoint

  return `${normalizedBase}/${normalizedEndpoint.replace(/^\/+/, '')}`
}

function readStoredProviderConfig(row) {
  const value = row?.configValue && typeof row.configValue === 'object' ? row.configValue : {}
  return {
    providerId: normalizeText(value.providerId),
    providerLabel: normalizeText(value.providerLabel),
    apiKey: normalizeText(value.apiKey),
    apiBase: normalizeText(value.apiBase),
    endpoint: normalizeText(value.endpoint),
    model: normalizeText(value.model),
    note: normalizeText(value.note)
  }
}

function resolveProviderEndpoint(provider) {
  if (provider.endpoint) return provider.endpoint
  return DEFAULT_PROVIDER_ENDPOINTS[provider.providerId] || '/v1/chat/completions'
}

function normalizeAiGeneratePayload(body = {}) {
  if (!isPlainObject(body)) {
    throw createHttpError(400, 'AI_SURVEY_INVALID_REQUEST', 'AI survey request must be an object')
  }

  const prompt = normalizeText(body.prompt)
  if (!prompt) {
    throw createHttpError(400, 'AI_SURVEY_PROMPT_REQUIRED', 'AI survey prompt is required')
  }
  if (prompt.length > 4000) {
    throw createHttpError(400, 'AI_SURVEY_PROMPT_TOO_LONG', 'AI survey prompt must be 4000 characters or fewer')
  }

  const context = isPlainObject(body.context) ? body.context : {}
  const rawContextQuestions = Array.isArray(context.questions) ? context.questions : []

  return {
    prompt,
    context: {
      title: normalizeText(context.title),
      description: normalizeText(context.description),
      questions: rawContextQuestions
        .filter(isPlainObject)
        .map(question => ({
          title: normalizeText(question.title),
          type: normalizeText(question.type)
        }))
        .filter(question => question.title)
        .slice(0, 20)
    }
  }
}

function renderPromptTemplate(template, variables) {
  return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => String(variables?.[key] ?? ''))
}

function createSurveyAiProtocol() {
  const exampleResponse = {
    kind: SURVEY_AI_RESULT_KIND,
    version: SURVEY_AI_PROTOCOL_VERSION,
    title: 'Employee satisfaction pulse survey',
    description: 'A short pulse survey for quarterly employee experience reviews.',
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
        options: ['Compensation', 'Communication', 'Growth opportunities', 'Work environment']
      },
      {
        qid: 'Q3',
        title: 'Rate the current collaboration efficiency',
        type: 'number',
        required: true,
        validation: { min: 1, max: 10, step: 1 }
      }
    ]
  }

  return {
    kind: SURVEY_AI_PROTOCOL_KIND,
    version: SURVEY_AI_PROTOCOL_VERSION,
    promptTemplate: {
      id: SURVEY_AI_PROMPT_TEMPLATE_ID,
      version: SURVEY_AI_PROMPT_TEMPLATE_VERSION,
      systemTemplate: [
        'You generate survey drafts for a survey editor.',
        'Return only valid JSON.',
        'Protocol kind: {{protocol_kind}}',
        'Protocol version: {{protocol_version}}',
        'Output result kind: {{result_kind}}',
        'Output JSON schema:',
        '{',
        '  "kind": "{{result_kind}}",',
        '  "version": "{{protocol_version}}",',
        '  "title": "string",',
        '  "description": "string",',
        '  "questions": [',
        '    {',
        '      "qid": "Q1",',
        '      "title": "string",',
        '      "type": "radio|checkbox|text|textarea|number|date|select",',
        '      "required": true,',
        '      "options": ["Option A", "Option B"],',
        '      "placeholder": "optional string",',
        '      "description": "optional string",',
        '      "validation": { "min": 0, "max": 100, "step": 1 }',
        '    }',
        '  ]',
        '}',
        'Rules:',
        ...SURVEY_AI_OUTPUT_RULES.map(rule => `- ${rule}`)
      ].join('\n'),
      userTemplate: [
        'User request:',
        '{{prompt}}',
        '',
        'Current draft context:',
        '- Current title: {{context_title}}',
        '- Current description: {{context_description}}',
        '{{context_questions_block}}',
        '',
        'Generation guidance:',
        '- If context contains existing questions, generate complementary questions instead of repeating the same intent.',
        '- Keep the final draft coherent as a single survey.'
      ].join('\n'),
      variables: [
        'prompt',
        'context_title',
        'context_description',
        'context_questions_block',
        'protocol_kind',
        'protocol_version',
        'result_kind'
      ]
    },
    output: {
      kind: SURVEY_AI_RESULT_KIND,
      version: SURVEY_AI_PROTOCOL_VERSION,
      format: 'json',
      requiredTopLevelFields: ['kind', 'version', 'title', 'description', 'questions'],
      questionFields: ['qid', 'title', 'type', 'required', 'options', 'placeholder', 'description', 'validation']
    },
    supportedQuestionTypes: SURVEY_AI_SUPPORTED_QUESTION_TYPES.map(item => ({ ...item })),
    notes: [...SURVEY_AI_OUTPUT_RULES],
    exampleResponse: cloneJsonValue(exampleResponse)
  }
}

function buildSystemPrompt(protocol = createSurveyAiProtocol()) {
  return renderPromptTemplate(protocol.promptTemplate.systemTemplate, {
    protocol_kind: protocol.kind,
    protocol_version: protocol.version,
    result_kind: protocol.output.kind
  })
}

function buildUserPrompt(payload, protocol = createSurveyAiProtocol()) {
  const lines = []
  const context = payload.context

  if (context.questions.length) {
    lines.push('- Existing questions:')
    context.questions.forEach((question, index) => {
      lines.push(`  ${index + 1}. ${question.title}${question.type ? ` [${question.type}]` : ''}`)
    })
  } else {
    lines.push('- Existing questions: (none)')
  }

  return renderPromptTemplate(protocol.promptTemplate.userTemplate, {
    prompt: payload.prompt,
    context_title: context.title || '(empty)',
    context_description: context.description || '(empty)',
    context_questions_block: lines.join('\n'),
    protocol_kind: protocol.kind,
    protocol_version: protocol.version,
    result_kind: protocol.output.kind
  })
}

function createAbortSignal(timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer)
    }
  }
}

function replaceModelTemplate(endpoint, model) {
  return endpoint
    .replace(/\{model\}/g, encodeURIComponent(model))
    .replace(/\*/g, encodeURIComponent(model))
}

async function readErrorMessage(response) {
  try {
    const body = await response.json()
    const message = body?.error?.message || body?.message
    return message ? String(message) : `AI provider request failed with status ${response.status}`
  } catch {
    try {
      const text = await response.text()
      return text ? text.slice(0, 300) : `AI provider request failed with status ${response.status}`
    } catch {
      return `AI provider request failed with status ${response.status}`
    }
  }
}

function extractTextFromContent(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') return item
        if (isPlainObject(item) && typeof item.text === 'string') return item.text
        if (isPlainObject(item) && typeof item.content === 'string') return item.content
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (isPlainObject(content) && typeof content.text === 'string') return content.text
  return ''
}

async function requestChatCompletion(provider, systemPrompt, userPrompt) {
  const endpoint = resolveProviderEndpoint(provider)
  const requestUrl = joinUrl(provider.apiBase, endpoint)
  const { signal, cleanup } = createAbortSignal(AI_GENERATION_TIMEOUT_MS)

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal
    })

    if (!response.ok) {
      throw createHttpError(502, 'AI_SURVEY_PROVIDER_REQUEST_FAILED', await readErrorMessage(response))
    }

    const data = await response.json()
    const text = extractTextFromContent(data?.choices?.[0]?.message?.content)
    if (!text) {
      throw createHttpError(502, 'AI_SURVEY_EMPTY_RESPONSE', 'AI provider returned an empty response')
    }

    return text
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createHttpError(504, 'AI_SURVEY_TIMEOUT', 'AI survey generation timed out')
    }
    throw error
  } finally {
    cleanup()
  }
}

async function requestAnthropicCompletion(provider, systemPrompt, userPrompt) {
  const requestUrl = joinUrl(provider.apiBase, resolveProviderEndpoint(provider))
  const { signal, cleanup } = createAbortSignal(AI_GENERATION_TIMEOUT_MS)

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      }),
      signal
    })

    if (!response.ok) {
      throw createHttpError(502, 'AI_SURVEY_PROVIDER_REQUEST_FAILED', await readErrorMessage(response))
    }

    const data = await response.json()
    const text = extractTextFromContent(data?.content)
    if (!text) {
      throw createHttpError(502, 'AI_SURVEY_EMPTY_RESPONSE', 'AI provider returned an empty response')
    }

    return text
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createHttpError(504, 'AI_SURVEY_TIMEOUT', 'AI survey generation timed out')
    }
    throw error
  } finally {
    cleanup()
  }
}

async function requestGeminiCompletion(provider, systemPrompt, userPrompt) {
  const endpoint = replaceModelTemplate(resolveProviderEndpoint(provider), provider.model)
  const requestUrl = joinUrl(provider.apiBase, endpoint)
  const separator = requestUrl.includes('?') ? '&' : '?'
  const finalUrl = `${requestUrl}${separator}key=${encodeURIComponent(provider.apiKey)}`
  const { signal, cleanup } = createAbortSignal(AI_GENERATION_TIMEOUT_MS)

  try {
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\n${userPrompt}`
              }
            ]
          }
        ]
      }),
      signal
    })

    if (!response.ok) {
      throw createHttpError(502, 'AI_SURVEY_PROVIDER_REQUEST_FAILED', await readErrorMessage(response))
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts
      ?.map(part => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')

    if (!text) {
      throw createHttpError(502, 'AI_SURVEY_EMPTY_RESPONSE', 'AI provider returned an empty response')
    }

    return text
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createHttpError(504, 'AI_SURVEY_TIMEOUT', 'AI survey generation timed out')
    }
    throw error
  } finally {
    cleanup()
  }
}

async function runProviderRequest(provider, systemPrompt, userPrompt) {
  if (provider.providerId === 'anthropic') {
    return requestAnthropicCompletion(provider, systemPrompt, userPrompt)
  }

  if (provider.providerId === 'gemini') {
    return requestGeminiCompletion(provider, systemPrompt, userPrompt)
  }

  if (CHAT_COMPLETION_PROVIDER_IDS.has(provider.providerId) || provider.endpoint || provider.apiBase) {
    return requestChatCompletion(provider, systemPrompt, userPrompt)
  }

  throw createHttpError(400, 'AI_SURVEY_PROVIDER_UNSUPPORTED', 'Current AI provider is not supported for survey generation')
}

function extractJsonCandidate(input) {
  const trimmed = normalizeText(input)
  if (!trimmed) return ''

  const fencedMatch = trimmed.match(JSON_FENCE_PATTERN)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim()
  }

  return trimmed
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : Number.NaN
}

function normalizeAiOption(option, index) {
  if (typeof option === 'string') {
    const label = normalizeText(option)
    return label ? { label, value: label } : null
  }
  if (isPlainObject(option)) {
    const label = normalizeText(option.label ?? option.text)
    if (!label) return null
    const value = option.value === undefined || option.value === null || option.value === ''
      ? label
      : String(option.value)
    return { label, value }
  }

  const fallback = normalizeText(option)
  if (!fallback) return null
  return { label: fallback, value: fallback || `option-${index + 1}` }
}

function mapAiTypeToLegacy(type) {
  switch (type) {
    case 'text':
      return 1
    case 'textarea':
      return 2
    case 'radio':
      return 3
    case 'checkbox':
      return 4
    case 'select':
      return 7
    case 'number':
      return 8
    case 'date':
      return 14
    default:
      return 1
  }
}

function parseGeneratedSurveyText(text, protocol = createSurveyAiProtocol()) {
  const jsonCandidate = extractJsonCandidate(text)
  let parsed

  try {
    parsed = JSON.parse(jsonCandidate)
  } catch {
    throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', 'AI provider did not return valid JSON')
  }

  if (!isPlainObject(parsed)) {
    throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', 'AI survey JSON root must be an object')
  }

  const resultKind = normalizeText(parsed.kind)
  const resultVersion = normalizeText(parsed.version)
  const title = normalizeText(parsed.title)
  const description = normalizeText(parsed.description)
  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : null
  if (resultKind !== protocol.output.kind) {
    throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey result kind must be "${protocol.output.kind}"`)
  }
  if (resultVersion !== protocol.output.version) {
    throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey result version must be "${protocol.output.version}"`)
  }
  if (!title) {
    throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', 'AI survey title is missing')
  }
  if (!rawQuestions || rawQuestions.length === 0) {
    throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', 'AI survey must contain at least one question')
  }

  const seenQids = new Set()
  const questions = rawQuestions.map((question, index) => {
    if (!isPlainObject(question)) {
      throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} must be an object`)
    }

    const qid = normalizeText(question.qid)
    const questionTitle = normalizeText(question.title)
    const questionType = normalizeText(question.type).toLowerCase()
    const required = Boolean(question.required)
    const placeholder = normalizeText(question.placeholder)
    const itemDescription = normalizeText(question.description)

    if (!qid) {
      throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} is missing qid`)
    }
    if (seenQids.has(qid)) {
      throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question qid "${qid}" is duplicated`)
    }
    seenQids.add(qid)

    if (!questionTitle) {
      throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} is missing title`)
    }
    if (!ALLOWED_AI_TYPES.has(questionType)) {
      throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} uses unsupported type "${questionType}"`)
    }

    const options = Array.isArray(question.options)
      ? question.options.map(normalizeAiOption).filter(Boolean).map(option => option.label)
      : undefined

    if ((questionType === 'radio' || questionType === 'checkbox' || questionType === 'select')
      && (!options || options.length < 2)) {
      throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} needs at least 2 options`)
    }

    let validation
    if (questionType === 'number') {
      if (!isPlainObject(question.validation)) {
        throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} number validation is missing`)
      }

      const min = parseOptionalNumber(question.validation.min)
      const max = parseOptionalNumber(question.validation.max)
      const step = parseOptionalNumber(question.validation.step)
      if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(step)) {
        throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} number validation must be numeric`)
      }
      if (min !== undefined && max !== undefined && max < min) {
        throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} validation.max must be greater than or equal to validation.min`)
      }
      if (step !== undefined && step <= 0) {
        throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', `AI survey question ${index + 1} validation.step must be greater than 0`)
      }

      validation = {
        min: min ?? 0,
        max: max ?? 100,
        step: step ?? 1
      }
    }

    return {
      legacyType: mapAiTypeToLegacy(questionType),
      title: questionTitle,
      required,
      options,
      placeholder: placeholder || undefined,
      description: itemDescription || undefined,
      validation
    }
  })

  const validationResult = validateSurveyDraft({
    title,
    description,
    questions: questions.map(question => ({
      type: question.legacyType,
      title: question.title,
      required: question.required,
      options: question.options?.map((label, index) => ({
        label,
        value: String(index + 1)
      })),
      description: question.description,
      validation: question.validation
    }))
  })

  if (!validationResult.valid) {
    throw createHttpError(502, 'AI_SURVEY_INVALID_RESPONSE', validationResult.error || 'AI survey structure is invalid')
  }

  return {
    kind: resultKind,
    protocolVersion: resultVersion,
    title,
    description,
    questions
  }
}

function createProviderSummary(provider) {
  return {
    providerId: provider.providerId,
    providerLabel: provider.providerLabel || provider.providerId || 'custom',
    model: provider.model
  }
}

function createSurveyAiAuditMeta({ provider, protocol }) {
  const providerSummary = createProviderSummary(provider)
  return {
    source: 'survey.ai.generate',
    generatedAt: new Date().toISOString(),
    generatedBy: providerSummary.model || providerSummary.providerId || 'unknown',
    providerId: providerSummary.providerId,
    providerLabel: providerSummary.providerLabel,
    model: providerSummary.model,
    protocolVersion: protocol.version,
    promptTemplateVersion: protocol.promptTemplate.version,
    reviewStatus: 'draft'
  }
}

export async function generateSurveyDraftByAi({ actor, body = {} }) {
  if (!actor?.sub) {
    throw createHttpError(401, 'UNAUTHORIZED', 'Authentication is required')
  }

  const protocol = createSurveyAiProtocol()
  const payload = normalizeAiGeneratePayload(body)
  const row = await systemConfigRepository.findByKey(AI_PROVIDER_CONFIG_KEY)
  const provider = readStoredProviderConfig(row)

  if (!provider.apiKey || !provider.apiBase || !provider.model) {
    throw createHttpError(400, 'AI_SURVEY_PROVIDER_NOT_CONFIGURED', 'AI provider config is incomplete. Please configure API Key, API Base, and model first.')
  }

  const systemPrompt = buildSystemPrompt(protocol)
  const userPrompt = buildUserPrompt(payload, protocol)
  const rawText = await runProviderRequest({
    ...provider,
    endpoint: resolveProviderEndpoint(provider)
  }, systemPrompt, userPrompt)
  const generated = parseGeneratedSurveyText(rawText, protocol)

  return {
    ...generated,
    promptTemplateVersion: protocol.promptTemplate.version,
    provider: createProviderSummary(provider),
    aiMeta: createSurveyAiAuditMeta({ provider, protocol })
  }
}

export async function getSurveyAiProtocol({ actor }) {
  if (!actor?.sub) {
    throw createHttpError(401, 'UNAUTHORIZED', 'Authentication is required')
  }

  return createSurveyAiProtocol()
}
