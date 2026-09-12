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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { collectionApi } from '@client/src/api';
import { uploadImage } from '@client/src/utils/upload';
import type { CollectionCard } from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';

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
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载照片集列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, categoryFilter]);

  useEffect(() => {
    fetchCategories();
    fetchList();
  }, [fetchCategories, fetchList]);

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
      setForm((f) => ({ ...f, imageUrl: url }));
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
      toast.error('请填写图片 URL');
      return;
    }
    try {
      if (editingCard) {
        await collectionApi.updateCollectionCard(editingCard.id, form);
        toast.success('卡片已更新 ✨');
      } else {
        await collectionApi.createCollectionCard(form);
        toast.success('卡片已创建 🎉');
      }
      setDialogOpen(false);
      fetchList();
      fetchCategories();
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await collectionApi.deleteCollectionCard(deleteId);
      toast.success('已删除');
      setDeleteId(null);
      fetchList();
    } catch {
      toast.error('删除失败');
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
                      <Image
                        src={card.imageUrl}
                        alt={card.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23E8DDD0" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%236B4F3A" font-size="10">No Image</text></svg>';
                        }}
                      />
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
                  <th className="text-left px-4 py-3 font-medium text-ink w-16">
                    排序
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-ink w-36">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-cocoa/50"
                    >
                      加载中...
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
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
                          <Image
                            src={card.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink font-medium">
                        {card.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className="bg-tape-pink text-ink rounded-full border-0"
                          style={{ fontFamily: 'var(--font-handwriting)' }}
                        >
                          {card.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-cocoa/70">
                        {card.sortOrder}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
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
                <div className="mt-2 w-24 h-24 rounded overflow-hidden bg-grid/30 border-2 border-dashed border-grid">
                  <Image
                    src={form.imageUrl}
                    alt="预览"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-cocoa mb-1.5">
                分类
              </label>
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="输入分类名称，如：小卡/周边/杂志..."
                className="bg-cream/50"
                list="category-datalist"
              />
              <datalist id="category-datalist">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
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
