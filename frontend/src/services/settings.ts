import { request } from './http';

export interface StorageSettingsResponse {
  storage_root: string;
  source: 'default' | 'saved' | 'env' | string;
  env_override: boolean;
}

export async function fetchStorageSettings(): Promise<StorageSettingsResponse> {
  return request<StorageSettingsResponse>('/api/settings/storage');
}

export async function updateStorageSettings(
  storageRoot: string,
): Promise<StorageSettingsResponse> {
  return request<StorageSettingsResponse>('/api/settings/storage', {
    method: 'PUT',
    bodyJson: { storage_root: storageRoot }
  });
}
