import { useEffect, useState } from 'react';
import { Check, X, Clock, UserPlus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@client/src/components/ui/dialog';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import { Label } from '@client/src/components/ui/label';
import StickerPagination from '@client/src/components/StickerPagination';
import { adminApi } from '@client/src/api';
import type { RegisterApplication } from '@shared/api.interface';

const STATUS_TABS = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
] as const;

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'bg-warning text-warning-foreground' },
  approved: { label: '已通过', className: 'bg-success text-success-foreground' },
  rejected: { label: '已拒绝', className: 'bg-destructive text-destructive-foreground' },
};

interface ApplicationManageProps {
  // no props needed
}

const ApplicationManage: React.FC<ApplicationManageProps> = () => {
  const [applications, setApplications] = useState<RegisterApplication[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState<boolean>(false);

  const [rejectOpen, setRejectOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getApplications({
        page,
        pageSize,
        status,
      });
      setApplications(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载申请列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [page, status]);

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const handleApprove = async (id: string) => {
    try {
      await adminApi.reviewApplication(id, { status: 'approved' });
      toast.success('申请已通过 ✨');
      loadApplications();
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const openRejectDialog = (id: string) => {
    setTargetId(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }
    try {
      await adminApi.reviewApplication(targetId, {
        status: 'rejected',
        rejectReason: rejectReason.trim(),
      });
      toast.success('已拒绝该申请');
      setRejectOpen(false);
      loadApplications();
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2
          className="text-3xl text-ink mb-1"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          注册申请审核
        </h2>
        <p className="text-sm text-cocoa/60">处理新用户的注册申请</p>
      </div>

      {/* Tabs */}
      <div className="bg-paper rounded-2xl p-5 shadow-md border-2 border-dashed border-grid mb-6">
        <div className="flex gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                status === tab.value
                  ? 'bg-shiba text-white shadow-md'
                  : 'bg-shiba/10 text-cocoa hover:bg-shiba/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-paper rounded-2xl p-12 text-center text-cocoa/50 border-2 border-dashed border-grid">
          加载中...
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-paper rounded-2xl p-12 text-center text-cocoa/50 border-2 border-dashed border-grid">
          <UserPlus size={36} className="mx-auto mb-3 opacity-30" />
          <p>暂无申请</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const statusInfo =
              STATUS_LABELS[app.status] ?? STATUS_LABELS.pending;
            return (
              <div
                key={app.id}
                className="relative bg-paper rounded-2xl p-5 shadow-md border-2 border-dashed border-grid card-wobble"
              >
                {/* Tape */}
                <div
                  className={`absolute -top-3 left-6 w-16 h-5 ${
                    app.status === 'pending'
                      ? 'bg-shiba'
                      : app.status === 'approved'
                      ? 'bg-mint'
                      : 'bg-tape-pink'
                  } opacity-70 rounded-sm`}
                  style={{ transform: 'rotate(-2deg)' }}
                />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-ink">
                        {app.displayName || app.username}
                      </h3>
                      <Badge className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-cocoa/70 mb-3">
                      <span className="font-medium">用户名：</span>
                      {app.username}
                      {app.email && (
                        <>
                          {' · '}
                          <span className="font-medium">邮箱：</span>
                          {app.email}
                        </>
                      )}
                    </p>
                    <div className="bg-cream/40 rounded-lg p-3 border border-dashed border-grid">
                      <div className="flex items-start gap-2">
                        <FileText
                          size={16}
                          className="text-shiba mt-0.5 flex-shrink-0"
                        />
                        <div>
                          <p className="text-xs text-cocoa/60 mb-1">申请理由</p>
                          <p className="text-sm text-cocoa leading-relaxed whitespace-pre-wrap">
                            {app.applicationReason}
                          </p>
                        </div>
                      </div>
                    </div>
                    {app.rejectReason && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded-lg text-sm">
                        <span className="font-medium text-destructive">
                          拒绝原因：
                        </span>
                        <span className="text-cocoa">{app.rejectReason}</span>
                      </div>
                    )}
                    <p className="text-xs text-cocoa/50 mt-3 flex items-center gap-1">
                      <Clock size={12} />
                      申请时间：
                      {new Date(app.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => handleApprove(app.id)}
                        variant="default"
                        className="rounded-full gap-1 bg-success hover:bg-success/90"
                      >
                        <Check size={16} /> 通过
                      </Button>
                      <Button
                        onClick={() => openRejectDialog(app.id)}
                        variant="destructive"
                        className="rounded-full gap-1"
                      >
                        <X size={16} /> 拒绝
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StickerPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              拒绝申请
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-cocoa">请填写拒绝原因</Label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请说明拒绝的原因..."
              rows={4}
              className="w-full rounded-lg border border-grid bg-cream/30 p-3 text-sm text-cocoa focus:border-shiba focus:ring-2 focus:ring-shiba/20 outline-none resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              className="rounded-full"
            >
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicationManage;
