import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Activity, ShieldCheck } from "lucide-react";

export default function Setup() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if users already exist
    supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => {
        if (count && count > 0) {
          navigate("/login");
        }
        setChecking(false);
      });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password.trim()) return;
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSubmitting(true);

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (authError || !authData.user) {
      toast.error(authError?.message || "Error al crear usuario");
      setSubmitting(false);
      return;
    }

    // 2. Insert into usuarios table
    const { error: insertError } = await supabase.from("usuarios").insert({
      auth_id: authData.user.id,
      nombre,
      email,
      rol: "director" as any,
      modo_operativo: [],
    });

    if (insertError) {
      toast.error("Error al guardar perfil: " + insertError.message);
      setSubmitting(false);
      return;
    }

    // 3. Sign out and redirect to login
    await supabase.auth.signOut();
    toast.success("Usuario administrador creado. Inicia sesión.");
    navigate("/login");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Configuración Inicial</CardTitle>
          <CardDescription className="text-muted-foreground">
            Crea el primer usuario administrador de Pulso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" placeholder="Victor" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="victor@priceshoes.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creando..." : "Crear Administrador"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
