import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Required for Realtime APIs
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: "verse",
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: text || "Failed to mint ephemeral key" });
    }

    const data = await resp.json();
    const ephemeralKey = data?.client_secret?.value;
    if (!ephemeralKey) {
      return res.status(500).json({ error: "No client_secret in response" });
    }

    return res.status(200).json({ ephemeralKey });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
