import React from 'react';
import { ExternalLink } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

export const extractUrls = (text: string): string[] =>
  text.match(/https?:\/\/[^\s]+/g) || [];

// 根据链接来源返回按钮文字
export const getSourcePlatformLabel = (url: string): string => {
  const h = url.toLowerCase();
  if (h.includes('weibo.com') || h.includes('weibo.cn')) return '微博原文 ↗';
  if (h.includes('lofter.com')) return 'Lofter 原文 ↗';
  if (h.includes('ao3.org')) return 'AO3 原文 ↗';
  if (h.includes('twitter.com') || h.includes('x.com')) return 'X 原文 ↗';
  return '查看原文 ↗';
};

// 统一的橙色描边胶囊按钮样式
export const SOURCE_BUTTON_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-shiba/50 bg-shiba/5 px-3 py-1 text-xs text-shiba transition-colors hover:bg-shiba hover:text-white';

interface RenderOptions {
  textClassName?: string;
}

// 把文本里的普通文字保留、每条 http/https 链接外显为来源胶囊按钮；换行保留
export const renderContentWithButtons = (
  text: string,
  opts: RenderOptions = {},
): React.ReactNode => {
  const textClassName = opts.textClassName ?? 'leading-relaxed text-cocoa/80';
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  lines.forEach((line: string, li: number) => {
    const urls = line.match(/https?:\/\/[^\s]+/g) || [];
    const plain = line.replace(/https?:\/\/[^\s]+/g, '').trim();
    if (plain) {
      out.push(
        <div key={`t-${li}`} className={textClassName}>
          {plain}
        </div>,
      );
    }
    urls.forEach((u: string, ui: number) => {
      out.push(
        <UniversalLink
          key={`b-${li}-${ui}`}
          to={u}
          target="_blank"
          rel="noopener noreferrer"
          className={`${SOURCE_BUTTON_CLASS} mt-1 mr-2`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {getSourcePlatformLabel(u)}
          <ExternalLink size={12} />
        </UniversalLink>,
      );
    });
    if (!plain && urls.length === 0) {
      out.push(<div key={`g-${li}`} className="h-2" />);
    }
  });
  return <>{out}</>;
};
