import { createClient } from "@supabase/supabase-js";

const TABLES = [
  "colegios", "materias", "alumnos", "inscripciones",
  "notas", "actividades", "asistencias", "eventos",
  "inasistencias", "documentos", "historial", "agenda", "entregas"
];

export default async function handler(req, res) {
  // Solo GET con token secreto
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = req.headers["x-backup-token"] || req.query.token;
  if (token !== process.env.BACKUP_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );

    const backup = {
      version: "1.0",
      fecha: new Date().toISOString(),
      tablas: {}
    };

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.error(`Error en tabla ${table}:`, error.message);
        backup.tablas[table] = { error: error.message, rows: [] };
      } else {
        backup.tablas[table] = { rows: data || [], count: (data || []).length };
      }
    }

    const totalRows = Object.values(backup.tablas).reduce((sum, t) => sum + (t.count || 0), 0);
    backup.resumen = {
      totalFilas: totalRows,
      tablas: Object.fromEntries(Object.entries(backup.tablas).map(([k, v]) => [k, v.count || 0]))
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="edugestion-backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.status(200).json(backup);

  } catch (error) {
    console.error("Backup error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
