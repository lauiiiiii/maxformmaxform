import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { createResponseError, throwPolicyError } from '../http/errors.js'
import { getAuthenticatedActorPolicy } from '../policies/actorPolicy.js'
import roleRepository from '../repositories/roleRepository.js'
import userRepository from '../repositories/userRepository.js'

function signToken(user, roleCode) {
  return jwt.sign(
    { sub: user.id, username: user.username, roleCode },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

function ensureAuthenticated(actor) {
  throwPolicyError(getAuthenticatedActorPolicy(actor, {
    code: 'INVALID_TOKEN',
    message: 'Current user is not available'
  }))
}

function normalizeCredentials(body = {}) {
  return {
    username: String(body.username || '').trim(),
    email: body.email ? String(body.email).trim() : '',
    password: String(body.password || '')
  }
}

function createAuthError(status, code, message) {
  return createResponseError(status, {
    success: false,
    error: { code, message }
  })
}

export async function registerAuthUser({ body = {} }) {
  const { username, email, password } = normalizeCredentials(body)
  if (!username || !password) {
    throw createAuthError(400, 'MISSING_FIELDS', 'Username and password are required')
  }

  const existing = await userRepository.findByUsername(username)
  if (existing) {
    throw createAuthError(409, 'USER_EXISTS', 'Username already exists')
  }

  if (email) {
    const emailTaken = await userRepository.findByEmail(email)
    if (emailTaken) {
      throw createAuthError(409, 'EMAIL_EXISTS', 'Email already exists')
    }
  }

  const defaultRole = await roleRepository.findByCode('user')
  const user = await userRepository.create({
    username,
    email: email || undefined,
    password,
    role_id: defaultRole?.id
  })

  return {
    token: signToken(user, 'user'),
    user: userRepository.toSafe(user)
  }
}

export async function loginAuthUser({ body = {} }) {
  const { username, password } = normalizeCredentials(body)
  if (!username || !password) {
    throw createAuthError(400, 'MISSING_FIELDS', 'Username and password are required')
  }

  const user = await userRepository.findByUsername(username)
  if (!user) {
    throw createAuthError(401, 'AUTH_FAILED', 'Username or password is incorrect')
  }

  if (!user.is_active) {
    throw createAuthError(403, 'USER_DISABLED', 'User account is disabled')
  }

  const verified = await userRepository.verifyPassword(password, user.password)
  if (!verified) {
    throw createAuthError(401, 'AUTH_FAILED', 'Username or password is incorrect')
  }

  await userRepository.updateLastLogin(user.id)
  const role = user.role_id ? await roleRepository.findById(user.role_id) : null

  return {
    token: signToken(user, role?.code || 'user'),
    user: userRepository.toSafe(user)
  }
}

export async function getCurrentAuthSession({ actor }) {
  ensureAuthenticated(actor)

  const user = await userRepository.findById(actor.sub)
  if (!user) {
    throw createAuthError(401, 'INVALID_TOKEN', 'User not found')
  }

  const role = user.role_id ? await roleRepository.findById(user.role_id) : null
  return {
    user: userRepository.toSafe(user),
    role
  }
}
