import { engineApi } from "./engineApi";
import { getAuthSession, saveAuthSession } from "@/lib/auth/session";

export interface SubscriptionStatus {
  role: string;
  total_minio_storage_gb: number;
  active_plans: string[];
}

export async function createCheckoutSession(plan: string, quantity: number = 1, region?: string) {
  const { data } = await engineApi.post<{ checkout_url: string }>("/subscriptions/checkout/", {
    plan,
    quantity,
    region,
  });
  return data;
}

export async function cancelSubscription(planType: string) {
  const { data } = await engineApi.post<{ message: string }>("/subscriptions/cancel/", {
    plan_type: planType,
  });
  return data;
}

export async function fetchSubscriptionStatus() {
  const { data } = await engineApi.get<SubscriptionStatus>("/subscriptions/status/");
  
  // Dynamic session syncing with localStorage
  if (typeof window !== "undefined") {
    const session = getAuthSession();
    if (session && data.role) {
      // Normalise backend profile.role to frontend AuthSession role format
      let mappedRole = session.role;
      if (data.role === "data_analyst") {
        mappedRole = "DATA_ANALYST";
      } else if (data.role === "user") {
        mappedRole = "USER";
      } else {
        mappedRole = data.role.toUpperCase();
      }
      
      if (session.role !== mappedRole) {
        saveAuthSession({
          userId: session.userId,
          email: session.email,
          role: mappedRole,
        });
        // Dispatch custom storage/session changed event to notify layout
        window.dispatchEvent(new Event("storage"));
      }
    }
  }
  
  return data;
}
