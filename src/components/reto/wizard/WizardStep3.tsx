import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shuffle, Upload, Download, AlertTriangle, Search, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { RetoFormData } from "../RetoWizard";

interface Props {
  form: RetoFormData;
  setForm: (f: RetoFormData) => void;
}

export function WizardStep3({ form, setForm }: Props) {
  const [assignTab, setAssignTab] = useState("auto");
  const [search, setSearch] = useState("");
  const [filterTienda, setFilterTienda] = useState("todas");
  const [filterSinAsignar, setFilterSinAsignar] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState("");
  const [bulkUser, setBulkUser] = useState("");
  const [excelResult, setExcelResult] = useState<{
    processed: number;
    counts: string[];
    errors: string[];
    matchLog: string[];
  } | null>(null);

  // Ref to always have latest form in async callbacks (avoids stale closure)
  const formRef = useRef(form);
  formRef.current = form;

  const { data: coordinadores = [] } = useQuery({
    queryKey: ["coordinadores-activos"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("*").eq("activo", true).eq("rol", "coordinador");
      return data || [];
    },
  });

  const { data: desarrolladoras = [] } = useQuery({
    queryKey: ["desarrolladoras-activas"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("*").eq("activo", true).eq("rol", "desarrolladora");
      return data || [];
    },
  });

  const { data: mentoras = [] } = useQuery({
    queryKey: ["mentoras-activas"],
    queryFn: async () => {
      const { data } = await supabase.from("mentoras").select("*").eq("activa", true);
      return data || [];
    },
  });

  const validSocias = form.socias.filter((s) => !s.error);
  const tiendas = useMemo(() => [...new Set(validSocias.map(s => s.tienda_visita))].sort(), [validSocias]);

  // Counts
  const countBy = (field: string, id: string) =>
    form.socias.filter((s) => !s.error && (s as any)[field] === id).length;
  const sinCoordinador = validSocias.filter((s) => !s.coordinador_id).length;
  const sinDesarrolladora = validSocias.filter((s) => !s.desarrolladora_id).length;
  const sinMentora = validSocias.filter((s) => !s.mentora_id).length;

  // Auto-assign functions
  const autoAssign = (field: "coordinador_id" | "desarrolladora_id", users: any[]) => {
    if (users.length === 0) return;
    const tiendasList = [...new Set(validSocias.map((s) => s.tienda_visita))];
    const updated = [...form.socias];
    let idx = 0;
    tiendasList.forEach((tienda) => {
      updated.filter((s) => s.tienda_visita === tienda && !s.error).forEach((s) => {
        (s as any)[field] = users[idx % users.length].id;
      });
      idx++;
    });
    setForm({ ...form, socias: updated });
    toast({ title: `${field === "coordinador_id" ? "Coordinadores" : "Desarrolladoras"} asignados automáticamente` });
  };

  const autoAssignMentoras = () => {
    if (mentoras.length === 0) return;
    const updated = [...form.socias];
    updated.filter((s) => !s.error).forEach((s, i) => {
      s.mentora_id = mentoras[i % mentoras.length].id;
    });
    setForm({ ...form, socias: updated });
    toast({ title: "Mentoras asignadas automáticamente" });
  };

  // Unified Excel upload
  const handleUnifiedExcel = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        // DEBUG: Log available data for matching
        const excelEmails = new Set<string>();
        const excelMentNames = new Set<string>();
        rows.forEach(r => {
          if (r.coordinador) excelEmails.add(String(r.coordinador).trim());
          if (r.desarrolladora) excelEmails.add(String(r.desarrolladora).trim());
          if (r.mentora) excelMentNames.add(String(r.mentora).trim());
        });
        console.log("=== DEBUG EXCEL ASIGNACIONES ===");
        console.log("Emails únicos del Excel:", [...excelEmails]);
        console.log("Nombres mentoras del Excel:", [...excelMentNames]);
        console.log("Coordinadores en BD:", coordinadores.map((u: any) => ({ id: u.id, email: u.email, nombre: u.nombre })));
        console.log("Desarrolladoras en BD:", desarrolladoras.map((u: any) => ({ id: u.id, email: u.email, nombre: u.nombre })));
        console.log("Mentoras en BD:", mentoras.map((m: any) => ({ id: m.id, nombre: m.nombre })));

        const assignmentMap = new Map<string, { coordinador_id?: string; desarrolladora_id?: string; mentora_id?: string }>();
        const errors: string[] = [];
        const matchLog: string[] = [];
        let processed = 0;

        // Helper: tolerant email match
        const findByEmail = (list: any[], rawEmail: string) => {
          const email = rawEmail.trim().toLowerCase();
          // Exact match first
          let found = list.find((u: any) => u.email.trim().toLowerCase() === email);
          if (found) return found;
          // Partial match: check if email contains or is contained
          found = list.find((u: any) => u.email.trim().toLowerCase().includes(email) || email.includes(u.email.trim().toLowerCase()));
          return found || null;
        };

        // Helper: tolerant name match for mentoras
        const findMentora = (rawName: string) => {
          const name = rawName.trim().toLowerCase();
          // Exact match
          let found = mentoras.find((m: any) => m.nombre.trim().toLowerCase() === name);
          if (found) return found;
          // Partial/includes match
          found = mentoras.find((m: any) => m.nombre.trim().toLowerCase().includes(name) || name.includes(m.nombre.trim().toLowerCase()));
          return found || null;
        };

        for (const row of rows) {
          const idSocia = String(row.id_socia || "").trim();
          if (!idSocia) continue;

          const assignment: { coordinador_id?: string; desarrolladora_id?: string; mentora_id?: string } = {};

          const coordEmail = String(row.coordinador || "").trim();
          if (coordEmail) {
            const u = findByEmail(coordinadores, coordEmail);
            if (u) {
              assignment.coordinador_id = u.id;
              matchLog.push(`✅ ${idSocia} coord: "${coordEmail}" → ${u.nombre}`);
            } else {
              errors.push(`${idSocia}: coordinador "${coordEmail}" no encontrado`);
              matchLog.push(`❌ ${idSocia} coord: "${coordEmail}" → NO ENCONTRADO`);
            }
          }

          const desaEmail = String(row.desarrolladora || "").trim();
          if (desaEmail) {
            const u = findByEmail(desarrolladoras, desaEmail);
            if (u) {
              assignment.desarrolladora_id = u.id;
              matchLog.push(`✅ ${idSocia} desa: "${desaEmail}" → ${u.nombre}`);
            } else {
              errors.push(`${idSocia}: desarrolladora "${desaEmail}" no encontrada`);
              matchLog.push(`❌ ${idSocia} desa: "${desaEmail}" → NO ENCONTRADA`);
            }
          }

          const mentNombre = String(row.mentora || "").trim();
          if (mentNombre) {
            const m = findMentora(mentNombre);
            if (m) {
              assignment.mentora_id = m.id;
              matchLog.push(`✅ ${idSocia} mentora: "${mentNombre}" → ${m.nombre}`);
            } else {
              errors.push(`${idSocia}: mentora "${mentNombre}" no encontrada`);
              matchLog.push(`❌ ${idSocia} mentora: "${mentNombre}" → NO ENCONTRADA`);
            }
          }

          assignmentMap.set(idSocia, assignment);
          processed++;
        }

        console.log("Assignments map size:", assignmentMap.size);
        console.log("Sample assignments:", [...assignmentMap.entries()].slice(0, 3));

        // Use formRef to get latest form state
        const currentForm = formRef.current;
        
        console.log("Current socias count:", currentForm.socias.length);
        console.log("Sample socia ids:", currentForm.socias.slice(0, 5).map(s => s.id_socia));

        let matchedCount = 0;
        const updatedSocias = currentForm.socias.map(s => {
          if (s.error) return s;
          const a = assignmentMap.get(s.id_socia);
          if (!a) return s;
          matchedCount++;
          return {
            ...s,
            ...(a.coordinador_id !== undefined && { coordinador_id: a.coordinador_id }),
            ...(a.desarrolladora_id !== undefined && { desarrolladora_id: a.desarrolladora_id }),
            ...(a.mentora_id !== undefined && { mentora_id: a.mentora_id }),
          };
        });

        console.log("Socias matched with assignments:", matchedCount);
        console.log("Sample updated socia:", updatedSocias.find(s => s.coordinador_id));

        // Check for socias in Excel but not in wizard
        for (const idSocia of assignmentMap.keys()) {
          if (!currentForm.socias.some(s => s.id_socia === idSocia && !s.error)) {
            errors.push(`${idSocia}: socia no encontrada en paso 2`);
            matchLog.push(`⚠️ ${idSocia}: no existe en socias del wizard`);
          }
        }

        // Build counts
        const counts: string[] = [];
        const coordCounts: Record<string, number> = {};
        const desaCounts: Record<string, number> = {};
        const mentCounts: Record<string, number> = {};
        for (const s of updatedSocias.filter(s => !s.error)) {
          if (s.coordinador_id) { const u = coordinadores.find((u: any) => u.id === s.coordinador_id); if (u) coordCounts[u.nombre] = (coordCounts[u.nombre] || 0) + 1; }
          if (s.desarrolladora_id) { const u = desarrolladoras.find((u: any) => u.id === s.desarrolladora_id); if (u) desaCounts[u.nombre] = (desaCounts[u.nombre] || 0) + 1; }
          if (s.mentora_id) { const m = mentoras.find((m: any) => m.id === s.mentora_id); if (m) mentCounts[m.nombre] = (mentCounts[m.nombre] || 0) + 1; }
        }
        if (Object.keys(coordCounts).length) counts.push(`Coordinadores: ${Object.entries(coordCounts).map(([n, c]) => `${n} (${c})`).join(", ")}`);
        if (Object.keys(desaCounts).length) counts.push(`Desarrolladoras: ${Object.entries(desaCounts).map(([n, c]) => `${n} (${c})`).join(", ")}`);
        if (Object.keys(mentCounts).length) counts.push(`Mentoras: ${Object.entries(mentCounts).map(([n, c]) => `${n} (${c})`).join(", ")}`);

        console.log("Counts:", counts);
        console.log("Errors:", errors);

        setExcelResult({ processed, counts, errors, matchLog });
        setForm({ ...currentForm, socias: updatedSocias });
        toast({ title: "✅ Asignaciones guardadas", description: `${processed} socias, ${matchedCount} asignadas, ${errors.length} errores` });
      } catch (err: any) {
        console.error("Excel processing error:", err);
        toast({ title: "Error al leer Excel", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  }, [coordinadores, desarrolladoras, mentoras, setForm, formRef]);

  // Download unified template
  const downloadUnifiedTemplate = () => {
    const rows = validSocias.map(s => ({
      id_socia: s.id_socia,
      coordinador: "",
      desarrolladora: "",
      mentora: "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asignaciones");
    XLSX.writeFile(wb, `plantilla_asignaciones.xlsx`);
  };

  // Bulk assign selected
  const handleBulkAssign = () => {
    if (!bulkRole || !bulkUser || selected.size === 0) return;
    const updated = [...form.socias];
    for (const s of updated) {
      if (selected.has(s.id_socia) && !s.error) {
        (s as any)[bulkRole] = bulkUser;
      }
    }
    setForm({ ...form, socias: updated });
    setSelected(new Set());
    toast({ title: `${selected.size} socias asignadas` });
  };

  // Update single socia assignment
  const updateSocia = (idSocia: string, field: string, value: string) => {
    const updated = form.socias.map(s =>
      s.id_socia === idSocia ? { ...s, [field]: value || undefined } : s
    );
    setForm({ ...form, socias: updated });
  };

  // Filter socias for table
  const filteredSocias = validSocias.filter(s => {
    if (search && !s.nombre.toLowerCase().includes(search.toLowerCase()) && !s.id_socia.includes(search)) return false;
    if (filterTienda !== "todas" && s.tienda_visita !== filterTienda) return false;
    if (filterSinAsignar === "coordinador" && s.coordinador_id) return false;
    if (filterSinAsignar === "desarrolladora" && s.desarrolladora_id) return false;
    if (filterSinAsignar === "mentora" && s.mentora_id) return false;
    return true;
  });

  const allSelected = filteredSocias.length > 0 && filteredSocias.every(s => selected.has(s.id_socia));

  const bulkRoleUsers = bulkRole === "coordinador_id" ? coordinadores
    : bulkRole === "desarrolladora_id" ? desarrolladoras
    : bulkRole === "mentora_id" ? mentoras : [];

  return (
    <div className="space-y-6">
      {/* Real-time counts — always visible */}
      <div className="space-y-2 rounded-lg border bg-card p-4">
        <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Distribución actual</h4>
        <div className="grid gap-2 sm:grid-cols-3">
          <CountRow
            label="Coordinadores"
            users={coordinadores}
            field="coordinador_id"
            countFn={countBy}
            sinAsignar={sinCoordinador}
          />
          <CountRow
            label="Desarrolladoras"
            users={desarrolladoras}
            field="desarrolladora_id"
            countFn={countBy}
            sinAsignar={sinDesarrolladora}
          />
          <CountRow
            label="Mentoras"
            users={mentoras}
            field="mentora_id"
            countFn={countBy}
            sinAsignar={sinMentora}
          />
        </div>
        {(sinCoordinador > 0 || sinDesarrolladora > 0 || sinMentora > 0) && (
          <div className="flex items-center gap-2 text-sm text-yellow-400 mt-2">
            <AlertTriangle className="h-4 w-4" />
            {sinCoordinador > 0 && <span>{sinCoordinador} sin coordinador</span>}
            {sinDesarrolladora > 0 && <span>· {sinDesarrolladora} sin desarrolladora</span>}
            {sinMentora > 0 && <span>· {sinMentora} sin mentora</span>}
          </div>
        )}
      </div>

      <Tabs value={assignTab} onValueChange={setAssignTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="auto">Automático</TabsTrigger>
          <TabsTrigger value="excel">Cargar Excel</TabsTrigger>
          <TabsTrigger value="manual">Tabla manual</TabsTrigger>
        </TabsList>

        {/* TAB: Automático */}
        <TabsContent value="auto" className="space-y-6 mt-4">
          <AutoSection
            title="Coordinadores"
            users={coordinadores}
            field="coordinador_id"
            countFn={countBy}
            sinAsignar={sinCoordinador}
            onAutoAssign={() => autoAssign("coordinador_id", coordinadores)}
          />
          <AutoSection
            title="Desarrolladoras"
            users={desarrolladoras}
            field="desarrolladora_id"
            countFn={countBy}
            sinAsignar={sinDesarrolladora}
            onAutoAssign={() => autoAssign("desarrolladora_id", desarrolladoras)}
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Mentoras</h3>
              <Button variant="outline" size="sm" onClick={autoAssignMentoras} disabled={mentoras.length === 0}>
                <Shuffle className="mr-2 h-4 w-4" /> Asignar automáticamente
              </Button>
            </div>
            {mentoras.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay mentoras activas</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mentoras.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{m.nombre}</p>
                      <p className="text-xs text-muted-foreground">{m.telefono}</p>
                    </div>
                    <Badge variant="outline">{countBy("mentora_id", m.id)} socias</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: Excel */}
        <TabsContent value="excel" className="space-y-6 mt-4">
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Cargar Excel de asignaciones</h3>
              <Button variant="ghost" size="sm" onClick={downloadUnifiedTemplate}>
                <Download className="mr-2 h-4 w-4" /> Descargar plantilla
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Excel con 4 columnas: <strong>id_socia</strong>, <strong>coordinador</strong> (email), <strong>desarrolladora</strong> (email), <strong>mentora</strong> (nombre). Deja vacía la celda si no quieres asignar.
            </p>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-6 hover:bg-accent/5">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click para cargar Excel de asignaciones</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUnifiedExcel(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {excelResult && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <h4 className="text-sm font-semibold">Resultado de carga</h4>
              <p className="text-sm">{excelResult.processed} socias procesadas</p>
              {excelResult.counts.map((line, i) => (
                <p key={i} className="text-sm font-medium">{line}</p>
              ))}
              {excelResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-destructive">Errores ({excelResult.errors.length}):</p>
                  {excelResult.errors.slice(0, 10).map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err}</p>
                  ))}
                  {excelResult.errors.length > 10 && <p className="text-xs text-muted-foreground">...y {excelResult.errors.length - 10} más</p>}
                </div>
              )}
              {/* Match log for debugging */}
              {excelResult.matchLog && excelResult.matchLog.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Ver detalle de matching ({excelResult.matchLog?.length ?? 0} operaciones)
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5 rounded border p-2 bg-muted/30">
                    {excelResult.matchLog.map((line, i) => (
                      <p key={i} className={`text-xs font-mono ${line.startsWith("✅") ? "text-emerald-500" : line.startsWith("❌") ? "text-destructive" : "text-yellow-500"}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB: Manual */}
        <TabsContent value="manual" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar socia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTienda} onValueChange={setFilterTienda}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tienda" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las tiendas</SelectItem>
                {tiendas.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSinAsignar} onValueChange={setFilterSinAsignar}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Sin asignar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="coordinador">Sin coordinador</SelectItem>
                <SelectItem value="desarrolladora">Sin desarrolladora</SelectItem>
                <SelectItem value="mentora">Sin mentora</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk assign */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border bg-accent/10 p-3">
              <span className="text-sm font-medium">{selected.size} seleccionadas →</span>
              <Select value={bulkRole} onValueChange={(v) => { setBulkRole(v); setBulkUser(""); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordinador_id">Coordinador</SelectItem>
                  <SelectItem value="desarrolladora_id">Desarrolladora</SelectItem>
                  <SelectItem value="mentora_id">Mentora</SelectItem>
                </SelectContent>
              </Select>
              {bulkRole && (
                <Select value={bulkUser} onValueChange={setBulkUser}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Persona" /></SelectTrigger>
                  <SelectContent>
                    {bulkRoleUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" disabled={!bulkUser} onClick={handleBulkAssign}>Asignar</Button>
            </div>
          )}

          {/* Table */}
          <div className="max-h-[500px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelected(new Set(filteredSocias.map(s => s.id_socia)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Socia</TableHead>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Coordinador</TableHead>
                  <TableHead>Desarrolladora</TableHead>
                  <TableHead>Mentora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSocias.map(s => (
                  <TableRow key={s.id_socia}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(s.id_socia)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selected);
                          checked ? next.add(s.id_socia) : next.delete(s.id_socia);
                          setSelected(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{s.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.tienda_visita}</TableCell>
                    <TableCell>
                      <Select value={s.coordinador_id || ""} onValueChange={(v) => updateSocia(s.id_socia, "coordinador_id", v)}>
                        <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {coordinadores.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={s.desarrolladora_id || ""} onValueChange={(v) => updateSocia(s.id_socia, "desarrolladora_id", v)}>
                        <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {desarrolladoras.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={s.mentora_id || ""} onValueChange={(v) => updateSocia(s.id_socia, "mentora_id", v)}>
                        <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {mentoras.map((m: any) => (
                            <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">{filteredSocias.length} de {validSocias.length} socias</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components
function CountRow({ label, users, field, countFn, sinAsignar }: {
  label: string; users: any[]; field: string;
  countFn: (field: string, id: string) => number; sinAsignar: number;
}) {
  return (
    <div className="text-xs space-y-0.5">
      <p className="font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {users.map((u: any) => (
          <span key={u.id}>{u.nombre}: <strong>{countFn(field, u.id)}</strong></span>
        ))}
        {sinAsignar > 0 && <span className="text-yellow-400 font-medium">Sin asignar: {sinAsignar}</span>}
        {sinAsignar === 0 && <span className="text-emerald-400">✓ Completo</span>}
      </div>
    </div>
  );
}

function AutoSection({ title, users, field, countFn, sinAsignar, onAutoAssign }: {
  title: string; users: any[]; field: string;
  countFn: (field: string, id: string) => number;
  sinAsignar: number; onAutoAssign: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button variant="outline" size="sm" onClick={onAutoAssign} disabled={users.length === 0}>
          <Shuffle className="mr-2 h-4 w-4" /> Asignar automáticamente
        </Button>
      </div>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay {title.toLowerCase()} activos</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{u.nombre}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="outline">{countFn(field, u.id)} socias</Badge>
            </div>
          ))}
        </div>
      )}
      {sinAsignar > 0 && (
        <div className="flex items-center gap-2 text-sm text-yellow-400">
          <AlertTriangle className="h-4 w-4" /> {sinAsignar} socias sin {title.toLowerCase().slice(0, -1)}
        </div>
      )}
    </div>
  );
}
