export type BotService = {
  GetAvailableBots: (params: { id?: string, name?: string, page?: number, limit?: number }) => Promise<{ success: boolean }>
}
