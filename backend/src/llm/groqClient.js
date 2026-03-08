import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function askLLM(prompt) {
  if (!process.env.GROQ_API_KEY) {
    console.warn(
      "[NevoraX][LLM] GROQ_API_KEY is not set; falling back to empty response."
    )
    return ""
  }

  try {
    const completion = await groq.chat.completions.create({
      // Updated to a currently supported Groq model
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an AI agent orchestrator in an autonomous economic system."
        },
        { role: "user", content: prompt }
      ]
    })

    return completion.choices?.[0]?.message?.content ?? ""
  } catch (error) {
    console.error("[NevoraX][LLM] Error while calling Groq LLM:", error)
    return ""
  }
}

