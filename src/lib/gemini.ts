/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../env.js";

export function getGeminiClient() {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export async function generateSummary(prompt: string): Promise<string> {
  const client = getGeminiClient();
  const model: any = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result: any = await model.generateContent(prompt);
  const text = result.response.text();
  return text;
}


