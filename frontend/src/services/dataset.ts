import { request } from './http';

export interface ClassStats {
  name: string;
  count: number;
}

export interface DatasetStatsResponse {
  classes: ClassStats[];
  total: number;
}

export interface UploadedImage {
  filename: string;
  size_bytes: number;
}

export interface DatasetUploadResponse {
  class_name: string;
  uploaded: UploadedImage[];
  saved_count: number;
}

export interface PreviewImage {
  filename: string;
  size_bytes: number;
  preview_data_url: string;
}

export interface DatasetPreviewResponse {
  class_name: string;
  total: number;
  images: PreviewImage[];
}

export interface DeleteClassResponse {
  deleted: boolean;
  class_name: string;
  removed_count: number;
}

export interface DeleteFileResponse {
  deleted: boolean;
  class_name: string;
  filename: string;
}

export async function fetchDatasetStats(): Promise<DatasetStatsResponse> {
  return request<DatasetStatsResponse>('/api/dataset/stats');
}

export async function fetchDatasetPreview(
  className: string,
  limit = 12,
): Promise<DatasetPreviewResponse> {
  return request<DatasetPreviewResponse>(
    `/api/dataset/preview/${encodeURIComponent(className)}?limit=${limit}`,
  );
}

export async function uploadDatasetFiles(
  className: string,
  files: File[],
): Promise<DatasetUploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return request<DatasetUploadResponse>(
    `/api/dataset/upload?class_name=${encodeURIComponent(className)}`,
    {
      method: 'POST',
      body: formData
    },
  );
}

export async function deleteDatasetClass(className: string): Promise<DeleteClassResponse> {
  return request<DeleteClassResponse>(`/api/dataset/${encodeURIComponent(className)}`, {
    method: 'DELETE'
  });
}

export async function deleteDatasetFile(
  className: string,
  filename: string,
): Promise<DeleteFileResponse> {
  return request<DeleteFileResponse>(
    `/api/dataset/${encodeURIComponent(className)}/${encodeURIComponent(filename)}`,
    {
      method: 'DELETE'
    },
  );
}
