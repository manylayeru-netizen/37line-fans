import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Heart } from 'lucide-react';
import { authApi } from '@client/src/api';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, '用户名至少 3 个字符')
      .max(20, '用户名不超过 20 个字符')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        '用户名只能包含字母、数字和下划线',
      ),
    password: z
      .string()
      .min(6, '密码至少 6 位')
      .max(32, '密码不超过 32 位'),
    confirmPassword: z.string().min(1, '请再次输入密码'),
    displayName: z
      .string()
      .min(1, '请输入昵称')
      .max(20, '昵称不超过 20 个字符'),
    email: z.string().email('请输入有效的邮箱地址').optional().or(z.literal('')),
    applicationReason: z
      .string()
      .min(10, '申请理由至少 10 个字')
      .max(500, '申请理由不超过 500 字'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      email: '',
      applicationReason: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      await authApi.register({
        username: data.username,
        password: data.password,
        displayName: data.displayName,
        email: data.email || undefined,
        applicationReason: data.applicationReason,
      });
      setSubmitted(true);
      toast.success('申请已提交~');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || '提交失败，请稍后再试';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-cream bg-grid-pattern flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="relative bg-paper rounded-2xl shadow-xl border-2 border-dashed border-grid p-10 text-center">
            {/* Tape */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-tape-pink opacity-70 transform -rotate-2 rounded-sm z-10" />

            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-mint/30 mb-4">
                <Heart className="text-shiba w-10 h-10" fill="currentColor" />
              </div>
              <h2
                className="text-3xl text-ink mb-3"
                style={{ fontFamily: 'var(--font-handwriting)' }}
              >
                申请已提交
              </h2>
              <p className="text-cocoa/80 leading-relaxed">
                感谢你想要加入 37line 的小世界~
                <br />
                管理员会尽快审核你的申请，
                <br />
                请耐心等待哦 ✨
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-shiba text-white rounded-full font-medium shadow-md hover:bg-shiba/90 hover:shadow-lg active:scale-[0.98] transition-all"
              >
                去登录
              </button>
              <Link
                to="/"
                className="block w-full py-3 text-penguin font-medium hover:underline underline-offset-2"
              >
                返回首页
              </Link>
            </div>

            {/* Paw prints decoration */}
            <div className="mt-6 flex justify-center gap-2 text-2xl opacity-30">
              <span>🐾</span>
              <span>🐾</span>
              <span>🐾</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream bg-grid-pattern flex items-center justify-center p-4 py-8">
      {/* Decorative stickers */}
      <div className="absolute top-10 right-10 text-5xl opacity-20 transform rotate-12">
        ✨
      </div>
      <div className="absolute bottom-20 left-16 text-5xl opacity-20 transform -rotate-6">
        🌟
      </div>

      <div className="relative w-full max-w-lg">
        {/* Notebook card */}
        <div className="relative bg-paper rounded-2xl shadow-xl border-2 border-dashed border-grid overflow-hidden">
          {/* Tape decoration */}
          <div className="absolute -top-3 left-1/4 w-20 h-6 bg-tape-blue opacity-70 transform -rotate-6 rounded-sm shadow-sm z-10" />
          <div className="absolute -top-3 right-1/4 w-20 h-6 bg-tape-pink opacity-70 transform rotate-6 rounded-sm shadow-sm z-10" />

          {/* Spiral binding */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-grid/40 flex flex-col items-center justify-around py-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-paper border-2 border-cocoa/20 shadow-inner"
              />
            ))}
          </div>

          <div className="pl-12 pr-8 pt-12 pb-8">
            {/* Title */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Heart className="text-shiba w-7 h-7" fill="currentColor" />
              </div>
              <h1
                className="text-3xl text-ink mb-1"
                style={{ fontFamily: 'var(--font-handwriting)' }}
              >
                申请加入 37line
              </h1>
              <p className="text-sm text-cocoa/70 font-handwriting">
                填写申请表，和我们一起写手帐吧~
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                  用户名 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="字母、数字、下划线"
                  className="w-full px-4 py-2.5 bg-cream/50 border-2 border-grid rounded-xl text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                    密码 <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="至少 6 位"
                      className="w-full px-4 py-2.5 pr-11 bg-cream/50 border-2 border-grid rounded-xl text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa/50 hover:text-cocoa transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                    确认密码 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="再输入一次"
                    className="w-full px-4 py-2.5 bg-cream/50 border-2 border-grid rounded-xl text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Display name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                    昵称 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="你的可爱昵称"
                    className="w-full px-4 py-2.5 bg-cream/50 border-2 border-grid rounded-xl text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                    {...register('displayName')}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.displayName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                    邮箱 <span className="text-cocoa/40">（选填）</span>
                  </label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-cream/50 border-2 border-grid rounded-xl text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Application reason */}
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                  申请理由 <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="说说你为什么想要加入 37line 的小世界吧~"
                  className="w-full px-4 py-3 bg-cream/50 border-2 border-grid rounded-xl text-cocoa placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all resize-none"
                  {...register('applicationReason')}
                />
                {errors.applicationReason && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.applicationReason.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-shiba text-white rounded-full font-medium shadow-md hover:bg-shiba/90 hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '提交中...' : '提交申请'}
              </button>
            </form>

            {/* Footer link */}
            <div className="mt-5 text-center text-sm text-cocoa/70">
              已有账号？{' '}
              <Link
                to="/login"
                className="text-penguin font-medium hover:underline underline-offset-2"
              >
                去登录
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="mt-4 text-center text-xs text-cocoa/50 font-handwriting">
          谢谢你来过 37line 的小世界
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
