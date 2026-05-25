export interface UserListItem {
  id: string;
  username: string;
  role: 'ADMIN' | 'AUXILIAR' | 'DIRECCION';
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  username: string;
  role: 'ADMIN' | 'AUXILIAR';
  password?: string;
}
