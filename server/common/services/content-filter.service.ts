import { Injectable } from '@nestjs/common';

const SENSITIVE_WORDS = [
  '敏感词',
  '违禁',
  '广告',
  '推销',
  '赌博',
  '色情',
  '暴力',
  '诈骗',
  '刷单',
  '兼职日赚',
];

@Injectable()
export class ContentFilterService {
  filter(text: string): { clean: boolean; foundWords: string[] } {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const word of SENSITIVE_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        found.push(word);
      }
    }

    return {
      clean: found.length === 0,
      foundWords: found,
    };
  }

  mask(text: string): string {
    let result = text;
    for (const word of SENSITIVE_WORDS) {
      const regex = new RegExp(word, 'gi');
      result = result.replace(regex, '*'.repeat(word.length));
    }
    return result;
  }
}
