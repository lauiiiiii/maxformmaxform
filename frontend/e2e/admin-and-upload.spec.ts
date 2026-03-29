import { test, expect } from 'playwright/test'

const backendBaseUrl = process.env.PLAYWRIGHT_BACKEND_URL || 'http://127.0.0.1:63002'

async function registerUser(request: import('playwright/test').APIRequestContext) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const username = `e2e_user_${suffix}`
  const password = `E2ePass!${suffix}`
  const email = `${username}@example.com`

  const response = await request.post(`${backendBaseUrl}/api/auth/register`, {
    data: { username, password, email }
  })
  expect(response.ok()).toBeTruthy()

  const body = await response.json()
  return {
    username,
    password,
    token: body.data.token
  }
}

async function loginUser(request: import('playwright/test').APIRequestContext, username: string, password: string) {
  const response = await request.post(`${backendBaseUrl}/api/auth/login`, {
    data: { username, password }
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return {
    username,
    token: body.data.token
  }
}

async function withAuth(page: import('playwright/test').Page, token: string) {
  await page.addInitScript(value => {
    window.localStorage.setItem('token', value)
  }, token)
}

async function createSurvey(request: import('playwright/test').APIRequestContext, token: string, payload: Record<string, unknown>) {
  const response = await request.post(`${backendBaseUrl}/api/surveys`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    data: payload
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return body.data
}

async function publishSurvey(request: import('playwright/test').APIRequestContext, token: string, surveyId: number) {
  const response = await request.post(`${backendBaseUrl}/api/surveys/${surveyId}/publish`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  expect(response.ok()).toBeTruthy()
}

test.describe('Admin And Upload Browser E2E', () => {
  test('guest users are redirected to login for admin routes', async ({ page }) => {
    await page.goto('/admin/overview')

    await page.waitForURL(/\/login\?redirect=/)
    await expect(page).toHaveURL(/\/login\?redirect=\/admin\/overview/)
  })

  test('non-admin users are redirected to forbidden for admin routes', async ({ page, request }) => {
    const user = await registerUser(request)
    await withAuth(page, user.token)

    await page.goto('/admin/overview')

    await page.waitForURL('**/403')
    await expect(page.getByTestId('forbidden-page')).toBeVisible()
  })

  test('admin users can open core management pages', async ({ page, request }) => {
    const admin = await loginUser(request, 'admin', '123456')
    await withAuth(page, admin.token)

    await page.goto('/admin/overview')
    await expect(page.getByTestId('admin-overview-page')).toBeVisible()

    await page.goto('/admin/members')
    await expect(page.getByTestId('admin-members-page')).toBeVisible()
    await expect(page.locator('.el-table__body tbody tr').first()).toBeVisible()

    await page.goto('/admin/roles')
    await expect(page.getByTestId('admin-roles-page')).toBeVisible()
    await expect(page.locator('.el-table__body tbody tr').first()).toBeVisible()
  })

  test('upload question survey can be published and submitted from the browser', async ({ page, request }) => {
    const user = await registerUser(request)
    await withAuth(page, user.token)

    const dialogs: string[] = []
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message())
      await dialog.accept()
    })

    await page.goto('/surveys/create')
    await page.locator('.create-box .title-input').fill('Upload Question E2E Survey')
    await page.locator('.create-box .btn-primary').click()

    await page.waitForURL(/\/surveys\/\d+\/edit(\?|$)/)
    const surveyId = Number(page.url().match(/\/surveys\/(\d+)\/edit(?:\?|$)/)?.[1])

    await page.locator('.question-categories .category-compact').first().locator('.type-item').nth(3).click()
    await expect(page.getByTestId('question-editor-0')).toBeVisible()
    await page.getByTestId('question-title-input-0').fill('Upload Proof')
    await page.getByTestId('editor-publish-button').click()

    await page.waitForURL('**/user-dashboard')
    expect(dialogs.length).toBeGreaterThanOrEqual(2)

    await page.goto(`/s/${surveyId}?force=desktop`)
    await expect(page.getByTestId('fill-survey-page')).toBeVisible()

    await page.getByTestId('fill-upload-input-0').setInputFiles({
      name: 'proof.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('browser upload regression file')
    })

    await expect(page.getByTestId('fill-upload-list-0')).toContainText('proof.pdf')
    await page.locator('.submit-btn').click()
    await page.waitForURL(new RegExp(`/s/${surveyId}/success`))

    await page.goto(`/surveys/${surveyId}/results`)
    await expect(page.getByTestId('results-total-submissions')).toHaveText('1')
  })

  test('upload question blocks unsupported files in the browser before submission', async ({ page, request }) => {
    const user = await registerUser(request)
    const survey = await createSurvey(request, user.token, {
      title: 'Upload Validation E2E Survey',
      description: 'Survey used for upload validation regression.',
      questions: [
        {
          type: 'upload',
          title: 'Resume Upload',
          upload: {
            maxFiles: 1,
            maxSizeMb: 10,
            accept: '.pdf'
          }
        }
      ],
      settings: {
        allowMultipleSubmissions: true
      }
    })
    await publishSurvey(request, user.token, survey.id)

    await page.goto(`/s/${survey.id}?force=desktop`)
    await expect(page.getByTestId('fill-survey-page')).toBeVisible()

    await page.getByTestId('fill-upload-input-0').setInputFiles({
      name: 'resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text should be rejected')
    })

    await expect(page.getByTestId('fill-upload-error-0')).toContainText('resume.txt')
    await expect(page.getByTestId('fill-upload-list-0')).toHaveCount(0)
  })
})
