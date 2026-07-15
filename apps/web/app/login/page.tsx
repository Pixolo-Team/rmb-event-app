import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="screen">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
