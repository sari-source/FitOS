import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

function extractNutrition(rawText) {
  let parsed = rawText.match(/\{[\s\S]*\}/)?.[0];
  if (parsed) {
    try { JSON.parse(parsed); } catch { parsed = null; }
  }
  if (!parsed) {
    const csvMatch = rawText.match(/(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)\s*,\s*(\d+\.?\d*)/);
    if (csvMatch) {
      parsed = JSON.stringify({
        calories: parseFloat(csvMatch[1]),
        protein: parseFloat(csvMatch[2]),
        carbs: parseFloat(csvMatch[3]),
        fat: parseFloat(csvMatch[4])
      });
    }
  }
  return parsed;
}

function toGroqBody(googleBody) {
  const parts = googleBody.contents?.[0]?.parts || [];
  const textPart = parts.find(p => p.text)?.text || '';
  const imagePart = parts.find(p => p.inline_data);
  const content = [{ type: 'text', text: textPart }];
  if (imagePart) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}`
      }
    });
  }
  return {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content }],
    max_tokens: 300,
    temperature: 0.1
  };
}

function toGoogleResponse(groqData) {
  const text = groqData.choices?.[0]?.message?.content || '';
  return {
    candidates: [{
      content: { parts: [{ text }], role: 'model' },
      finishReason: (groqData.choices?.[0]?.finish_reason || '').toUpperCase()
    }]
  };
}

async function scanWithGroq(req) {
  const apiKey = process.env.GROQ_API_KEY;
  const groqBody = toGroqBody(req.body);
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(groqBody),
  });
  if (!response.ok) {
    let errMsg = 'Groq API Error';
    try { const e = await response.json(); errMsg = e.error?.message || JSON.stringify(e); } catch {}
    return { status: response.status, error: errMsg };
  }
  const groqData = await response.json();
  return { status: 200, data: toGoogleResponse(groqData) };
}

async function scanWithGoogle(req) {
  const apiKey = process.env.VITE_AI_API_KEY || process.env.API_KEY;
  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(req.body),
  });
  if (!response.ok) {
    let errMsg = `Google API Error (${response.status})`;
    try { const e = await response.json(); errMsg = e.error?.message || errMsg; } catch {}
    return { status: response.status, error: errMsg };
  }
  return { status: 200, data: await response.json() };
}

async function callAI(req) {
  const groqKey = process.env.GROQ_API_KEY;
  const googleKey = process.env.VITE_AI_API_KEY || process.env.API_KEY;

  if (groqKey) {
    const result = await scanWithGroq(req);
    if (result.status === 200) return result;
    if (!googleKey) return result;
    console.error('Groq failed, falling back to Google:', result.error);
  }

  if (googleKey) {
    const result = await scanWithGoogle(req);
    if (result.status === 200) return result;
    return result;
  }

  return { status: 500, error: 'No API key configured (set GROQ_API_KEY or VITE_AI_API_KEY)' };
}

app.post('/api/scan', async (req, res) => {
  try {
    const result = await callAI(req);
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    const candidate = result.data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || '';
    const finishReason = candidate?.finishReason || 'N/A';
    console.error('AI response: finishReason=%s text=%s', finishReason, rawText.slice(0, 300));

    const parsed = extractNutrition(rawText);
    if (!parsed) {
      return res.status(422).json({
        error: 'No JSON found in AI response',
        _debug: { finishReason, rawSnippet: rawText.slice(0, 200) }
      });
    }

    if (candidate?.content?.parts?.[0]) {
      candidate.content.parts[0].text = parsed;
    }
    return res.json(result.data);
  } catch (error) {
    console.error('Server catch block:', error.stack || error.message);
    return res.status(500).json({ error: error.message || 'Server error', _stack: error.stack?.slice(0, 500) });
  }
});

app.listen(3001, () => {
  console.log('Dev API server running on http://localhost:3001');
});
