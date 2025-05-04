export type UserService = {
  GetProfile: (params: { id: string }) => Promise<{ id: string, name: string }>
}
