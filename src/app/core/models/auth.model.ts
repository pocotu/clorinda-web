export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface User {
  id: string;
  username: string;
  role: 'AUXILIAR' | 'ADMIN' | 'DIRECCION';
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'AUXILIAR' | 'ADMIN' | 'DIRECCION';
  iat: number;
  exp: number;
}
