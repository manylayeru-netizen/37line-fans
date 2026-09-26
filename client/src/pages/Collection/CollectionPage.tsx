import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, User, ImagePlus, X, Loader2 } from 'lucide-react';
import { uploadImage } from '@client/src/utils/upload';
import type { CollectionCard, PagedResponse } from '@shared/api.interface';
import {
  createCollectionCard,
  getCollectionCategories,
  getCollectionList,
} from '@client/src/api/collection';
import { useAuthStore } from '@client/src/store/auth.store';
import PageHeader from '@client/src/components/PageHeader';
import LoadingSpinner from '@client/src/components/LoadingSpinner';
import ErrorState from '@client/src/components/ErrorState';
import StickerPagination from '@client/src/components/StickerPagination';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@client/src/components/ui/dialog';
import { Image } from '@client/src/components/ui/image';
import ThumbImage from '@client/src/components/ui/thumb-image';
import ImageCropper from '@client/src/components/ui/image-cropper';
import type { CropValues } from '@client/src/components/ui/image-cropper';
import { renderContentWithButtons } from '@client/src/utils/content-links';

const CollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [data, setData] = useState<PagedResponse<CollectionCard> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<CollectionCard | null>(null);
  const pageSize = 9;

  // 上传表单状态
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploadCrop, setUploadCrop] = useState<CropValues>({
    thumbX: 25,
    thumbY: 25,
    thumbW: 50,
    thumbH: 50,
  });
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCollectionCategories()
      .then((res) => {
        if (!cancelled) setCategories(['全部', ...res]);
      })
      .catch(() => {
        if (!cancelled) setCategories(['全部']);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadList = (): void => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params: { page: number; pageSize: number; category?: string } = {
      page,
      pageSize,
    };
    if (activeCategory !== '全部') params.category = activeCategory;
    getCollectionList(params)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message || '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  };

  useEffect(() => {
    loadList();
    return () => {
      // clean-up handled via loadList's closure; we only track page/category
    };
  }, [page, activeCategory]);

  const stickerColors = [
    'bg-shiba/20 text-shiba',
    'bg-penguin/20 text-penguin',
    'bg-mint/20 text-mint-foreground',
    'bg-tape-pink/30 text-cocoa',
    'bg-tape-blue/30 text-cocoa',
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev): void => {
      setUploadPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearUploadForm = (): void => {
    setUploadFile(null);
    setUploadPreview('');
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('');
    setUploadCrop({ thumbX: 25, thumbY: 25, thumbW: 50, thumbH: 50 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (): Promise<void> => {
    if (!uploadFile) {
      toast.error('请选择要上传的图片');
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error('请填写标题');
      return;
    }
    setUploading(true);
    try {
      const imageUrl: string = await uploadImage(uploadFile, 'collection');

      const body: {
        title: string;
        description?: string;
        imageUrl: string;
        category?: string;
        thumbX: number;
        thumbY: number;
        thumbW: number;
        thumbH: number;
      } = {
        title: uploadTitle.trim(),
        imageUrl,
        thumbX: uploadCrop.thumbX,
        thumbY: uploadCrop.thumbY,
        thumbW: uploadCrop.thumbW,
        thumbH: uploadCrop.thumbH,
      };
      if (uploadDescription.trim()) body.description = uploadDescription.trim();
      if (uploadCategory.trim()) body.category = uploadCategory.trim();

      await createCollectionCard(body);
      toast.success('上传成功！照片已加入收集册 🎉');
      clearUploadForm();
      setPage(1);
      loadList();
    } catch (err) {
      toast.error(
        '上传失败：' + ((err as Error).message || '请稍后再试'),
      );
    } finally {
      setUploading(false);
    }
  };

  const renderUploader = (card: CollectionCard): React.ReactNode => {
    if (!card.uploaderName) return null;
    return (
      <div className="flex items-center justify-center gap-1.5 mt-1">
        {card.uploaderAvatarUrl ? (
          <Image
            src={card.uploaderAvatarUrl}
            alt={card.uploaderName}
            className="w-5 h-5 rounded-full object-cover border border-cocoa/10"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-shiba flex items-center justify-center">
            <User className="w-3 h-3 text-paper" />
          </div>
        )}
        <span className="text-xs text-cocoa/60 truncate max-w-[100px]">
          {card.uploaderName}
        </span>
      </div>
    );
  };

  return (
     <div className="min-h-screen bg-cream py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="照片集" subtitle="收藏每一份小美好 💌" icon="📮" />

        {/* 上传区域 */}
        <div className="mb-10">
          {isAuthenticated ? (
             <div className="relative bg-paper rounded-xl p-4 sm:p-6 shadow-md border-2 border-cocoa/5">
              {/* 胶带装饰 */}
              <div className="tape-strip" />
              <div className="tape-strip tape-strip-blue" />

              <h3 className="font-handwriting text-2xl text-ink mb-4 text-center">
                📷 上传你的照片
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 图片上传区 */}
                <div className="md:col-span-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {uploadPreview ? (
                    <div className="relative">
                      <ImageCropper
                        imageUrl={uploadPreview}
                        value={uploadCrop}
                        onChange={setUploadCrop}
                        maxWidth={320}
                      />
                      <button
                        onClick={clearUploadForm}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-paper/90 text-cocoa flex items-center justify-center shadow hover:bg-shiba hover:text-paper transition z-10"
                        aria-label="移除图片"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs text-cocoa/50 text-center mt-2">
                        拖动方框选择缩略图显示区域（正方形）
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-square rounded-lg border-2 border-dashed border-shiba/40 bg-cream/50 flex flex-col items-center justify-center gap-2 text-cocoa/50 hover:border-shiba hover:text-shiba transition"
                    >
                      <ImagePlus className="w-10 h-10" />
                      <span className="font-handwriting text-lg">
                        点击选择图片
                      </span>
                    </button>
                  )}
                </div>

                {/* 表单字段 */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-sm text-cocoa/70 mb-1 font-handwriting">
                      标题 <span className="text-shiba">*</span>
                    </label>
                    <Input
                      value={uploadTitle}
                      onChange={(e): void => setUploadTitle(e.target.value)}
                      placeholder="给这张照片起个名字吧~"
                      className="bg-paper border-cocoa/20 focus-visible:ring-shiba/30 focus-visible:border-shiba"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-cocoa/70 mb-1 font-handwriting">
                      描述
                    </label>
                    <Textarea
                      value={uploadDescription}
                      onChange={(e): void =>
                        setUploadDescription(e.target.value)
                      }
                      placeholder="记录下这张照片的小故事..."
                      rows={3}
                      className="bg-paper border-cocoa/20 focus-visible:ring-shiba/30 focus-visible:border-shiba resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-cocoa/70 mb-1 font-handwriting">
                      分类
                    </label>
                    <Input
                      value={uploadCategory}
                      onChange={(e): void => setUploadCategory(e.target.value)}
                      placeholder="比如：小卡、周边、饭拍..."
                      className="bg-paper border-cocoa/20 focus-visible:ring-shiba/30 focus-visible:border-shiba"
                    />
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="rounded-full bg-shiba hover:bg-shiba/90 text-paper px-8 font-handwriting text-lg"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          上传中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          上传照片
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-paper rounded-xl p-8 shadow-md border-2 border-cocoa/5 text-center relative">
              <div className="tape-strip" />
              <div className="tape-strip tape-strip-blue" />
              <div className="text-5xl mb-3">🔒</div>
              <h3 className="font-handwriting text-2xl text-ink mb-2">
                登录后可以上传你的照片~
              </h3>
              <p className="text-cocoa/60 mb-5">
                加入 37line 小世界，分享你收集的美好 💌
              </p>
              <Button
                onClick={(): void => navigate('/login')}
                className="rounded-full bg-shiba hover:bg-shiba/90 text-paper px-8 font-handwriting text-lg"
              >
                去登录
              </Button>
            </div>
          )}
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
          {categories.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setPage(1);
              }}
               className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-handwriting text-base sm:text-lg transition-all card-wobble ${
                activeCategory === cat
                  ? `${stickerColors[idx % stickerColors.length]} shadow-md scale-105 border-2 border-cocoa/10`
                  : 'bg-paper text-cocoa/70 border-2 border-cocoa/10 hover:border-shiba'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <LoadingSpinner text="正在整理收集册..." />}
        {error && <ErrorState message={error} />}

        {!loading && !error && data && (
          <>
            {data.items.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🖼️</div>
                <p className="font-handwriting text-2xl text-cocoa/60">
                  这个分类还没有照片呢～
                </p>
              </div>
            ) : (
               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {data.items.map((card, idx) => {
                  const rotation =
                    card.rotationDegree || ((idx % 5) - 2) * 1.5;
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className="polaroid-frame cursor-pointer card-wobble transition-transform hover:scale-105 hover:shadow-lg"
                      style={{ transform: `rotate(${rotation}deg)` }}
                    >
                      <div className="aspect-square bg-grid-pattern rounded-sm overflow-hidden">
                        {card.imageUrl ? (
                          <ThumbImage
                            card={card}
                            className="w-full h-full"
                          />
                        ) : (
                          <Image
                            src={`https://picsum.photos/seed/${card.id}/400/400`}
                            alt={card.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                     <div className="mt-1 sm:mt-2 text-center">
                       <p className="font-handwriting text-base sm:text-xl text-ink truncate">
                          {card.title}
                        </p>
                        <p className="text-xs text-cocoa/50">{card.category}</p>
                        {renderUploader(card)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <StickerPagination
              page={data.page}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
            />
          </>
        )}

        <Dialog
          open={!!selectedCard}
          onOpenChange={(open): void => !open && setSelectedCard(null)}
        >
          <DialogContent
            className="max-w-xl bg-transparent border-none shadow-none p-0"
            showCloseButton={false}
          >
            {selectedCard && (
              <div
                className="polaroid-frame mx-auto"
                style={{ transform: 'rotate(-1deg)', maxWidth: '480px' }}
              >
                <div className="aspect-square bg-grid-pattern rounded-sm overflow-hidden">
                  <Image
                    src={
                      selectedCard.imageUrl ||
                      `https://picsum.photos/seed/${selectedCard.id}/600/600`
                    }
                    alt={selectedCard.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-handwriting text-2xl text-ink">
                    {selectedCard.title}
                  </h3>
                  <p className="text-sm text-cocoa/60 mt-1">
                    {selectedCard.category}
                  </p>
                  {renderUploader(selectedCard)}
                  {selectedCard.description && (
                    <div className="text-sm text-cocoa/80 mt-3 px-4">
                      {renderContentWithButtons(selectedCard.description, { textClassName: 'text-sm text-cocoa/80' })}
                    </div>
                  )}
                </div>
                <DialogClose className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-shiba text-paper font-handwriting shadow-md hover:scale-110 transition">
                  ✕
                </DialogClose>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CollectionPage;
