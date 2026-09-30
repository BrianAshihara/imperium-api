export const healthService = {
  getStatus: (): { status: string; timestamp: string } => ({
    status: "ok",
    timestamp: new Date().toISOString()
  })
};
