import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { fetchDatasetStats, type DatasetStatsResponse } from '../services/dataset';
import {
  fetchTrainHistory,
  fetchTrainStatus,
  startTraining,
  stopTraining,
  type EpochMetrics,
  type TrainConfig,
  type TrainStatusResponse
} from '../services/train';
import { HttpError } from '../services/http';

type TrainFormState = {
  model_arch: TrainConfig['model_arch'];
  epochs: string;
  lr: string;
  batch_size: string;
  img_size: string;
  train_split: string;
};

const modelOptions: Array<{ value: TrainConfig['model_arch']; label: string; copy: string }> = [
  {
    value: 'vit_b_16',
    label: 'Torchvision ViT-B/16',
    copy: '使用 torchvision 内置的 Vision Transformer，并优先加载官方预训练权重。'
  }
];

const defaultFormState: TrainFormState = {
  model_arch: 'vit_b_16',
  epochs: '10',
  lr: '0.001',
  batch_size: '16',
  img_size: '224',
  train_split: '0.8'
};

function formatNumber(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return value.toFixed(digits);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  return `${(value * 100).toFixed(1)}%`;
}

function formatSeconds(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }

  if (value < 60) {
    return `${value.toFixed(0)}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatTimestamp(value: Date): string {
  return value.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getHttpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

function parseTrainConfig(form: TrainFormState): { config: TrainConfig | null; error: string | null } {
  const epochs = Number.parseInt(form.epochs, 10);
  const lr = Number.parseFloat(form.lr);
  const batchSize = Number.parseInt(form.batch_size, 10);
  const imgSize = Number.parseInt(form.img_size, 10);
  const trainSplit = Number.parseFloat(form.train_split);

  if (!form.model_arch) {
    return { config: null, error: '请选择一个可用的 ViT 配置。' };
  }

  if (!Number.isInteger(epochs) || epochs < 1) {
    return { config: null, error: '训练轮数必须是大于 0 的整数。' };
  }

  if (!Number.isFinite(lr) || lr <= 0) {
    return { config: null, error: '学习率必须是一个大于 0 的数字。' };
  }

  if (!Number.isInteger(batchSize) || batchSize < 1) {
    return { config: null, error: '批量大小必须是大于 0 的整数。' };
  }

  if (!Number.isInteger(imgSize) || imgSize < 64) {
    return { config: null, error: '图像尺寸至少需要 64。' };
  }

  if (!Number.isFinite(trainSplit) || trainSplit <= 0 || trainSplit >= 1) {
    return { config: null, error: '训练集划分比例必须在 0 和 1 之间。' };
  }

  return {
    config: {
      model_arch: form.model_arch,
      epochs,
      lr,
      batch_size: batchSize,
      img_size: imgSize,
      train_split: trainSplit
    },
    error: null
  };
}

function getLatestMetrics(history: EpochMetrics[]): EpochMetrics | null {
  return history.length > 0 ? history[history.length - 1] ?? null : null;
}

export default function TrainPage() {
  const refreshTimerRef = useRef<number | null>(null);

  const [form, setForm] = useState<TrainFormState>(defaultFormState);
  const [datasetStats, setDatasetStats] = useState<DatasetStatsResponse | null>(null);
  const [status, setStatus] = useState<TrainStatusResponse | null>(null);
  const [history, setHistory] = useState<EpochMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [pageError, setPageError] = useState('');
  const [syncNote, setSyncNote] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const totalImages = datasetStats?.total ?? 0;
  const classCount = datasetStats?.classes.length ?? 0;
  const latestMetrics = getLatestMetrics(history);
  const statusProgress =
    status && status.total_epochs > 0
      ? Math.min(100, (status.current_epoch / status.total_epochs) * 100)
      : 0;
  const activeTaskLabel = status?.task_id ? status.task_id.slice(0, 8) : '--';
  const selectedModel = modelOptions.find((option) => option.value === form.model_arch);
  const selectedModelLabel = selectedModel?.label ?? form.model_arch;
  const selectedModelCopy = selectedModel?.copy ?? '';
  const datasetReady = datasetStats ? datasetStats.total > 0 : false;

  const refreshDashboard = useCallback(
    async (mode: 'bootstrap' | 'poll' = 'poll') => {
      const [datasetResult, statusResult, historyResult] = await Promise.allSettled([
        fetchDatasetStats(),
        fetchTrainStatus(),
        fetchTrainHistory()
      ]);

      const errors: string[] = [];

      if (datasetResult.status === 'fulfilled') {
        setDatasetStats(datasetResult.value);
      } else {
        errors.push(getHttpErrorMessage(datasetResult.reason, '加载数据集信息失败。'));
      }

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value);
      } else {
        errors.push(getHttpErrorMessage(statusResult.reason, '加载训练状态失败。'));
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value.epochs);
      } else {
        errors.push(getHttpErrorMessage(historyResult.reason, '加载训练历史失败。'));
      }

      const mergedError = errors[0] ?? '';
      if (mode === 'bootstrap') {
        setPageError(mergedError);
      } else if (mergedError) {
        setSyncNote(`后台同步遇到一点问题：${mergedError}`);
      } else {
        setSyncNote('');
      }

      if (!mergedError) {
        setLastSyncedAt(formatTimestamp(new Date()));
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      setIsLoading(true);
      try {
        await refreshDashboard('bootstrap');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (refreshTimerRef.current !== null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!status?.running) {
      return undefined;
    }

    refreshTimerRef.current = window.setInterval(() => {
      void refreshDashboard('poll');
    }, 4000);

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [refreshDashboard, status?.running]);

  async function handleStartTraining(): Promise<void> {
    const parsedConfig = parseTrainConfig(form);

    if (parsedConfig.error) {
      setPageError(parsedConfig.error);
      setSyncNote('');
      return;
    }

    if (datasetStats && datasetStats.total === 0) {
      setPageError('当前还没有可训练的数据集，请先到 Dataset 页上传图片。');
      setSyncNote('');
      return;
    }

    setPageError('');
    setSyncNote('');
    setIsSubmitting(true);

    try {
      const config = parsedConfig.config;
      if (!config) {
        return;
      }

      const result = await startTraining(config);
      setSyncNote(result.message);
      await refreshDashboard('bootstrap');
    } catch (error) {
      setPageError(getHttpErrorMessage(error, '启动训练失败。'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStopTraining(): Promise<void> {
    setPageError('');
    setSyncNote('');
    setIsStopping(true);

    try {
      const result = await stopTraining();
      if (result.stopped) {
        setSyncNote('训练已请求停止，正在同步最新状态。');
      }
      await refreshDashboard('bootstrap');
    } catch (error) {
      setPageError(getHttpErrorMessage(error, '停止训练失败。'));
    } finally {
      setIsStopping(false);
    }
  }

  const isBusy = isLoading || isSubmitting || isStopping;

  return (
    <section className="card train-page">
      <div className="train-hero">
        <div>
          <h2 className="page-title">Train</h2>
          <p className="page-desc">
            这里是训练 MVP 控制台。先配置模型和超参数，再启动训练并轮询状态与历史记录。
            如果还没有数据集，请先去 Dataset 页上传图片。
          </p>
        </div>
        <div className="train-summary">
          <div>
            <span>数据集</span>
            <strong>{datasetReady ? `${totalImages} 张图片` : '尚未就绪'}</strong>
          </div>
          <div>
            <span>当前任务</span>
            <strong>{status?.running ? '训练中' : '待机'}</strong>
          </div>
          <div>
            <span>任务 ID</span>
            <strong title={status?.task_id ?? ''}>{activeTaskLabel}</strong>
          </div>
          <div>
            <span>当前模型</span>
            <strong>{selectedModelLabel}</strong>
          </div>
        </div>
      </div>

      {pageError ? <div className="feedback error">{pageError}</div> : null}
      {syncNote ? <div className="feedback success">{syncNote}</div> : null}

      <div className="train-grid">
        <section className="train-panel">
          <div className="panel-head">
            <h3>训练参数</h3>
            <span className="panel-badge">Simple ViT</span>
          </div>
          <p className="panel-copy">
            参数会直接传给后端训练接口。当前版本固定使用 torchvision 内置的
            <code> vit_b_16 </code>
            路径，界面展示与后端实际训练保持一致。
          </p>
          <div className="train-form-grid">
            <label className="field">
              <span>Model</span>
              <select
                value={form.model_arch}
                onChange={(event) =>
                  setForm((current) => ({ ...current, model_arch: event.target.value }))
                }
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small className="field-copy">{selectedModelCopy}</small>
            </label>

            <label className="field">
              <span>Epochs</span>
              <input
                type="number"
                min={1}
                value={form.epochs}
                onChange={(event) => setForm((current) => ({ ...current, epochs: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Learning Rate</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={form.lr}
                onChange={(event) => setForm((current) => ({ ...current, lr: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Batch Size</span>
              <input
                type="number"
                min={1}
                value={form.batch_size}
                onChange={(event) =>
                  setForm((current) => ({ ...current, batch_size: event.target.value }))
                }
              />
            </label>

            <label className="field">
              <span>Image Size</span>
              <input
                type="number"
                min={64}
                step="32"
                value={form.img_size}
                onChange={(event) => setForm((current) => ({ ...current, img_size: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Train Split</span>
              <input
                type="number"
                min={0.05}
                max={0.95}
                step="0.05"
                value={form.train_split}
                onChange={(event) =>
                  setForm((current) => ({ ...current, train_split: event.target.value }))
                }
              />
            </label>
          </div>

          <div className="inline-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleStartTraining()}
              disabled={isBusy || status?.running}
            >
              {isSubmitting ? '启动中...' : '开始训练'}
            </button>
            <button
              type="button"
              className="danger-btn"
              onClick={() => void handleStopTraining()}
              disabled={isBusy || !status?.running}
            >
              {isStopping ? '停止中...' : '停止训练'}
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => void refreshDashboard('bootstrap')}
              disabled={isLoading}
            >
              刷新状态
            </button>
          </div>
        </section>

        <section className="train-panel">
          <div className="panel-head">
            <h3>训练状态</h3>
            <span className={status?.running ? 'panel-badge panel-badge-live' : 'panel-badge'}>
              {status?.running ? '运行中' : '空闲'}
            </span>
          </div>

          <div className="progress-card">
            <div className="progress-row">
              <strong>
                {status?.current_epoch ?? 0} / {status?.total_epochs ?? 0}
              </strong>
              <span>{status?.running ? '正在轮询后端状态' : '等待训练任务启动'}</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${statusProgress}%` }} />
            </div>
            <p className="muted-copy">
              {status?.running
                ? `任务 ${activeTaskLabel} 正在执行。后端一旦补充 epoch 写入，页面会自动展示历史。`
                : '启动后这里会显示当前 epoch、总轮数、耗时和 ETA。'}
            </p>
          </div>

          <div className="metric-grid">
            <article className="metric-card">
              <span>Train Loss</span>
              <strong>{formatNumber(status?.train_loss)}</strong>
            </article>
            <article className="metric-card">
              <span>Train Acc</span>
              <strong>{formatPercent(status?.train_acc)}</strong>
            </article>
            <article className="metric-card">
              <span>Val Loss</span>
              <strong>{formatNumber(status?.val_loss)}</strong>
            </article>
            <article className="metric-card">
              <span>Val Acc</span>
              <strong>{formatPercent(status?.val_acc)}</strong>
            </article>
          </div>

          <div className="train-meta-grid">
            <div className="selection-card">
              <strong>耗时 / 预计剩余</strong>
              <span>
                {formatSeconds(status?.elapsed_seconds)} / {formatSeconds(status?.eta_seconds)}
              </span>
            </div>
            <div className="selection-card">
              <strong>数据集概览</strong>
              <span>
                {datasetStats
                  ? `${classCount} 个类别，${totalImages} 张图片`
                  : '尚未获取数据集信息'}
              </span>
            </div>
          </div>

          <div className="panel-footnote">
            {lastSyncedAt ? <span>最近同步：{lastSyncedAt}</span> : <span>尚未完成同步。</span>}
            {datasetStats && datasetStats.total === 0 ? (
              <NavLink className="inline-link" to="/dataset">
                先去 Dataset 页上传图片
              </NavLink>
            ) : null}
          </div>
        </section>
      </div>

      <div className="train-grid train-grid-bottom">
        <section className="train-panel">
          <div className="panel-head">
            <h3>数据集就绪情况</h3>
            <span className="panel-badge">来源于 Dataset API</span>
          </div>

          {datasetStats ? (
            <>
              <div className="selection-card">
                <strong>{datasetReady ? '数据集已就绪' : '当前还没有可训练的数据集'}</strong>
                <span>
                  {datasetStats.total > 0
                    ? `总共 ${datasetStats.total} 张图片，分布在 ${datasetStats.classes.length} 个类别里。`
                    : '先上传至少一个类别的图片，再启动训练。'}
                </span>
              </div>
              <div className="class-list class-list-inline">
                {datasetStats.classes.length === 0 ? (
                  <p className="empty-copy">还没有类别。</p>
                ) : (
                  datasetStats.classes.map((item) => (
                    <div key={item.name} className="class-chip class-chip-static">
                      <span>{item.name}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="empty-copy">正在加载数据集信息，或者后端暂时不可用。</p>
          )}
        </section>

        <section className="train-panel">
          <div className="panel-head">
            <h3>训练历史</h3>
            <span className="panel-badge">{history.length > 0 ? `${history.length} 条记录` : '暂无记录'}</span>
          </div>

          {history.length === 0 ? (
            <p className="empty-copy">
              训练历史会在后端开始写入 epoch 结果后自动出现。当前版本已经把轮询和展示位都准备好了。
            </p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <article key={item.epoch} className="history-item">
                  <div className="history-head">
                    <strong>Epoch {item.epoch}</strong>
                    <span>{formatPercent(item.val_acc)}</span>
                  </div>
                  <div className="history-grid">
                    <span>Train Loss {formatNumber(item.train_loss)}</span>
                    <span>Train Acc {formatPercent(item.train_acc)}</span>
                    <span>Val Loss {formatNumber(item.val_loss)}</span>
                    <span>Val Acc {formatPercent(item.val_acc)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {latestMetrics ? (
            <div className="selection-card history-highlight">
              <strong>最近一轮</strong>
              <span>
                Epoch {latestMetrics.epoch} · Train Loss {formatNumber(latestMetrics.train_loss)} · Val
                Acc {formatPercent(latestMetrics.val_acc)}
              </span>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
