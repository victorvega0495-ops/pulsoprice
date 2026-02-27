import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, UserPlus, Users } from "lucide-react";

type UserRole = "director" | "gerente" | "coordinador" | "desarrolladora";

interface TeamMember {
  id: string;
  auth_id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  source: "usuario" | "mentora";
  telefono?: string;
  id_socia?: string;
  pin_acceso?: string;
}

const rolBadge: Record<string, { label: string; className: string }> = {
  director: { label: "Director", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  gerente: { label: "Gerente", className: "bg-blue-800/20 text-blue-300 border-blue-800/30" },
  coordinador: { label: "Coordinador", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  desarrolladora: { label: "Desarrolladora", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  mentora: { label: "Mentora", className: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
};

const filterTabs = [
  { value: "todos", label: "Todos" },
  { value: "coordinador", label: "Coordinadores" },
  { value: "desarrolladora", label: "Desarrolladoras" },
  { value: "mentora", label: "Mentoras" },
];

export default function Equipo() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("todos");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createMentoraOpen, setCreateMentoraOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("usuarios").select("*");
      if (error) throw error;
      return (data || []).map((u: any) => ({ ...u, source: "usuario" as const }));
    },
  });

  const { data: mentoras = [] } = useQuery({
    queryKey: ["mentoras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mentoras").select("*");
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        auth_id: m.auth_id || "",
        nombre: m.nombre,
        email: "",
        rol: "mentora",
        activo: m.activa,
        source: "mentora" as const,
        telefono: m.telefono,
        id_socia: m.id_socia,
        pin_acceso: m.pin_acceso,
      }));
    },
  });

  const allMembers: TeamMember[] = [...usuarios, ...mentoras];
  const filtered = filter === "todos"
    ? allMembers
    : allMembers.filter((m) => m.rol === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipo</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona los miembros del equipo
          </p>
        </div>
        {(profile?.rol === "director" || profile?.rol === "gerente") && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCreateMentoraOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nueva mentora
            </Button>
            <Button onClick={() => setCreateUserOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo miembro
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  No hay miembros en esta categoría
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow
                  key={`${member.source}-${member.id}`}
                  className="cursor-pointer"
                  onClick={() =>
                    (profile?.rol === "director" || profile?.rol === "gerente") &&
                    setEditMember(member)
                  }
                >
                  <TableCell className="font-medium">{member.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.source === "mentora" ? member.telefono || "—" : member.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={rolBadge[member.rol]?.className}>
                      {rolBadge[member.rol]?.label || member.rol}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          member.activo ? "bg-emerald-400" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {member.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["usuarios"] })}
      />

      <CreateMentoraDialog
        open={createMentoraOpen}
        onOpenChange={setCreateMentoraOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["mentoras"] })}
      />

      {editMember && (
        <EditMemberDialog
          member={editMember}
          open={!!editMember}
          onOpenChange={(open) => !open && setEditMember(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["usuarios"] });
            queryClient.invalidateQueries({ queryKey: ["mentoras"] });
            setEditMember(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Create User Dialog ─── */
function CreateUserDialog({
  open, onOpenChange, onSuccess,
}: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<UserRole>("coordinador");
  const [loading, setLoading] = useState(false);

  const reset = () => { setNombre(""); setEmail(""); setPassword(""); setRol("coordinador"); };

  const handleSubmit = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Campos requeridos", description: "Nombre, email y contraseña son obligatorios", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Contraseña muy corta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("create-user", {
        body: { email: email.trim(), password, nombre: nombre.trim(), rol },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Error al crear usuario");
      }
      toast({ title: "Usuario creado", description: `${nombre} fue agregado al equipo` });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo miembro del equipo</DialogTitle>
          <DialogDescription>Crea una cuenta para un nuevo miembro</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" />
          </div>
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={rol} onValueChange={(v) => setRol(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="director">Director</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="coordinador">Coordinador</SelectItem>
                <SelectItem value="desarrolladora">Desarrolladora</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando..." : "Crear miembro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Create Mentora Dialog ─── */
function CreateMentoraDialog({
  open, onOpenChange, onSuccess,
}: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [idSocia, setIdSocia] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setNombre(""); setTelefono(""); setIdSocia(""); setPin(""); };

  const handleSubmit = async () => {
    if (!nombre.trim() || !telefono.trim() || !pin.trim()) {
      toast({ title: "Campos requeridos", description: "Nombre, teléfono y PIN son obligatorios", variant: "destructive" });
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      toast({ title: "PIN inválido", description: "El PIN debe ser de 4 dígitos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("mentoras").insert({
        nombre: nombre.trim(), telefono: telefono.trim(),
        id_socia: idSocia.trim() || null, pin_acceso: pin,
      });
      if (error) throw error;
      toast({ title: "Mentora creada", description: `${nombre} fue agregada al equipo` });
      reset(); onOpenChange(false); onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva mentora</DialogTitle>
          <DialogDescription>Agrega una mentora al equipo</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="55 1234 5678" />
          </div>
          <div className="space-y-2">
            <Label>ID Socia (opcional)</Label>
            <Input value={idSocia} onChange={(e) => setIdSocia(e.target.value)} placeholder="ID de socia" />
          </div>
          <div className="space-y-2">
            <Label>PIN de acceso (4 dígitos)</Label>
            <Input value={pin} onChange={(e) => setPin(e.target.value)} maxLength={4} placeholder="0000" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando..." : "Crear mentora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit Member Dialog ─── */
function EditMemberDialog({
  member, open, onOpenChange, onSuccess,
}: { member: TeamMember; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void; }) {
  const [nombre, setNombre] = useState(member.nombre);
  const [rol, setRol] = useState(member.rol);
  const [activo, setActivo] = useState(member.activo);
  const [loading, setLoading] = useState(false);

  const isMentora = member.source === "mentora";

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isMentora) {
        const { error } = await supabase
          .from("mentoras")
          .update({ nombre: nombre.trim(), activa: activo })
          .eq("id", member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("usuarios")
          .update({ nombre: nombre.trim(), rol: rol as any, activo })
          .eq("id", member.id);
        if (error) throw error;
      }
      toast({ title: "Actualizado", description: `${nombre} fue actualizado` });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {isMentora ? "mentora" : "miembro"}</DialogTitle>
          <DialogDescription>Modifica los datos del miembro</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          {!isMentora && (
            <>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={member.email} disabled className="opacity-50" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={rol} onValueChange={setRol}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="coordinador">Coordinador</SelectItem>
                    <SelectItem value="desarrolladora">Desarrolladora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Estado</p>
              <p className="text-xs text-muted-foreground">
                {activo ? "El usuario puede acceder al sistema" : "El usuario no puede acceder"}
              </p>
            </div>
            <Switch checked={activo} onCheckedChange={setActivo} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
