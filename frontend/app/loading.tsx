import AuthFusionLoader from "@/components/orb/AuthFusionLoader";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-transparent">
      <div className="w-full max-w-md">
        <AuthFusionLoader label="Preparing your next page..." />
      </div>
    </div>
  );
}
