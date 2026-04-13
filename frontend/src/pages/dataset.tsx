import { useEffect, useRef, useState } from 'react';

import {
  deleteDatasetClass,
  deleteDatasetFile,
  fetchDatasetPreview,
  fetchDatasetStats,
  uploadDatasetFiles,
  type ClassStats,
  type PreviewImage
} from '../services/dataset';
import {
  fetchStorageSettings,
  updateStorageSettings,
  type StorageSettingsResponse
} from '../services/settings';

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getSelectedFolderLabel(files: File[]): string | null {
  const firstRelativePath = files[0] && 'webkitRelativePath' in files[0]
    ? files[0].webkitRelativePath
    : '';

  if (!firstRelativePath || !firstRelativePath.includes('/')) {
    return null;
  }

  return firstRelativePath.split('/')[0] ?? null;
}

export default function DatasetPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const [storageSettings, setStorageSettings] = useState<StorageSettingsResponse | null>(null);
  const [storageDraft, setStorageDraft] = useState('');
  const [className, setClassName] = useState('');
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSavingStorage, setIsSavingStorage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  const totalImages = classes.reduce((sum, item) => sum + item.count, 0);

  async function refreshStats(nextSelectedClass?: string): Promise<void> {
    const stats = await fetchDatasetStats();
    setClasses(stats.classes);

    const fallbackClass = nextSelectedClass ?? selectedClass;
    const resolvedClass =
      stats.classes.find((item) => item.name === fallbackClass)?.name ??
      stats.classes[0]?.name ??
      '';

    setSelectedClass(resolvedClass);
  }

  async function refreshPreview(targetClass: string): Promise<void> {
    if (!targetClass) {
      setPreviewImages([]);
      return;
    }

    const preview = await fetchDatasetPreview(targetClass);
    setPreviewImages(preview.images);
  }

  useEffect(() => {
    const folderInput = folderInputRef.current;
    if (!folderInput) {
      return;
    }

    folderInput.setAttribute('webkitdirectory', '');
    folderInput.setAttribute('directory', '');
  }, []);

  useEffect(() => {
    async function bootstrap(): Promise<void> {
      try {
        const [settings, stats] = await Promise.all([
          fetchStorageSettings(),
          fetchDatasetStats()
        ]);
        setClasses(stats.classes);

        const resolvedClass = stats.classes[0]?.name ?? '';
        setSelectedClass(resolvedClass);
        setStorageSettings(settings);
        setStorageDraft(settings.storage_root);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '初始化数据集页面失败。');
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    void refreshPreview(selectedClass).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : '加载预览失败。');
    });
  }, [selectedClass]);

  async function handleSaveStorage(): Promise<void> {
    if (!storageDraft.trim()) {
      setErrorMessage('请先填写一个仓库外的存储目录路径。');
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setIsSavingStorage(true);

    try {
      const nextSettings = await updateStorageSettings(storageDraft.trim());
      setStorageSettings(nextSettings);
      setStorageDraft(nextSettings.storage_root);
      setStatusMessage('存储目录已保存，后端会记忆这次设置。');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存存储目录失败。');
    } finally {
      setIsSavingStorage(false);
    }
  }

  function handleSelectedFiles(files: File[]): void {
    setSelectedFiles(files);
    setSourceLabel(getSelectedFolderLabel(files));
    setStatusMessage(files.length > 0 ? `已选中 ${files.length} 个文件。` : '');
    setErrorMessage('');
  }

  async function handleUpload(): Promise<void> {
    if (!className.trim()) {
      setErrorMessage('请先输入类别名称。');
      return;
    }

    if (selectedFiles.length === 0) {
      setErrorMessage('请先选择文件或文件夹。');
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setIsUploading(true);

    try {
      const result = await uploadDatasetFiles(className.trim(), selectedFiles);
      setClassName('');
      setSelectedFiles([]);
      setSourceLabel(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }

      await refreshStats(result.class_name);
      setStatusMessage(
        `已上传 ${result.saved_count} 个文件到类别 ${result.class_name}。`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '上传失败。');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteClass(): Promise<void> {
    if (!selectedClass) {
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setIsDeletingClass(true);

    try {
      const result = await deleteDatasetClass(selectedClass);
      await refreshStats();
      setStatusMessage(`已删除类别 ${result.class_name}，共移除 ${result.removed_count} 个文件。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '删除类别失败。');
    } finally {
      setIsDeletingClass(false);
    }
  }

  async function handleDeleteImage(filename: string): Promise<void> {
    if (!selectedClass) {
      return;
    }

    setErrorMessage('');
    setStatusMessage('');
    setDeletingFilename(filename);

    try {
      await deleteDatasetFile(selectedClass, filename);
      await refreshStats(selectedClass);
      await refreshPreview(selectedClass);
      setStatusMessage(`已删除 ${filename}。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '删除图片失败。');
    } finally {
      setDeletingFilename(null);
    }
  }

  return (
    <section className="card dataset-page">
      <div className="dataset-hero">
        <div>
          <h2 className="page-title">Dataset</h2>
          <p className="page-desc">
            现在可以直接在页面里选择整个文件夹上传训练图片，并查看类别统计与预览。
            运行时数据会落到仓库外的外置目录里。
          </p>
        </div>
        <div className="dataset-summary">
          <span>{classes.length} 个类别</span>
          <strong>{totalImages} 张图片</strong>
        </div>
      </div>

      <div className="dataset-grid">
        <section className="dataset-panel">
          <div className="panel-head">
            <h3>外置存储目录</h3>
            <span className="panel-badge">
              {storageSettings?.source === 'env' ? '环境变量覆盖中' : '记忆上次选择'}
            </span>
          </div>
          <p className="panel-copy">
            浏览器不能把系统目录选择器的真实绝对路径直接交给后端服务，所以目标存储目录
            需要填写绝对路径；保存后后端会记住上一次的设置。
          </p>
          <label className="field">
            <span>存储根目录</span>
            <input
              value={storageDraft}
              onChange={(event) => setStorageDraft(event.target.value)}
              placeholder="/Volumes/Data/FaunaLab"
            />
          </label>
          <div className="inline-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleSaveStorage()}
              disabled={isSavingStorage || storageSettings?.env_override}
            >
              {isSavingStorage ? '保存中...' : '保存目录'}
            </button>
            {storageSettings?.env_override ? (
              <span className="muted-copy">当前被 `FAUNA_LAB_STORAGE_DIR` 覆盖。</span>
            ) : null}
          </div>
        </section>

        <section className="dataset-panel">
          <div className="panel-head">
            <h3>上传数据</h3>
            <span className="panel-badge">支持文件夹</span>
          </div>
          <label className="field">
            <span>类别名称</span>
            <input
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              placeholder="例如 cat、fox、hamster"
            />
          </label>
          <input
            ref={fileInputRef}
            className="hidden-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handleSelectedFiles(Array.from(event.target.files ?? []))}
          />
          <input
            ref={folderInputRef}
            className="hidden-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handleSelectedFiles(Array.from(event.target.files ?? []))}
          />
          <div className="inline-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              选择图片
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => folderInputRef.current?.click()}
            >
              选择文件夹
            </button>
            <button
              type="button"
              className="primary-btn"
              onClick={() => void handleUpload()}
              disabled={isUploading}
            >
              {isUploading ? '上传中...' : '开始上传'}
            </button>
          </div>
          <div className="selection-card">
            <strong>{selectedFiles.length > 0 ? `${selectedFiles.length} 个待上传文件` : '尚未选择文件'}</strong>
            <span>
              {sourceLabel ? `来源文件夹：${sourceLabel}` : '支持直接选择一个包含多张图片的文件夹。'}
            </span>
          </div>
        </section>
      </div>

      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
      {statusMessage ? <div className="feedback success">{statusMessage}</div> : null}

      <div className="dataset-grid">
        <section className="dataset-panel">
          <div className="panel-head">
            <h3>类别列表</h3>
            <span className="panel-badge">自动刷新</span>
          </div>
          <div className="class-list">
            {classes.length === 0 ? (
              <p className="empty-copy">还没有任何类别，先上传一个文件夹试试看。</p>
            ) : (
              classes.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={item.name === selectedClass ? 'class-chip active' : 'class-chip'}
                  onClick={() => setSelectedClass(item.name)}
                >
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </button>
              ))
            )}
          </div>
          <div className="inline-actions">
            <button
              type="button"
              className="danger-btn"
              disabled={!selectedClass || isDeletingClass}
              onClick={() => void handleDeleteClass()}
            >
              {isDeletingClass ? '删除中...' : '删除当前类别'}
            </button>
          </div>
        </section>

        <section className="dataset-panel preview-panel">
          <div className="panel-head">
            <h3>类别预览</h3>
            <span className="panel-badge">{selectedClass || '未选择类别'}</span>
          </div>
          {!selectedClass ? (
            <p className="empty-copy">先选择一个类别，这里会展示预览图。</p>
          ) : previewImages.length === 0 ? (
            <p className="empty-copy">这个类别暂时没有可预览的图片。</p>
          ) : (
            <div className="preview-grid">
              {previewImages.map((image) => (
                <article key={image.filename} className="preview-card">
                  <img src={image.preview_data_url} alt={image.filename} />
                  <div className="preview-meta">
                    <strong title={image.filename}>{image.filename}</strong>
                    <span>{formatBytes(image.size_bytes)}</span>
                  </div>
                  <button
                    type="button"
                    className="ghost-danger-btn"
                    disabled={deletingFilename === image.filename}
                    onClick={() => void handleDeleteImage(image.filename)}
                  >
                    {deletingFilename === image.filename ? '删除中...' : '删除'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
