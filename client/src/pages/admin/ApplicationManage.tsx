import { useEffect, useState } from 'react';
import { Clock, UserPlus, FileText, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@client/src/components/ui/badge';
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
  const [status, setStatus] = useState<string>('approved');
  const [loading, setLoading] = useState<boolean>(false);

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

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2
          className="text-3xl text-ink mb-1"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          注册申请历史
        </h2>
        <p className="text-sm text-cocoa/60 flex items-center gap-1">
          <Info size={14} />
          新用户已改为邮箱验证码即时注册，此处仅显示历史申请记录
        </p>
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
    </div>
  );
};

export default ApplicationManage;
