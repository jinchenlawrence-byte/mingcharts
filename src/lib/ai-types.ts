// AI 模块共用类型
export interface AIUsage {
  prompt_tokens: number      // 输入 token
  completion_tokens: number  // 输出 token
  total_tokens: number       // 合计
}
