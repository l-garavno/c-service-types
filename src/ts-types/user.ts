export type UserService = {
  GetProfile: (params: { id: string }) => Promise<{ id: string, name: string }>
  ChangePassword: (params: { id: string, password: string, oldPassword?: string, newPassword?: string }) => Promise<{ success: boolean }>
}
