import { useCallback, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RetoFormData, SociaRow } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
  showValidation?: boolean;
}

const REQUIRED_COLS = ["id_socia", "nombre", "telefono", "tienda_visita", "baseline_mensual"];

export function WizardStep2({ form, setForm, showValidation }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setForm({ ...form, socias: [{ id_socia: "", nombre: "", telefono: "", tienda_visita: "", baseline_mensual: 0, error: "Archivo excede 10MB" }] });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (raw.length === 0) return;

        const headers = Object.keys(raw[0]).map((h) => h.trim().toLowerCase());
        const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));

        if (missing.length > 0) {
          setForm({
            ...form,
            socias: [{ id_socia: "", nombre: "", telefono: "", tienda_visita: "", baseline_mensual: 0, error: `Columnas faltantes: ${missing.join(", ")}` }],
          });
          return;
        }

        const seen = new Set<string>();
        const socias: SociaRow[] = raw.map((row) => {
          const id = String(row.id_socia ?? row.ID_SOCIA ?? row.Id_Socia ?? "").trim();
          const nombre = String(row.nombre ?? row.NOMBRE ?? row.Nombre ?? "").trim();
          const telefono = String(row.telefono ?? row.TELEFONO ?? row.Telefono ?? "").trim();
          const tienda = String(row.tienda_visita ?? row.TIENDA_VISITA ?? row.Tienda_Visita ?? "").trim();
          const baseline = Number(row.baseline_mensual ?? row.BASELINE_MENSUAL ?? row.Baseline_Mensual ?? 0);

          let error: string | undefined;
          if (!id) error = "ID socia vacío";
          else if (seen.has(id)) error = "ID duplicado";
          else if (!nombre) error = "Nombre vacío";
          else if (isNaN(baseline) || baseline < 0) error = "Baseline inválido";

          seen.add(id);

          const meta = form.tipo_meta === "estandar"
            ? form.meta_estandar
            : Math.round(baseline * 1.3);

          return { id_socia: id, nombre, telefono, tienda_visita: tienda, baseline_mensual: baseline, meta_individual: meta, error };
        });

        setForm({ ...form, socias });
      } catch {
        setForm({ ...form, socias: [] });
      }
    };
    reader.readAsBinaryString(file);
  }, [form, setForm]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["id_socia", "nombre", "telefono", "tienda_visita", "baseline_mensual"],
      ["PS000001", "Nombre de ejemplo", "5512345678", "Tienda Centro", 5000],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Socias");
    XLSX.writeFile(wb, "plantilla_socias.xlsx");
  };

  const updateMeta = (idx: number, val: number) => {
    const next = [...form.socias];
    next[idx] = { ...next[idx], meta_individual: val };
    setForm({ ...form, socias: next });
  };

  const validCount = form.socias.filter((s) => !s.error).length;
  const errorCount = form.socias.filter((s) => s.error).length;
  const noData = form.socias.length === 0 || validCount === 0;

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : showValidation && noData ? "border-destructive" : "border-border"
        }`}
      >
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">Arrastra tu archivo Excel aquí</p>
        <p className="text-xs text-muted-foreground">o haz click para seleccionar (.xlsx, máx 10MB)</p>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileInput}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Columnas requeridas: <span className="font-mono text-foreground/80">id_socia, nombre, telefono, tienda_visita, baseline_mensual</span>
        </p>
        <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={handleDownloadTemplate}>
          <Download className="mr-1 h-3 w-3" /> Descargar plantilla
        </Button>
      </div>

      {showValidation && noData && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" /> Carga un archivo Excel con las socias participantes para continuar
        </p>
      )}

      {fileName && (
        <p className="text-sm text-muted-foreground">
          Archivo: <span className="text-foreground font-medium">{fileName}</span>
        </p>
      )}

      {form.socias.length > 0 && (
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{validCount} socias cargadas</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{errorCount} con errores (se excluirán)</span>
            </div>
          )}
        </div>
      )}

      {form.socias.length > 0 && (
        <div className="max-h-80 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>ID Socia</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Tienda</TableHead>
                <TableHead>Baseline</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.socias.slice(0, 30).map((s, i) => (
                <TableRow key={i} className={s.error ? "bg-destructive/10" : ""}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>{s.id_socia}</TableCell>
                  <TableCell>{s.nombre}</TableCell>
                  <TableCell>{s.telefono}</TableCell>
                  <TableCell>{s.tienda_visita}</TableCell>
                  <TableCell>${s.baseline_mensual.toLocaleString()}</TableCell>
                  <TableCell>
                    {!s.error && form.tipo_meta === "personalizada" ? (
                      <Input
                        type="number"
                        className="h-7 w-24"
                        value={s.meta_individual ?? 0}
                        onChange={(e) => updateMeta(i, Number(e.target.value))}
                      />
                    ) : (
                      `$${(s.meta_individual ?? form.meta_estandar).toLocaleString()}`
                    )}
                  </TableCell>
                  <TableCell>
                    {s.error ? (
                      <span className="text-xs text-destructive">{s.error}</span>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {form.socias.length > 30 && (
            <p className="p-3 text-center text-xs text-muted-foreground">
              Mostrando 30 de {form.socias.length} filas
            </p>
          )}
        </div>
      )}
    </div>
  );
}
