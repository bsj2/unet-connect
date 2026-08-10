import { AuthForm } from "@/components/auth-form"; // Asegúrate de que el nombre coincida con el de v0

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AuthForm />
    </div>
  );
}