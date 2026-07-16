import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { findUserById, toPublicUser } from './db.js'
import type { JwtPayload } from './types.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me'

export function signToken(userId: number, role: JwtPayload['role']) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: '7d' })
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: '請先登入' })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload
    const user = await findUserById(payload.sub)
    if (!user) {
      res.status(401).json({ error: '帳號不存在' })
      return
    }
    req.authUser = toPublicUser(user)
    next()
  } catch {
    res.status(401).json({ error: '登入已失效，請重新登入' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== 'admin') {
    res.status(403).json({ error: '需要管理員權限' })
    return
  }
  next()
}

export function requireActiveMember(req: Request, res: Response, next: NextFunction) {
  const user = req.authUser
  if (!user) {
    res.status(401).json({ error: '請先登入' })
    return
  }
  if (user.role === 'admin') {
    next()
    return
  }
  if (user.status === 'rejected') {
    res.status(403).json({ error: '帳號已被拒絕，請聯絡管理員' })
    return
  }
  if (user.status === 'pending') {
    res.status(403).json({ error: '帳號審核中，請等待管理員開通或完成付費訂閱' })
    return
  }
  if (!user.membershipActive) {
    res.status(403).json({ error: '此功能需訂閱付費會員，請升級後使用' })
    return
  }
  next()
}

/** 已開通會員（含免費與付費），不含待審核 */
export function requireApprovedMember(req: Request, res: Response, next: NextFunction) {
  const user = req.authUser
  if (!user) {
    res.status(401).json({ error: '請先登入' })
    return
  }
  if (user.role === 'admin') {
    next()
    return
  }
  if (user.status === 'rejected') {
    res.status(403).json({ error: '帳號已被拒絕，請聯絡管理員' })
    return
  }
  if (user.status === 'pending') {
    res.status(403).json({ error: '帳號審核中，請等待管理員開通' })
    return
  }
  next()
}

declare global {
  namespace Express {
    interface Request {
      authUser?: import('./types.js').PublicUser
    }
  }
}
