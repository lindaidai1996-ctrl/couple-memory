type DeepSeekResponse = {
  choices: { message: { content: string } }[]
  usage?: { total_tokens: number }
}

export async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; tokens: number; cost: number }> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  const data = await response.json() as DeepSeekResponse
  const text = data.choices[0].message.content
  const tokens = data.usage?.total_tokens || 0

  return { text, tokens, cost: tokens * 0.000002 }
}
