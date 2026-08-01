declare namespace Express {
  interface Request {
    adminUser?: { id: number; username: string }
  }
}
