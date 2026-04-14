export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { alumno, notas, asistencias, materias } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY no configurada" });

    // Armar contexto con los datos del alumno
    const notasPorMateria = materias.map(m => {
      const notasM = notas.filter(n => n.materiaId === m.id);
      const promedio = notasM.length
        ? (notasM.reduce((a, n) => a + parseFloat(n.nota), 0) / notasM.length).toFixed(1)
        : null;
      return `${m.nombre}: ${promedio ? `promedio ${promedio}` : "sin notas"}`;
    }).join(", ");

    const totalClases = asistencias.length;
    const presentes = asistencias.filter(a => a.presente).length;
    const pctAsistencia = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : null;

    const contexto = `
Alumno: ${alumno.nombre} ${alumno.apellido}
Materias y promedios: ${notasPorMateria || "sin datos"}
Asistencia: ${pctAsistencia !== null ? `${pctAsistencia}% (${presentes}/${totalClases} clases)` : "sin datos"}
    `.trim();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 200,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: `Sos un asistente educativo. Con los datos del alumno generá UN SOLO párrafo breve (máximo 3 oraciones) en español. Mencioná el rendimiento general, la materia con mejor y peor nota si hay datos, y la asistencia. Tono profesional y directo. Sin saludos ni títulos.`
          },
          {
            role: "user",
            content: contexto
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Error Groq" });

    const text = data.choices?.[0]?.message?.content || "No se pudo generar el resumen.";
    res.status(200).json({ resumen: text });
  } catch (error) {
    console.error("Resumen error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
