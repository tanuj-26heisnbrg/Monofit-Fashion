import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import User from '../models/User.js';

export const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const protect = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Please log in to continue' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ message: 'Account not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired. Please log in again' });
  }
};
export const adminOnly = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Admin access required' });

export const notFound = (req, res) => res.status(404).json({ message: 'Route not found' });
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) return res.status(400).json({ message: err.issues[0].path.join('.') + ': ' + err.issues[0].message });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0].message });
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate value: ' + Object.keys(err.keyValue || {}).join(', ') });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  if (err.status) return res.status(err.status).json({ message: err.message });
  console.error(err.message);
  res.status(500).json({ message: 'Something went wrong' });
};
