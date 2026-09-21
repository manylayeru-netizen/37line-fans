import { useEffect, useState } from 'react';
import { Settings, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@client/src/api';
import { Switch } from '@client/src/components/ui/switch';
import type { ReviewSettings as ReviewSettingsType } from '@shared/api.interface';

interface ReviewSettingsProps {
  // no props needed
}

interface SettingItemConfig {
  key: keyof ReviewSettingsType;
  label: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

const settingItems: SettingItemConfig[] = [
  {
    key: 'diaryEnabled',
    label: '推文投稿审核',
    description: '开启后用户提交的推文需管理员审核',
    iconBg: 'bg-shiba/20',
    iconColor: 'text-shiba',
  },
  {
    key: 'collectionEnabled',
    label: '照片集上传审核',
    description: '开启后用户上传的照片集需管理员审核',
    iconBg: 'bg-tape-pink/40',
    iconColor: 'text-tape-pink',
  },
  {
    key: 'calendarEnabled',
    label: '考古日历上传审核',
    description: '开启后用户上传的日历事件需管理员审核',
    iconBg: 'bg-penguin/20',
    iconColor: 'text-penguin',
  },
  {
    key: 'guestbookEnabled',
    label: '留言板审核',
    description: '开启后用户留言需管理员审核后公开',
    iconBg: 'bg-mint/40',
    iconColor: 'text-mint',
  },
];

const ReviewSettings: React.FC<ReviewSettingsProps> = () => {
  const [settings, setSettings] = useState<ReviewSettingsType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingKey, setSavingKey] =
    useState<keyof ReviewSettingsType | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminApi.getReviewSettings();
        setSettings(data);
      } catch {
        toast.error('加载审核设置失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleToggle = async (key: keyof ReviewSettingsType) => {
    if (!settings) return;
    const newValue = !settings[key];
    let newSettings = { ...settings, [key]: newValue };
    if (key === 'diaryEnabled') {
      newSettings.literatureEnabled = newValue;
    }
    setSettings(newSettings);
    setSavingKey(key);
    try {
      await adminApi.updateReviewSettings({ [key]: newValue });
      if (key === 'diaryEnabled') {
        await adminApi.updateReviewSettings({ literatureEnabled: newValue });
      }
      toast.success(`${settingItems.find((i) => i.key === key)?.label}已${newValue ? '开启' : '关闭'}`);
    } catch {
      setSettings({ ...settings, [key]: !newValue });
      if (key === 'diaryEnabled') {
        setSettings((prev) => ({ ...prev, literatureEnabled: !newValue }));
      }
      toast.error('保存失败，请重试');
    } finally {
      setSavingKey(null);
    }
  };

  const allDisabled =
    settings &&
    !settings.diaryEnabled &&
    !settings.collectionEnabled &&
    !settings.calendarEnabled &&
    !settings.guestbookEnabled;

  return (
    <div className="pb-8">
      {/* Page Header */}
      <div className="relative mb-8">
        <div className="inline-block relative">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl text-ink flex items-center gap-3"
            style={{ fontFamily: 'var(--font-handwriting)' }}
          >
            <Settings size={28} className="text-shiba" />
            审核设置
          </h2>
          <div className="mt-1 h-1 w-full bg-gradient-to-r from-shiba via-tape-pink to-tape-blue rounded-full opacity-60" />
        </div>
        <Sparkles
          size={24}
          className="absolute -top-1 left-[10em] text-tape-pink"
          style={{ transform: 'rotate(15deg)' }}
        />
        <p className="mt-3 text-cocoa/70 text-sm">
          可对各用户投稿模块分别开关审核功能
        </p>
      </div>

      {/* Settings Card */}
      <div className="bg-paper rounded-2xl p-6 shadow-md border-2 border-dashed border-grid relative">
        <div
          className="absolute -top-3 left-8 w-20 h-5 bg-shiba/70 opacity-70 rounded-sm"
          style={{ transform: 'rotate(-2deg)' }}
        />

        {loading ? (
          <div className="py-12 text-center text-cocoa/50">加载中...</div>
        ) : (
          <div className="space-y-3">
            {settingItems.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 bg-cream rounded-xl border border-dashed border-grid hover:border-shiba/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg ${item.iconBg} ${item.iconColor} flex items-center justify-center flex-shrink-0`}
                  >
                    <Settings size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-ink">{item.label}</p>
                    <p className="text-xs text-cocoa/60 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings?.[item.key] ?? false}
                  onCheckedChange={() => handleToggle(item.key)}
                  disabled={savingKey === item.key}
                  className="data-[state=checked]:bg-shiba flex-shrink-0"
                />
              </div>
            ))}
          </div>
        )}

        {/* Warning Note */}
        <div
          className={`mt-6 p-4 rounded-xl border-2 border-dashed transition-colors ${
            allDisabled
              ? 'bg-shiba/10 border-shiba/40'
              : 'bg-mint/10 border-mint/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={20}
              className={allDisabled ? 'text-shiba' : 'text-mint'}
            />
            <div>
              <p
                className={`font-medium ${
                  allDisabled ? 'text-shiba' : 'text-ink'
                }`}
              >
                {allDisabled
                  ? '⚠️ 当前所有审核均已关闭'
                  : '💡 温馨提示'}
              </p>
              <p className="text-sm text-cocoa/70 mt-1">
                关闭审核后，用户提交的内容将直接公开，不会进入待审核列表。请谨慎操作。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewSettings;
