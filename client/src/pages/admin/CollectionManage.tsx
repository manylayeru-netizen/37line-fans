import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Upload,
  Loader2,
  Check,
  ChevronsUpDown,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@client/src/components/ui/command';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { collectionApi } from '@client/src/api';
import { uploadImage } from '@client/src/utils/upload';
import type { CollectionCard } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import ThumbImage from '@client/src/components/ui/thumb-image';
import ImageCropper from './ImageCropper';
import type { CropValues } from './ImageCropper';

const PRESET_CATEGORIES: string[] = [
  '官图',
  '饭拍',
  '扫图',
  '周边',
  '杂志',
  '小卡',
  '手绘',
  '其他',
];

interface CollectionManageProps {
  // no props needed
}

const CollectionManage: React.FC<CollectionManageProps> = () => {
  const [items, setItems] = useState<CollectionCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(12);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingCard, setEditingCard] = useState<CollectionCard | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
    sortOrder: 0,
    rotationDegree: 0,
    thumbX: 0,
    thumbY: 0,
    thumbW: 100,
    thumbH: 100,
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await collectionApi.getCollectionCategories();
      setCategories(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await collectionApi.getCollectionList({
        page,
        pageSize,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载照片集列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchCategories();
    fetchList();
  }, [fetchCategories, fetchList]);

  const handleReview = async (id: string, status: 'published' | 'rejected') => {
    try {
      await collectionApi.reviewCollectionCard(id, status);
      toast.success(status === 'published' ? '已通过审核 ✅' : '已拒绝 ❌');
      fetchList();
    } catch (err: unknown) {
      let msg = '操作失败，请重试';
      if (err && typeof err === 'object') {
        const e = err as {
          response?: { data?: { error?: { message?: string }; message?: string } };
          message?: string;
        };
        const errData = e.response?.data;
        if (errData?.error?.message) {
          msg = errData.error.message;
        } else if (errData?.message) {
          msg = errData.message;
        } else if (e.message) {
          msg = e.message;
        }
      }
      toast.error(msg);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    setEditingCard(null);
    setForm({
      title: '',
      description: '',
      imageUrl: '',
      category: categories[0] || '',
      sortOrder: 0,
      rotationDegree: 0,
      thumbX: 0,
      thumbY: 0,
      thumbW: 100,
      thumbH: 100,
    });
    setDialogOpen(true);
  };

  const openEdit = (card: CollectionCard) => {
    setEditingCard(card);
    setForm({
      title: card.title,
      description: card.description || '',
      imageUrl: card.imageUrl,
      category: card.category,
      sortOrder: card.sortOrder,
      rotationDegree: card.rotationDegree,
      thumbX: card.thumbX ?? 0,
      thumbY: card.thumbY ?? 0,
      thumbW: card.thumbW ?? 100,
      thumbH: card.thumbH ?? 100,
    });
    setDialogOpen(true);
  };

  const handleUploadImage = () => {
    imageUploadRef.current?.click();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploadingImage(true);
    try {
      const url = await uploadImage(file, 'collection');
      setForm((f) => ({
        ...f,
        imageUrl: url,
        thumbX: 10,
        thumbY: 10,
        thumbW: 80,
        thumbH: 80,
      }));
      toast.success('图片上传成功');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '图片上传失败';
      toast.error(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('请填写标题');
      return;
    }
    if (!form.imageUrl.trim()) {
      toast.error('请上传或填写图片 URL');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      category: form.category.trim() || undefined,
      sortOrder: parseInt(String(form.sortOrder), 10) || 0,
      rotationDegree: parseInt(String(form.rotationDegree), 10) || 0,
      thumbX: form.thumbX,
      thumbY: form.thumbY,
      thumbW: form.thumbW,
      thumbH: form.thumbH,
    };

    try {
      if (editingCard) {
        await collectionApi.updateCollectionCard(editingCard.id, payload);
        toast.success('卡片已更新 ✨');
      } else {
        await collectionApi.createCollectionCard(payload);
        toast.success('卡片已创建 🎉');
      }
      setDialogOpen(false);
      fetchList();
      fetchCategories();
    } catch (err: unknown) {
      let msg = '保存失败，请重试';
      if (err && typeof err === 'object') {
        const e = err as {
          response?: { data?: { error?: { message?: string }; message?: string } };
          message?: string;
        };
        const errData = e.response?.data;
        if (errData?.error?.message) {
          msg = `保存失败：${errData.error.message}`;
        } else if (errData?.message) {
          msg = `保存失败：${errData.message}`;
        } else if (e.message) {
          msg = `保存失败：${e.message}`;
        }
      }
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await collectionApi.deleteCollectionCard(deleteId);
      toast.success('已删除');
      setDeleteId(null);
      fetchList();
    } catch (err: unknown) {
      let msg = '删除失败，请重试';
      if (err && typeof err === 'object') {
        const e = err as {
          response?: { data?: { error?: { message?: string }; message?: string } };
          message?: string;
        };
        const errData = e.response?.data;
        if (errData?.error?.message) {
          msg = `删除失败：${errData.error.message}`;
        } else if (errData?.message) {
          msg = `删除失败：${errData.message}`;
        } else if (e.message) {
          msg = `删除失败：${e.message}`;
        }
      }
      toast.error(msg);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2
          className="text-3xl text-ink"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          📸 照片集管理
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-paper rounded-full p-1 border-2 border-dashed border-grid">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'grid'
                  ? 'bg-shiba text-white'
                  : 'text-cocoa hover:bg-cream'
              }`}
              title="卡片视图"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-full transition-colors ${
                viewMode === 'table'
                  ? 'bg-shiba text-white'
                  : 'text-cocoa hover:bg-cream'
              }`}
              title="表格视图"
            >
              <List size={16} />
            </button>
          </div>
          <Button
            onClick={openCreate}
            className="bg-shiba text-white rounded-full px-6 h-10 shadow-md hover:shadow-lg transition-shadow"
          >
            <Plus size={18} />
            新增照片
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-paper rounded-2xl p-5 shadow-sm border-2 border-dashed border-grid mb-6 relative">
        <div
          className="absolute -top-3 left-6 w-16 h-5 bg-tape-pink opacity-70 rounded-sm"
          style={{ transform: 'rotate(-3deg)' }}
        />
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-sm text-cocoa/70 font-medium">状态：</span>
          {(['all', 'pending', 'published', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-penguin text-white shadow-md'
                  : 'bg-cream text-cocoa hover:bg-penguin/20'
              }`}
            >
              {s === 'all' ? '全部' : s === 'pending' ? '待审核' : s === 'published' ? '已发布' : '已拒绝'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-cocoa/70 font-medium">分类：</span>
          <button
            onClick={() => {
              setCategoryFilter('all');
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              categoryFilter === 'all'
                ? 'bg-shiba text-white shadow-md'
                : 'bg-cream text-cocoa hover:bg-shiba/20'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-shiba text-white shadow-md'
                  : 'bg-cream text-cocoa hover:bg-shiba/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="bg-paper rounded-2xl shadow-sm border-2 border-dashed border-grid p-6 relative">
          <div
            className="absolute -top-3 right-6 w-16 h-5 bg-tape-blue opacity-70 rounded-sm"
            style={{ transform: 'rotate(3deg)' }}
          />
          {loading && (
            <div className="text-center py-12 text-cocoa/50">加载中...</div>
          )}
          {!loading && items.length === 0 && (
            <div className="text-center py-12 text-cocoa/50">
              还没有卡片~
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-5">
              {items.map((card) => (
                <div
                  key={card.id}
                  className="group relative"
                  style={{
                    transform: `rotate(${card.rotationDegree || 0}deg)`,
                  }}
                >
                  {/* Polaroid frame */}
                  <div className="bg-white p-2 pb-10 rounded shadow-md card-wobble relative">
                    <div className="aspect-square bg-grid/30 rounded overflow-hidden">
                      <ThumbImage card={card} className="w-full h-full" />
                    </div>
                    <div className="absolute bottom-1 left-0 right-0 px-2 text-center">
                      <p
                        className="text-xs text-ink truncate font-handwriting"
                        style={{ fontFamily: 'var(--font-handwriting)' }}
                      >
                        {card.title}
                      </p>
                    </div>

                    {/* Hover actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      <button
                        onClick={() => openEdit(card)}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-penguin/20 text-penguin"
                        title="编辑"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(card.id)}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-destructive/20 text-destructive"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Category tag */}
                    <Badge
                      className="absolute -top-2 -left-2 bg-tape-pink text-ink rounded-full border-0 shadow-sm text-[10px]"
                      style={{ fontFamily: 'var(--font-handwriting)' }}
                    >
                      {card.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-dashed border-grid">
              <span className="text-sm text-cocoa/70">
                共 {total} 张，第 {page} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page >= totalPages}
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Table view */
        <div className="bg-paper rounded-2xl shadow-sm border-2 border-dashed border-grid overflow-hidden relative">
          <div
            className="absolute -top-3 right-6 w-16 h-5 bg-tape-blue opacity-70 rounded-sm"
            style={{ transform: 'rotate(3deg)' }}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream border-b-2 border-dashed border-grid">
                  <th className="text-left px-4 py-3 font-medium text-ink w-16">
                    预览
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-ink">
                    标题
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-ink w-24">
                    分类
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-ink w-20">
                    状态
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-ink w-16">
                    排序
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-ink w-44">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-cocoa/50"
                      >
                        加载中...
                      </td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-cocoa/50"
                      >
                        还没有卡片~
                      </td>
                    </tr>
                )}
                {!loading &&
                  items.map((card) => (
                    <tr
                      key={card.id}
                      className="border-b border-dashed border-grid/50 hover:bg-cream/50 transition-colors"
                    >
                      <td className="px-4 py-2">
                        <div className="w-10 h-10 rounded overflow-hidden bg-grid/30">
                          <ThumbImage card={card} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink font-medium">
                        {card.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`rounded-full border-0 text-[10px] ${
                            card.status === 'published'
                              ? 'bg-mint text-ink'
                              : card.status === 'pending'
                                ? 'bg-tape-pink text-ink'
                                : 'bg-destructive/20 text-destructive'
                          }`}
                          style={{ fontFamily: 'var(--font-handwriting)' }}
                        >
                          {card.status === 'published'
                            ? '已发布'
                            : card.status === 'pending'
                              ? '待审核'
                              : '已拒绝'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-cocoa/70">
                        {card.sortOrder}
                      </td>
                      <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {card.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleReview(card.id, 'published')}
                                  className="p-2 rounded-full hover:bg-mint/40 text-emerald-600 transition-colors"
                                  title="通过审核"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => handleReview(card.id, 'rejected')}
                                  className="p-2 rounded-full hover:bg-destructive/20 text-destructive transition-colors"
                                  title="拒绝"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openEdit(card)}
                              className="p-2 rounded-full hover:bg-penguin/20 text-penguin transition-colors"
                              title="编辑"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(card.id)}
                              className="p-2 rounded-full hover:bg-destructive/20 text-destructive transition-colors"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t-2 border-dashed border-grid">
              <span className="text-sm text-cocoa/70">
                共 {total} 张，第 {page} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page >= totalPages}
                  className="h-8 w-8 rounded-full"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-paper border-2 border-dashed border-grid max-w-lg">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              {editingCard ? '✏️ 编辑照片' : '📸 新增照片'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                标题 <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="卡片标题..."
                className="bg-cream/50"
              />
            </div>

              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5">
                  图片 URL <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    placeholder="https://..."
                    className="bg-cream/50 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUploadImage}
                    disabled={uploadingImage}
                    className="shrink-0"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        上传中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1" />
                        上传
                      </>
                    )}
                  </Button>
                </div>
                <input
                  type="file"
                  ref={imageUploadRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
              {form.imageUrl && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-cocoa mb-2">
                    缩略图裁剪
                    <span className="text-xs text-cocoa/60 ml-2">
                      拖动选框移动位置，拖角点缩放（保持 1:1）
                    </span>
                  </label>
                  <div className="flex justify-center">
                    <ImageCropper
                      imageUrl={form.imageUrl}
                      value={{
                        thumbX: form.thumbX,
                        thumbY: form.thumbY,
                        thumbW: form.thumbW,
                        thumbH: form.thumbH,
                      }}
                      onChange={(v: CropValues) =>
                        setForm((f) => ({
                          ...f,
                          thumbX: v.thumbX,
                          thumbY: v.thumbY,
                          thumbW: v.thumbW,
                          thumbH: v.thumbH,
                        }))
                      }
                      maxWidth={360}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                分类
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-input bg-cream/50 px-3 py-2 text-sm text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-shiba/40 disabled:cursor-not-allowed disabled:opacity-50 h-9"
                  >
                    <span className={form.category ? 'text-ink' : 'text-cocoa/50'}>
                      {form.category || '选择或输入分类...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0 bg-paper border-2 border-dashed border-grid">
                  <Command className="bg-transparent">
                    <CommandInput
                      placeholder="搜索分类..."
                      className="h-9"
                      value={form.category}
                      onValueChange={(val: string) =>
                        setForm((f) => ({ ...f, category: val }))
                      }
                    />
                    <CommandList>
                      <CommandEmpty>
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-sm text-cocoa hover:bg-cream/50 rounded-sm"
                          onClick={() => {
                            // 已通过 onValueChange 实时同步，无需额外操作
                          }}
                        >
                          <Plus className="inline w-3 h-3 mr-1" />
                          创建 &quot;{form.category || '新分类'}&quot;
                        </button>
                      </CommandEmpty>
                      <CommandGroup heading="预设分类">
                        {PRESET_CATEGORIES.map((cat) => (
                          <CommandItem
                            key={cat}
                            value={cat}
                            onSelect={() => {
                              setForm((f) => ({ ...f, category: cat }));
                            }}
                            className="text-sm"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                form.category === cat
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              }`}
                            />
                            {cat}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      {categories.filter(
                        (cat) => !PRESET_CATEGORIES.includes(cat),
                      ).length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="已有分类">
                            {categories
                              .filter(
                                (cat) => !PRESET_CATEGORIES.includes(cat),
                              )
                              .map((cat) => (
                                <CommandItem
                                  key={cat}
                                  value={cat}
                                  onSelect={() => {
                                    setForm((f) => ({
                                      ...f,
                                      category: cat,
                                    }));
                                  }}
                                  className="text-sm"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      form.category === cat
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    }`}
                                  />
                                  {cat}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                描述
              </label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="卡片描述..."
                rows={3}
                className="bg-cream/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5">
                  排序
                </label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value) || 0,
                    }))
                  }
                  className="bg-cream/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5">
                  旋转角度 (°)
                </label>
                <Input
                  type="number"
                  value={form.rotationDegree}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      rotationDegree: Number(e.target.value) || 0,
                    }))
                  }
                  className="bg-cream/50"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              className="bg-shiba text-white rounded-full"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="bg-paper border-2 border-dashed border-grid max-w-sm">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              🗑️ 确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-cocoa/80">
            确定要删除这张卡片吗？此操作不可撤销哦~
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="rounded-full"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionManage;
