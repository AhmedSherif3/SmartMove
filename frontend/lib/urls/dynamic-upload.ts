import { getApiBaseUrl } from "@/lib/urls/apiBase";

const API_BASE_URL = getApiBaseUrl();

export const dynamicUploadApi = {
  /**
   * Fetches the recent upload history for the dashboard table.
   */
  async getHistory() {
    const response = await fetch(`${API_BASE_URL}/upload/list/`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch upload history");
    }

    return response.json();
  },

  /**
   * Step 1: Request a secure SAS token from Azure via Django.
   */
  async generateSasToken(fileName: string, region: string) {
    const response = await fetch(`${API_BASE_URL}/upload/sas-token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: fileName, region }),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to generate SAS token");
    }

    return response.json() as Promise<{ sas_url: string; blob_name: string }>;
  },

  /**
   * Step 3: Register the successful Azure upload with Django to trigger the background tasks.
   */
  async registerUpload(payload: {
    file_name: string;
    region: string;
    blob_name: string;
    file_size_bytes: number;
    notify_users?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/upload/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to register upload");
    }

    return response.json();
  }
};
