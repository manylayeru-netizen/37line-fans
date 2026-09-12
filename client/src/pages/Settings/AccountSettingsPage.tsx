import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User, Upload, Loader2, Lock, Camera } from 'lucide-react';
import { Input } from '@client/src/components/ui/input';
import { Button } from '@client/src/components/ui/button';
import { useAuthStore } from '@client/src/store/auth.store';
import { apiPost, apiPatch } from '@client/src/utils/api-client';
import type {
  ChangePasswordRequest,
  SiteUser,
  ApiResponse,
} from '@shared/api.interface';
import { Image } from '@client/src/components/ui/image';
import { uploadImage } from '@client/src/utils/upload';

const AccountSettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 修改密码表单状态
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 头像上传状态
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // 校验
    if (!oldPassword.trim()) {
      toast.error('请输入旧密码');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('新密码长度至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的新密码不一致');
      return;
    }

    setChangingPassword(true);
    try {
      const body: Omit<ChangePasswordRequest, 'confirmPassword'> = {
        oldPassword,
        newPassword,
      };
      await apiPost<ApiResponse<null>>('/api/auth/change-password', body);
      toast.success('密码修改成功，请重新登录');
      logout();
      navigate('/login');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '密码修改失败';
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置 input value，允许重复选择同一文件
    e.target.value = '';

    setUploadingAvatar(true);
    try {
      const avatarUrl = await uploadImage(file, 'avatar');

      const res = await apiPatch<ApiResponse<SiteUser>>('/api/auth/avatar', {
        avatarUrl,
      });
      setUser(res.data);
      toast.success('头像更新成功');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '头像上传失败';
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="font-handwriting text-4xl text-ink mb-8 text-center">
        账户设置
      </h1>

      {/* 更换头像区块 */}
      <section className="bg-paper rounded-xl shadow-sm border border-grid p-6 mb-6 relative">
        <div className="tape-strip" />
        <h2 className="font-handwriting text-2xl text-ink mb-6 flex items-center gap-2">
          <Camera size={20} className="text-shiba" />
          更换头像
        </h2>

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt="头像"
                className="w-20 h-20 rounded-full object-cover border-2 border-grid shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-shiba flex items-center justify-center text-white shadow-sm">
                <User size={32} />
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            variant="default"
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="rounded-full bg-shiba hover:bg-shiba/90 text-white"
          >
            {uploadingAvatar ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload size={16} />
                上传新头像
              </>
            )}
          </Button>

          <p className="text-sm text-cocoa/60">
            支持 JPG、PNG 等图片格式
          </p>
        </div>
      </section>

      {/* 修改密码区块 */}
      <section className="bg-paper rounded-xl shadow-sm border border-grid p-6 relative">
        <div className="tape-strip tape-strip-blue" />
        <h2 className="font-handwriting text-2xl text-ink mb-6 flex items-center gap-2">
          <Lock size={20} className="text-shiba" />
          修改密码
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-cocoa mb-1.5">
              旧密码
            </label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setOldPassword(e.target.value)
              }
              placeholder="请输入当前密码"
              className="rounded-lg bg-cream/30 border-grid focus:border-shiba"
            />
          </div>

          <div>
            <label className="block text-sm text-cocoa mb-1.5">
              新密码
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewPassword(e.target.value)
              }
              placeholder="至少 6 位"
              className="rounded-lg bg-cream/30 border-grid focus:border-shiba"
            />
          </div>

          <div>
            <label className="block text-sm text-cocoa mb-1.5">
              确认新密码
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="再次输入新密码"
              className="rounded-lg bg-cream/30 border-grid focus:border-shiba"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="default"
              disabled={changingPassword}
              className="w-full rounded-full bg-shiba hover:bg-shiba/90 text-white"
            >
              {changingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  修改中...
                </>
              ) : (
                '确认修改'
              )}
            </Button>
          </div>

          <p className="text-xs text-cocoa/50 text-center">
            修改成功后需要重新登录
          </p>
        </form>
      </section>
    </div>
  );
};

export default AccountSettingsPage;
