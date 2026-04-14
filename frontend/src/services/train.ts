import { request } from './http';

export interface TrainConfig {
  model_arch: 'vit_b_16' | string;
  epochs: number;
  lr: number;
  batch_size: number;
  img_size: number;
  train_split: number;
}

export interface TrainStartResponse {
  task_id: string;
  message: string;
}

export interface TrainStatusResponse {
  running: boolean;
  task_id: string | null;
  current_epoch: number;
  total_epochs: number;
  train_loss: number | null;
  train_acc: number | null;
  val_loss: number | null;
  val_acc: number | null;
  elapsed_seconds: number;
  eta_seconds: number | null;
}

export interface EpochMetrics {
  epoch: number;
  train_loss: number;
  train_acc: number;
  val_loss: number;
  val_acc: number;
}

export interface TrainHistoryResponse {
  epochs: EpochMetrics[];
}

export interface TrainStopResponse {
  stopped: boolean;
}

export async function startTraining(payload: TrainConfig): Promise<TrainStartResponse> {
  return request<TrainStartResponse>('/api/train/start', {
    method: 'POST',
    bodyJson: payload
  });
}

export async function fetchTrainStatus(): Promise<TrainStatusResponse> {
  return request<TrainStatusResponse>('/api/train/status');
}

export async function fetchTrainHistory(): Promise<TrainHistoryResponse> {
  return request<TrainHistoryResponse>('/api/train/history');
}

export async function stopTraining(): Promise<TrainStopResponse> {
  return request<TrainStopResponse>('/api/train/stop', {
    method: 'POST'
  });
}
