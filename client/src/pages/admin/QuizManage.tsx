import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, HelpCircle, ExternalLink } from 'lucide-react';
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
import {
  quizApi,
  type QuizQuestionFull,
  type QuestionInput,
} from '@client/src/api';

interface FormState {
  stem: string;
  options: string[];
  answerIndex: number;
  category: string;
  difficulty: string;
  sourceUrl: string;
  sourceNote: string;
  status: string;
}

const EMPTY_FORM: FormState = {
  stem: '',
  options: ['', '', '', ''],
  answerIndex: 0,
  category: 'basic',
  difficulty: 'medium',
  sourceUrl: '',
  sourceNote: '',
  status: 'active',
};

const CATEGORY_LABEL: Record<string, string> = {
  basic: '基础',
  sugar: '糖点',
};
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  medium: '普通',
  hard: '困难',
};
const STATUS_LABEL: Record<string, string> = {
  active: '启用',
  pending: '待审',
  disabled: '停用',
};
const DIFFICULTY_STYLE: Record<string, string> = {
  easy: 'bg-teal/20 text-teal',
  medium: 'bg-amber/20 text-amber',
  hard: 'bg-coral/20 text-coral',
};

const QuizManage: React.FC = () => {
  const [items, setItems] = useState<QuizQuestionFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [keyword, setKeyword] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [targetId, setTargetId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await quizApi.adminListQuestions({
        page,
        pageSize: 20,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        keyword: keyword || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(Math.max(1, Math.ceil(data.total / 20)));
    } catch {
      toast.error('加载题库失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, categoryFilter, keyword]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (q: QuizQuestionFull) => {
    setEditingId(q.id);
    setForm({
      stem: q.stem,
      options:
        q.options && q.options.length === 4
          ? q.options
          : ['', '', '', ''],
      answerIndex: q.correctOption,
      category: q.category,
      difficulty: q.difficulty,
      sourceUrl: q.sourceUrl || '',
      sourceNote: q.sourceNote || '',
      status: q.status,
    });
    setFormOpen(true);
  };

  const setOption = (i: number, val: string) => {
    setForm((f) => {
      const options = [...f.options];
      options[i] = val;
      return { ...f, options };
    });
  };

  const handleSubmit = async () => {
    if (!form.stem.trim()) {
      toast.error('请填写题干');
      return;
    }
    if (form.options.some((o) => !o.trim())) {
      toast.error('请填写全部 4 个选项');
      return;
    }
    if (new Set(form.options.map((o) => o.trim())).size !== 4) {
      toast.error('选项不能重复');
      return;
    }
    setSubmitting(true);
    const payload: QuestionInput & { status?: string } = {
      stem: form.stem.trim(),
      options: form.options.map((o) => o.trim()),
      answerIndex: form.answerIndex,
      category: form.category,
      difficulty: form.difficulty,
      sourceUrl: form.sourceUrl.trim(),
      sourceNote: form.sourceNote.trim(),
    };
    try {
      if (editingId) {
        await quizApi.adminUpdateQuestion(editingId, { ...payload, status: form.status });
        toast.success('题目已更新 ✨');
      } else {
        await quizApi.adminCreateQuestion(payload);
        toast.success('题目已新增 ✨');
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const quickReview = async (q: QuizQuestionFull, status: 'active' | 'disabled') => {
    try {
      await quizApi.adminReviewQuestion(q.id, status);
      toast.success(status === 'active' ? '已通过' : '已停用');
      load();
    } catch {
      toast.error('操作失败');
    }
  };

  const openDelete = (id: string) => {
    setTargetId(id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      await quizApi.adminDeleteQuestion(targetId);
      toast.success('题目已删除');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('删除失败');
    }
  };

  const selectClass =
    'rounded-lg border-2 border-cocoa/10 bg-cream/40 px-3 py-2 text-sm text-cocoa focus:border-shiba focus:outline-none';

  return (
    <div className="pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-3xl text-ink mb-1"
            style={{ fontFamily: 'var(--font-handwriting)' }}
          >
            题库管理
          </h2>
          <p className="text-sm text-cocoa/60">共 {total} 题 · 可新增 / 编辑 / 停用题目</p>
        </div>
        <Button onClick={openCreate} variant="default" className="rounded-full gap-1.5">
          <Plus size={16} /> 新增题目
        </Button>
      </div>

      {/* 筛选栏 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={keyword}
          onChange={(e) => {
            setPage(1);
            setKeyword(e.target.value);
          }}
          placeholder="搜索题干关键词"
          className="rounded-full w-56"
        />
        <select
          className={selectClass}
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
        >
          <option value="">全部分类</option>
          <option value="basic">基础</option>
          <option value="sugar">糖点</option>
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="pending">待审</option>
          <option value="disabled">停用</option>
        </select>
      </div>

      <div className="bg-paper rounded-2xl shadow-md border-2 border-dashed border-grid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-mint/30 text-ink">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-[44%]">题干</th>
                <th className="px-4 py-3 text-left font-medium">分类</th>
                <th className="px-4 py-3 text-left font-medium">难度</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cocoa/50">
                    加载中...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-cocoa/50">
                    <HelpCircle size={32} className="mx-auto mb-2 opacity-30" />
                    没有符合条件的题目
                  </td>
                </tr>
              ) : (
                items.map((q) => (
                  <tr
                    key={q.id}
                    className="border-t border-dashed border-grid hover:bg-cream/30 align-top"
                  >
                    <td className="px-4 py-3">
                      <p className="text-ink leading-snug">{q.stem}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-cocoa/50">
                        {q.sourceUrl ? (
                          <a
                            href={q.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 hover:text-shiba"
                          >
                            <ExternalLink size={11} /> 出处
                          </a>
                        ) : null}
                        {q.submitterName ? <span>投稿：{q.submitterName}</span> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-penguin/15 text-penguin">
                        {CATEGORY_LABEL[q.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${DIFFICULTY_STYLE[q.difficulty]}`}
                      >
                        {DIFFICULTY_LABEL[q.difficulty]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-cocoa/70">
                      {STATUS_LABEL[q.status]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {q.status === 'pending' ? (
                          <button
                            onClick={() => quickReview(q, 'active')}
                            className="px-2 py-1 rounded-full text-xs text-teal hover:bg-teal/10"
                            title="通过"
                          >
                            通过
                          </button>
                        ) : null}
                        <button
                          onClick={() => openEdit(q)}
                          className="p-2 rounded-full text-penguin hover:bg-penguin/10"
                          title="编辑"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => openDelete(q.id)}
                          className="p-2 rounded-full text-destructive hover:bg-destructive/10"
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

      {/* 分页 */}
      <div className="mt-4 flex items-center justify-center gap-3 text-sm">
        <Button
          variant="outline"
          className="rounded-full"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          上一页
        </Button>
        <span className="text-cocoa/70">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </Button>
      </div>

      {/* 新增 / 编辑 Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg bg-paper border-2 border-dashed border-grid rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              {editingId ? '编辑题目' : '新增题目'}
            </DialogTitle>
            <DialogDescription className="text-cocoa/60 text-xs">
              点击选项左侧圆点设置正确答案
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>题干</Label>
              <textarea
                value={form.stem}
                onChange={(e) => setForm((f) => ({ ...f, stem: e.target.value }))}
                rows={3}
                placeholder="输入题目"
                className="w-full rounded-lg border-2 border-cocoa/10 bg-cream/40 px-3 py-2 text-sm text-cocoa focus:border-shiba focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label>选项（圆点标记正确答案）</Label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={form.answerIndex === i}
                    onChange={() => setForm((f) => ({ ...f, answerIndex: i }))}
                    className="accent-shiba w-4 h-4"
                  />
                  <Input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={`选项 ${String.fromCharCode(65 + i)}`}
                    className="rounded-lg"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>分类</Label>
                <select
                  className={`w-full ${selectClass}`}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="basic">基础</option>
                  <option value="sugar">糖点</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>难度</Label>
                <select
                  className={`w-full ${selectClass}`}
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                >
                  <option value="easy">简单</option>
                  <option value="medium">普通</option>
                  <option value="hard">困难</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>出处链接（可选）</Label>
              <Input
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                placeholder="https://"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label>出处备注（可选）</Label>
              <Input
                value={form.sourceNote}
                onChange={(e) => setForm((f) => ({ ...f, sourceNote: e.target.value }))}
                placeholder="例如：官方资料 / 采访"
                className="rounded-lg"
              />
            </div>

            {editingId ? (
              <div className="space-y-1.5">
                <Label>状态</Label>
                <select
                  className={`w-full ${selectClass}`}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">启用</option>
                  <option value="pending">待审</option>
                  <option value="disabled">停用</option>
                </select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} className="rounded-full">
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="rounded-full">
              {submitting ? '保存中...' : editingId ? '保存修改' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
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
              删除后无法恢复，确定删除这道题吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-full">
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="rounded-full">
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizManage;
