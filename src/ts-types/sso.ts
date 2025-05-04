export type SsoService = {
  RegisterNewUser: (params: { email: string, password: string }) => Promise<{ success: boolean }>
  LoginByEmail: (params: { email: string, password: string }) => Promise<{ success: boolean, token?: string }>
}
