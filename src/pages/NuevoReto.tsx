import { useNavigate } from "react-router-dom";
import { RetoWizard } from "@/components/reto/RetoWizard";

export default function NuevoReto() {
  const navigate = useNavigate();

  return (
    <RetoWizard
      onClose={() => navigate("/gestion-retos")}
      onPublished={() => navigate("/reto-activo")}
    />
  );
}
