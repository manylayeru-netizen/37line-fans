import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, PawPrint } from 'lucide-react';
import { useAuthStore } from '@client/src/store/auth.store';

interface LoginFormValues {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: Location })?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.username, data.password);
      toast.success('登录成功！欢迎回到 37line 的小世界 ✨');
      navigate(from, { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err?.response?.data?.message || '登录失败，请检查用户名和密码';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-cream bg-grid-pattern flex items-center justify-center p-4">
      {/* Decorative stickers */}
      <div className="absolute top-10 left-10 text-6xl opacity-20 transform -rotate-12">
        ☁️
      </div>
      <div className="absolute top-20 right-16 text-5xl opacity-20 transform rotate-12">
        ⭐
      </div>
      <div className="absolute bottom-20 left-20 text-5xl opacity-20 transform rotate-6">
        🌸
      </div>
      <div className="absolute bottom-16 right-10 text-6xl opacity-20 transform -rotate-6">
        🐾
      </div>

      <div className="relative w-full max-w-md">
        {/* Notebook card */}
        <div className="relative bg-paper rounded-2xl shadow-xl border-2 border-dashed border-grid overflow-hidden">
          {/* Tape decoration */}
          <div className="absolute -top-3 left-8 w-20 h-6 bg-tape-pink opacity-70 transform -rotate-6 rounded-sm shadow-sm z-10" />
          <div className="absolute -top-3 right-8 w-20 h-6 bg-tape-blue opacity-70 transform rotate-6 rounded-sm shadow-sm z-10" />

          {/* Spiral binding */}
          <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-grid/40 flex flex-col items-center justify-around py-6 sm:py-8">
             {Array.from({ length: 8 }).map((_, i) => (
               <div
                 key={i}
                 className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-paper border-2 border-cocoa/20 shadow-inner"
               />
             ))}
           </div>

           <div className="pl-9 sm:pl-12 pr-5 sm:pr-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-3">
                <PawPrint className="text-shiba w-8 h-8" strokeWidth={1.5} />
              </div>
               <h1
                 className="text-3xl sm:text-4xl text-ink mb-2"
                 style={{ fontFamily: 'var(--font-handwriting)' }}
               >
                37line
              </h1>
              <p className="text-sm text-cocoa/70 font-handwriting">
                回到我们的小世界
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                  用户名
                </label>
                 <input
                   type="text"
                   placeholder="请输入用户名"
                   className="w-full px-3 sm:px-4 py-2 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                  {...register('username', {
                    required: '请输入用户名',
                  })}
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-cocoa mb-1.5 font-handwriting">
                  密码
                </label>
                <div className="relative">
                     <input
                       type={showPassword ? 'text' : 'password'}
                       placeholder="请输入密码"
                       className="w-full px-3 sm:px-4 py-2 pr-10 sm:pr-11 bg-cream/50 border-2 border-grid rounded-xl text-cocoa text-sm sm:text-base placeholder:text-cocoa/40 focus:outline-none focus:border-shiba/60 focus:bg-paper transition-all"
                    {...register('password', {
                      required: '请输入密码',
                      minLength: {
                        value: 6,
                        message: '密码至少 6 位',
                      },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa/50 hover:text-cocoa transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-shiba text-white rounded-full font-medium shadow-md hover:bg-shiba/90 hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? '登录中...' : '登 录'}
              </button>
            </form>

            {/* Footer link */}
            <div className="mt-6 text-center text-sm text-cocoa/70">
              还没有账号？{' '}
              <Link
                to="/register"
                className="text-penguin font-medium hover:underline underline-offset-2"
              >
                申请加入
              </Link>
            </div>

            {/* Decorative line */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-grid" />
              <span className="text-xs text-cocoa/40">🐹&amp;🐧</span>
              <div className="flex-1 h-px bg-grid" />
            </div>
          </div>
        </div>

        {/* Bottom shadow */}
        <div className="mt-4 text-center text-xs text-cocoa/50 font-handwriting">
          谢谢你来过 37line 的小世界
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
