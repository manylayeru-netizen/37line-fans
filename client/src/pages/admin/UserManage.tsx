import { useEffect, useState } from 'react';
import { Search, Shield, UserCheck, UserX, Key, Users } from 'lucide-react';
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
import { Badge } from '@client/src/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import StickerPagination from '@client/src/components/StickerPagination';
import { adminApi } from '@client/src/api';
import type { SiteUser } from '@shared/api.interface';

const ROLE_TABS = [
  { value: '', label: '全部' },
  { value: 'admin', label: '管理员' },
  { value: 'user', label: '普通用户' },
] as const;

interface UserManageProps {
  // no props needed
}

const UserManage: React.FC<UserManageProps> = () => {
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const [roleDialogOpen, setRoleDialogOpen] = useState<boolean>(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState<boolean>(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState<boolean>(false);
  const [targetUser, setTargetUser] = useState<SiteUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers({
        page,
        pageSize,
        role: roleFilter || undefined,
        keyword: keyword || undefined,
      });
      setUsers(data.items);
      setTotal(data.total);
    } catch {
      toast.error('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleRoleFilter = (val: string) => {
    setRoleFilter(val);
    setPage(1);
  };

  const openRoleDialog = (user: SiteUser) => {
    setTargetUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleRoleChange = async () => {
    if (!targetUser || !newRole) return;
    setActionLoading(true);
    try {
      await adminApi.updateUserRole(
        targetUser.id,
        newRole as SiteUser['role'],
      );
      toast.success('角色已更新 ✨');
      setRoleDialogOpen(false);
      loadUsers();
    } catch {
      toast.error('更新失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const openStatusDialog = (user: SiteUser) => {
    setTargetUser(user);
    setStatusDialogOpen(true);
  };

  const handleStatusToggle = async () => {
    if (!targetUser) return;
    const newStatus: SiteUser['status'] =
      targetUser.status === 'active' ? 'disabled' : 'active';
    setActionLoading(true);
    try {
      await adminApi.updateUserStatus(targetUser.id, newStatus);
      toast.success(
        newStatus === 'active' ? '用户已启用' : '用户已停用',
      );
      setStatusDialogOpen(false);
      loadUsers();
    } catch {
      toast.error('操作失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const openPasswordDialog = async (user: SiteUser) => {
    setTargetUser(user);
    setNewPassword('');
    setPasswordDialogOpen(true);
    setActionLoading(true);
    try {
      const result = await adminApi.resetUserPassword(user.id);
      setNewPassword(result.newPassword);
    } catch {
      toast.error('重置密码失败');
      setPasswordDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success('新密码已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <div className="pb-8">
      <div className="mb-6">
        <h2
          className="text-3xl text-ink mb-1"
          style={{ fontFamily: 'var(--font-handwriting)' }}
        >
          用户管理
        </h2>
        <p className="text-sm text-cocoa/60">管理注册用户、角色与账号状态</p>
      </div>

      {/* Filters */}
      <div className="bg-paper rounded-2xl p-5 shadow-md border-2 border-dashed border-grid mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleRoleFilter(tab.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  roleFilter === tab.value
                    ? 'bg-penguin text-white shadow-md'
                    : 'bg-penguin/10 text-cocoa hover:bg-penguin/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cocoa/40"
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索用户名/昵称..."
                className="w-64 pl-9 rounded-full bg-cream/50 border-grid focus:border-shiba"
              />
            </div>
            <Button type="submit" variant="default" className="rounded-full">
              搜索
            </Button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-paper rounded-2xl shadow-md border-2 border-dashed border-grid overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-penguin/10 text-ink">
              <tr>
                <th className="px-4 py-3 text-left font-medium">用户名</th>
                <th className="px-4 py-3 text-left font-medium">昵称</th>
                <th className="px-4 py-3 text-left font-medium">角色</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">注册时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cocoa/50">
                    加载中...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-cocoa/50">
                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                    暂无用户
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-dashed border-grid hover:bg-cream/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {user.username}
                    </td>
                    <td className="px-4 py-3 text-cocoa/80">
                      {user.displayName || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          user.role === 'admin'
                            ? 'bg-shiba text-white'
                            : 'bg-mint/40 text-ink'
                        }
                      >
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          user.status === 'active'
                            ? 'bg-success text-success-foreground'
                            : 'bg-destructive text-destructive-foreground'
                        }
                      >
                        {user.status === 'active' ? '启用' : '停用'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-cocoa/70 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openRoleDialog(user)}
                          className="p-2 rounded-full text-shiba hover:bg-shiba/10 transition-colors"
                          title="修改角色"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => openStatusDialog(user)}
                          className={`p-2 rounded-full transition-colors ${
                            user.status === 'active'
                              ? 'text-destructive hover:bg-destructive/10'
                              : 'text-success hover:bg-success/10'
                          }`}
                          title={
                            user.status === 'active' ? '停用账号' : '启用账号'
                          }
                        >
                          {user.status === 'active' ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => openPasswordDialog(user)}
                          className="p-2 rounded-full text-penguin hover:bg-penguin/10 transition-colors"
                          title="重置密码"
                        >
                          <Key size={16} />
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

      <StickerPagination
        page={page}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              修改角色
            </DialogTitle>
            <DialogDescription className="text-cocoa/70">
              {targetUser?.username} 的角色将被修改为：
            </DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="w-full rounded-lg">
              <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">管理员</SelectItem>
              <SelectItem value="user">普通用户</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={actionLoading || newRole === targetUser?.role}
              className="rounded-full"
            >
              {actionLoading ? '保存中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              {targetUser?.status === 'active' ? '停用账号' : '启用账号'}
            </DialogTitle>
            <DialogDescription className="text-cocoa/70">
              {targetUser?.status === 'active'
                ? `确定要停用用户「${targetUser?.username}」吗？停用后该用户将无法登录。`
                : `确定要启用用户「${targetUser?.username}」吗？`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              variant={targetUser?.status === 'active' ? 'destructive' : 'default'}
              onClick={handleStatusToggle}
              disabled={actionLoading}
              className="rounded-full"
            >
              {actionLoading
                ? '处理中...'
                : targetUser?.status === 'active'
                ? '确认停用'
                : '确认启用'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md bg-paper border-2 border-dashed border-grid rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className="text-xl text-ink"
              style={{ fontFamily: 'var(--font-handwriting)' }}
            >
              重置密码
            </DialogTitle>
            <DialogDescription className="text-cocoa/70">
              {targetUser?.username} 的新密码已生成，请复制后发送给用户：
            </DialogDescription>
          </DialogHeader>
          {actionLoading ? (
            <div className="py-8 text-center text-cocoa/50">生成中...</div>
          ) : (
            <div className="bg-cream/50 rounded-lg p-4 border-2 border-dashed border-grid">
              <p className="text-xs text-cocoa/60 mb-2">新密码</p>
              <p
                className="text-2xl font-mono text-ink break-all"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {newPassword}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              className="rounded-full"
            >
              关闭
            </Button>
            <Button
              onClick={copyPassword}
              disabled={actionLoading || !newPassword}
              className="rounded-full"
            >
              复制密码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManage;
