import { Suspense } from "react";
import { OnboardingFlow } from "./OnboardingFlow";

export default function OnboardingPage() {
  return (
    <div className="screen onboarding-screen">
      <Suspense fallback={null}>
        <OnboardingFlow />
      </Suspense>
    </div>
  );
}
