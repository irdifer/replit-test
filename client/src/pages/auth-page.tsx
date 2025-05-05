import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  username: z.string().min(1, { message: "請輸入帳號" }),
  password: z.string().min(1, { message: "請輸入密碼" }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: "帳號至少需要3個字元" }),
  password: z.string().min(6, { message: "密碼至少需要6個字元" }),
  name: z.string().min(2, { message: "請輸入姓名" }),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  
  // Effect to handle successful registration
  useEffect(() => {
    if (registerMutation.isSuccess) {
      toast({
        title: "註冊成功",
        description: "請使用新帳號登入系統",
        variant: "default",
      });
      setActiveTab("login");
    }
  }, [registerMutation.isSuccess, toast]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
    },
  });

  // Handle login form submission
  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Handle register form submission
  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate({
      username: data.username,
      password: data.password,
      name: data.name,
      role: "volunteer",
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Hero Section */}
      <div className="bg-primary-500 text-white p-8 flex-1 flex flex-col justify-center items-center">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-2">🍀</h1>
          <h3 className="text-lg font-medium mb-4">三重分隊協勤出入/救護簿</h3>
          <h2 className="text-2xl font-medium mb-4">協勤/退勤/救護記錄系統</h2>
          <p className="text-primary-100 mb-6">
            這個系統幫助志工追蹤工作時數、救護案件和活動記錄。方便簡單的介面讓您可以輕鬆管理所有志工活動。
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-primary-600/40 p-4 rounded-lg">
              <h3 className="font-medium mb-1">協勤記錄</h3>
              <p className="text-sm text-primary-100">追蹤簽到/退勤時間</p>
            </div>
            <div className="bg-primary-600/40 p-4 rounded-lg">
              <h3 className="font-medium mb-1">救護紀錄</h3>
              <p className="text-sm text-primary-100">詳細的案件處理記錄</p>
            </div>
            <div className="bg-primary-600/40 p-4 rounded-lg">
              <h3 className="font-medium mb-1">統計分析</h3>
              <p className="text-sm text-primary-100">查看工作時數與案件</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Forms */}
      <div className="flex-1 p-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>歡迎使用</CardTitle>
            <CardDescription>
              請登入或註冊以使用三重分隊記錄系統
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">登入</TabsTrigger>
                <TabsTrigger value="register">註冊</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>帳號</FormLabel>
                          <FormControl>
                            <Input placeholder="請輸入帳號" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>密碼</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="請輸入密碼"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "登入中..." : "登入"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>帳號</FormLabel>
                          <FormControl>
                            <Input placeholder="請設定帳號" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>姓名</FormLabel>
                          <FormControl>
                            <Input placeholder="請輸入姓名" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>密碼</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="請設定密碼"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "註冊中..." : "註冊"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
