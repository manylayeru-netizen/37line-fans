import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Heart } from 'lucide-react';
import { authApi } from '@client/src/api';
import { useAuthStore } from '@client/src/store/auth.store';

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
    email: z.string().email('请输入有效的邮箱地址'),
    verifyCode: z
      .string()
      .length(6, '验证码为 6 位数字')
      .regex(/^\d{6}$/, '验证码为 6 位数字'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sendingCode, setSendingCode] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const navigate = useNavigate();
  const registerWithVerify = useAuthStore((state) => state.registerWithVerify);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      email: '',
      verifyCode: '',
    },
  });

  const emailValue = watch('email');

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    const email = emailValue?.trim();
    if (!email) {
      toast.error('请先输入邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('邮箱格式不正确');
      return;
    }

    setSendingCode(true);
    try {
      await authApi.sendVerifyCode(email, 'register');
      toast.success('验证码已发送，请查收邮件');
      setCountdown(60);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || '发送失败，请稍后再试';
      toast.error(msg);
    } finally {
      setSendingCode(false);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      await registerWithVerify({
        username: data.username,
        password: data.password,
        displayName: data.displayName,
        email: data.email,
        verifyCode: data.verifyCode,
      });
      toast.success('注册成功，欢迎加入~');
      navigate('/');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || '注册失败，请稍后再试';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream bg-grid-pattern flex items-center justify-center p-4 py-8">
      <div className="absolute top-10 right-10 text-5xl opacity-20 transform rotate-12">
        ✨
      </div>
      <div className="absolute bottom-20 left-16 text-5xl opacity-20 transform -rotate-6">
        🌟
      </div>

      <div className="relative w-full max-w-lg">
        <div className="relative bg-paper rounded-2xl shadow-xl border-2 border-dashed border-grid overflow-hidden">
          <div className="absolute -top-3 left-1/4 w-20 h-6 bg-tape-blue opacity-70 transform -rotate-6 rounded-sm shadow-sm z-10" />
          <div className="absolute -top-3 right-1/4 w-20 h-6 bg-tape-pink opacity-70 transform rotate-6 rounded-sm shadow-sm z-10" />

          <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-grid/40 flex flex-col items-center justify-around py-6 sm:py-8">
             {Array.from({ length: 10 }).map((_, i) => (
               <div
                 key={i}
                 className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-paper border-2 border-cocoa/20 shadow-inner"
               />
             ))}
           </div>

           <div className="pl-9 sm:pl-12 pr-5 sm:pr-8 pt-8 sm:pt-10 pb-6 sm:pb-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <Heart className="text-shiba w-7 h-7" fill="currentColor" />
              </div>
               <h1
                 className="text-2xl sm:text-3xl text-ink mb-1"
                 style={{ fontFamily: 'var(--font-handwriting)' }}
               >
                 注册 37line
               </h1>
               <p className="text-sm text-cocoa/70 font-handwriting">
                 邮箱验证，即时加入
               </p>
             </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                  用户名 <span className="text-destructive">*</span>
                </label>
                 <input
                   type="text"
                   placeholder="字母、数字、下划线"
                   className="w-full px-3 sm:px-4 py-2 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                    密码 <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                     <input
                       type={showPassword ? 'text' : 'password'}
                       placeholder="至少 6 位"
                       className="w-full px-3 sm:px-4 py-2 pr-10 sm:pr-11 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
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
                     className="w-full px-3 sm:px-4 py-2 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                    昵称 <span className="text-destructive">*</span>
                  </label>
                   <input
                     type="text"
                     placeholder="你的可爱昵称"
                     className="w-full px-3 sm:px-4 py-2 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
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
                    邮箱 <span className="text-destructive">*</span>
                  </label>
                   <input
                     type="email"
                     placeholder="your@email.com"
                     className="w-full px-3 sm:px-4 py-2 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                  验证码 <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                   <input
                     type="text"
                     placeholder="6 位数字验证码"
                     maxLength={6}
                     className="flex-1 px-3 sm:px-4 py-2 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all tracking-widest font-mono"
                    {...register('verifyCode')}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || countdown > 0}
                    className="px-4 py-2 bg-penguin text-white rounded-xl text-sm font-medium whitespace-nowrap hover:bg-penguin/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sendingCode
                      ? '发送中...'
                      : countdown > 0
                        ? `${countdown}s 后重发`
                        : '获取验证码'}
                  </button>
                </div>
                {errors.verifyCode && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.verifyCode.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-shiba text-white rounded-full font-medium shadow-md hover:bg-shiba/90 hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '注册中...' : '注册'}
              </button>
            </form>

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

        <div className="mt-4 text-center text-xs text-cocoa/50 font-handwriting">
          谢谢你来过 37line 的小世界
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
