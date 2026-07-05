/**
 * azure-storage.ts
 * 
 * Lightweight utility to handle the direct PUT request to Azure Blob Storage
 * using the pre-signed SAS URL.
 */

export async function uploadFileToAzure(file: File, sasUrl: string) {
  const response = await fetch(sasUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": file.type || "text/csv",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Azure Upload Failed: ${response.statusText}`);
  }

  return true;
}
