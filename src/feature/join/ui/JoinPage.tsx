import JoinCard from "../component/JoinCard";
import { useActionData } from "react-router";

export default function JoinPage() {
  const actionData = useActionData() as { error?: string } | undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="space-y-6 w-full max-w-3xl px-4">
        <JoinCard />

        {actionData?.error ? (
          <div className="text-center text-sm text-red-600">
            {actionData.error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
