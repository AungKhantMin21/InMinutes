import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

async function generate(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export function formatTranscript(segments) {
  return segments.map((s) => `${s.speaker}: ${s.text}`).join("\n");
}

export function buildEnglishTranscript(segments) {
  return segments
    .map((s) => `${s.speaker}: ${s.translatedText ?? s.text}`)
    .join("\n");
}

export async function translateNonEnglishSegments(segments) {
  const nonEnglish = segments
    .map((s, i) => ({ index: i, segment: s }))
    .filter(({ segment }) => segment.originalLang !== "en");

  if (nonEnglish.length === 0) return segments;

  const updated = segments.map((s) => ({ ...s }));
  const BATCH_SIZE = 10;

  for (let i = 0; i < nonEnglish.length; i += BATCH_SIZE) {
    const batch = nonEnglish.slice(i, i + BATCH_SIZE);
    const batchText = batch
      .map(({ index, segment }) => `[${index}] ${segment.text}`)
      .join("\n");

    const prompt = `Translate the following meeting transcript segments to English.
Each segment is on its own line in the format: [INDEX] text
Return ONLY the translations in the same format: [INDEX] translated text
No preamble. No explanation. Preserve speaker names if mentioned.

Segments:
${batchText}`;

    try {
      const response = await generate(prompt);
      const lines = response.trim().split("\n");

      for (const line of lines) {
        const match = line.match(/^\[(\d+)\]\s+(.+)$/);
        if (match) {
          const originalIndex = parseInt(match[1], 10);
          if (originalIndex >= 0 && originalIndex < updated.length) {
            updated[originalIndex].translatedText = match[2].trim();
          }
        }
      }
    } catch {
      // graceful degradation — leave translatedText as null for this batch
    }
  }

  return updated;
}

export async function extractKeyPoints(transcript) {
  const prompt = `Extract the 5-8 most important key points from this meeting transcript.
Return ONLY a JSON array of strings. No preamble. No markdown fences.
Example: ["Point 1", "Point 2"]

Transcript:
${transcript}`;

  const text = await generate(prompt);
  return parseJSON(text);
}

export async function extractActionItems(transcript) {
  const prompt = `Extract all action items, tasks, and assignments from this meeting transcript.
Return ONLY a JSON array of objects. No preamble. No markdown fences.
Format:
[{"task": "description", "owner": "person responsible or speaker label", "deadline": "deadline if mentioned or null"}]

Transcript:
${transcript}`;

  const text = await generate(prompt);
  return parseJSON(text);
}

export async function generateMinutes(transcript, keyPoints, actionItems, title) {
  const keyPointsList = keyPoints.map((p) => `- ${p}`).join("\n");
  const actionItemsList = actionItems
    .map((a) => `- ${a.task} | ${a.owner} | ${a.deadline ?? "No deadline"}`)
    .join("\n");

  const prompt = `Generate professional meeting minutes based on the following.

Meeting Title: ${title}

Key Points:
${keyPointsList}

Action Items:
${actionItemsList}

Full Transcript:
${transcript}

Format the minutes with exactly these sections and no others:
1. Meeting Summary
2. Key Points Discussed
3. Decisions Made
4. Action Items & Assignments
5. Next Steps

Rules:
- Do NOT include an Attendees section or attendees list
- Do NOT include "Minutes Prepared By", "Date Prepared", or any signature block
- Do NOT include meeting date, time, or location headers
- Professional business language. Clear and concise.`;

  return generate(prompt);
}
