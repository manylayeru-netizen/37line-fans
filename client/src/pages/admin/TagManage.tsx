import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { Label } from '@client/src/components/ui/label';
import { literatureApi } from '@client/src/api';
import type { LiteratureTag } from '@shared/api.interface';

const PRESET_COLORS = [
  '#F4A261', // shiba
  '#7D9BB5', // penguin
  '#A8DADC', // mint
  '#F8C8DC', // tape-pink
  '#B8D4E3', // tape-blue
  '#6B4F3A', // cocoa
  '#E9C46A', // amber
  '#2A9D8F', // teal
  '#E76F51', // coral
  '#8D6E63', // taupe
];

interface TagManageProps {
  // no props needed
}

const TagManage: React.FC<TagManageProps> = () => {
  const [tags, setTags] = useState<LiteratureTag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingTag, setEditingTag] = useState<LiteratureTag | null>(null);
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [targetId, setTargetId] = useState<string>('');

  const loadTags = async () => {
    setLoading(true);
    try {
      const data = await literatureApi.getTags();
      setTags(data);
    } catch {
      toast.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const openCreate = () => {
    setEditingTag(null);
    setName('');
    setSlug('');
    setColor(PRESET_COLORS[0]);
    setFormOpen(true);
  };

  const openEdit = (tag: LiteratureTag) => {
    setEditingTag(tag);
    setName(tag.name);
    setSlug(tag.slug);
    setColor(tag.color);
    setFormOpen(true);
  };

  const autoSlug = (val: string) => {
    if (editingTag) return; // don't auto-fill when editing
    const s = val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '');
    setSlug(s);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入标签名称');
      return;
    }
    if (!slug.trim()) {
      toast.error('请输入标签 slug');
      return;
    }
    setSubmitting(true);
    try {
      if (editingTag) {
        await literatureApi.updateTag(editingTag.id, {
          name: name.trim(),
          slug: slug.trim(),
          color,
        });
        toast.success('标签已更新 ✨');
      } else {
        await literatureApi.createTag({
          name: name.trim(),
          slug: slug.trim(),
          color,
        });
        toast.success('标签已创建 ✨');
      }
      setFormOpen(false);
      loadTags();
    } catch {
      toast.error(editingTag ? '更新失败，请重试' : '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setTargetId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      await literatureApi.deleteTag(targetId);
      toast.success('标签已删除');
      setDeleteOpen(false);
      loadTags();
    } catch {
      toast.error('删除失败，可能有帖子正在使用该标签');
    }
  };

  return (
    <div className="pb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-3xl text-ink mb-1"
            style={{ fontFamily: 'var(--font-handwriting)' }}
          >
            标签管理
          </h2>
           <p className="text-sm text-cocoa/60">管理推文的分类标签</p>
        </div>
        <Button
          onClick={openCreate}
          variant="default"
          className="rounded-full gap-1.5"
        >
          <Plus size={16} /> 新增标签
        </Button>
      </div>

      <div className="bg-paper rounded-2xl shadow-md border-2 border-dashed border-grid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mint/30 text-ink">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-[30%]">
                  标签名
                </th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">颜色</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-cocoa/50">
                    加载中...
                  </td>
                </tr>
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-cocoa/50">
                    <TagIcon size={32} className="mx-auto mb-2 opacity-30" />
                    暂无标签，点击「新增标签」创建第一个
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr
                    key={tag.id}
                    className="border-t border-dashed border-grid hover:bg-cream/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium text-ink">{tag.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cocoa/70 font-mono text-xs">
                      {tag.slug}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: tag.color + '30',
                          color: tag.color,
                        }}
                      >
                        {tag.color}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(tag)}
                          className="p-2 rounded-full text-penguin hover:bg-penguin/10 transition-colors"
                          title="编辑"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteDialog(tag.id)}
                          className="p-2 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              {editingTag ? '编辑标签' : '新增标签'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tag-name">标签名称</Label>
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  autoSlug(e.target.value);
                }}
                placeholder="例如：治愈系"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tag-slug">Slug</Label>
              <Input
                id="tag-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly 标识"
                className="rounded-lg font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>标签颜色</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full shadow-sm transition-transform ${
                      color === c ? 'ring-2 ring-ink ring-offset-2 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded cursor-pointer"
                />
                <span className="text-xs text-cocoa/60 font-mono">{color}</span>
              </div>
            </div>
            <div
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: color + '25', color }}
            >
              <span className="font-medium">预览：{name || '标签名'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-full"
            >
              {submitting ? '保存中...' : editingTag ? '保存修改' : '创建标签'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              确认删除
            </DialogTitle>
            <DialogDescription className="text-cocoa/70">
              删除后无法恢复。如果有帖子正在使用该标签，可能无法删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
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

export default TagManage;
