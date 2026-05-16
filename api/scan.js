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

async function callAI(body) {
  const groqKey = process.env.GROQ_API_KEY;
  const googleKey = process.env.API_KEY;

  if (groqKey) {
    try {
      const groqBody = toGroqBody(body);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify(groqBody),
      });
      if (response.ok) {
        const groqData = await response.json();
        return { status: 200, data: toGoogleResponse(groqData) };
      }
      let errMsg = 'Groq API Error';
      try { const e = await response.json(); errMsg = e.error?.message || JSON.stringify(e); } catch {}
      console.error('Groq failed:', errMsg);
      if (!googleKey) return { status: response.status, error: errMsg };
    } catch (e) {
      console.error('Groq exception:', e.message);
      if (!googleKey) return { status: 500, error: e.message };
    }
  }

  if (googleKey) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': googleKey
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return { status: response.status, error: errData.error?.message || 'Google API Error' };
    }
    const data = await response.json();
    return { status: 200, data };
  }

  return { status: 500, error: 'No API key configured (set GROQ_API_KEY or API_KEY)' };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const result = await callAI(body);
    if (result.status !== 200) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: result.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const candidate = result.data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text || '';
    const parsed = extractNutrition(rawText);

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: 'No JSON found in AI response' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (candidate?.content?.parts?.[0]) {
      candidate.content.parts[0].text = parsed;
    }

    return new Response(JSON.stringify(result.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
