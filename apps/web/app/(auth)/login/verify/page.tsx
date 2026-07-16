import { Suspense } from "react";
import { VerifyStatus } from "./VerifyStatus";

export default function VerifyPage() {
  return (
    <div className="screen">
      <Suspense fallback={null}>
        <VerifyStatus />
      </Suspense>
    </div>
  );
}
