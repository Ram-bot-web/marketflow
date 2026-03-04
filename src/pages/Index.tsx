import { Link } from 'react-router-dom';
import { R } from '@/lib/routes';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { 
  BarChart3, 
  Target, 
  Zap, 
  TrendingUp, 
  Users, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Strategic Planning',
    description: 'Get a customized marketing strategy tailored to your business goals and target audience.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track your campaign performance with detailed insights and actionable metrics.',
  },
  {
    icon: TrendingUp,
    title: 'Growth Focused',
    description: 'Scale your marketing efforts with data-driven optimizations and proven strategies.',
  },
  {
    icon: Users,
    title: 'Dedicated Support',
    description: 'Work with marketing experts who understand your industry and business needs.',
  },
];

const benefits = [
  'Custom marketing strategies',
  'Monthly performance reports',
  'Multi-platform campaigns',
  'Asset management portal',
  'Direct communication channel',
  'Budget optimization',
];

// Animated Background Component
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Large Gradient Orbs */}
      <motion.div
        className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 70%)',
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.25) 0%, rgba(147, 51, 234, 0) 70%)',
        }}
        animate={{
          x: [0, -60, 0],
          y: [0, 80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute bottom-[10%] left-[30%] w-[450px] h-[450px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0) 70%)',
        }}
        animate={{
          x: [0, -40, 0],
          y: [0, -60, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Animated Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {[...Array(5)].map((_, i) => (
          <motion.line
            key={i}
            x1={`${i * 25}%`}
            y1="0%"
            x2={`${i * 25 + 10}%`}
            y2="100%"
            stroke="url(#lineGradient)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0, 0.5, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>

      {/* Floating Particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-blue-500"
          style={{
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, Math.random() * -100 - 50, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: Math.random() * 5 + 3,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(59, 130, 246) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(59, 130, 246) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      
      <div className="relative z-10">
        <PublicNavbar />
        
        {/* Hero Section */}
        <section className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Marketing Made Simple
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
                Grow Your Business with{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
                  MarketFlow
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
                The all-in-one marketing dashboard that helps you plan, execute, and measure your
                marketing campaigns with clarity and confidence.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Button size="lg" className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto" asChild>
                  <Link to={R.REGISTER}>
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base w-full sm:w-auto" asChild>
                  <Link to={R.LOGIN}>View Demo</Link>
                </Button>
              </div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              className="mt-10 sm:mt-12 md:mt-16 relative"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="aspect-video rounded-xl sm:rounded-2xl shadow-elevated overflow-hidden bg-card border border-border">
                <div className="w-full h-full bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-14 w-14 sm:h-16 md:h-20 sm:w-16 md:w-20 rounded-xl sm:rounded-2xl gradient-hero mx-auto mb-3 sm:mb-4 flex items-center justify-center animate-float">
                      <BarChart3 className="h-7 w-7 sm:h-8 md:h-10 sm:w-8 md:w-10 text-primary-foreground" />
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">Dashboard Preview</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-6 sm:h-8 bg-primary/20 blur-3xl" />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-16 md:py-20 px-4 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              className="text-center mb-10 sm:mb-12 md:mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
                Powerful tools and insights to take your marketing to the next level
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="p-6 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="h-12 w-12 rounded-lg gradient-hero flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Why Choose MarketFlow?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  We combine expert marketing strategies with powerful technology to deliver 
                  measurable results for your business.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                      <span className="text-foreground">{benefit}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/20 p-8 flex items-center justify-center">
                  <div className="w-full max-w-xs space-y-4">
                    <div className="h-4 rounded-full bg-primary/30 w-full" />
                    <div className="h-4 rounded-full bg-primary/20 w-4/5" />
                    <div className="h-4 rounded-full bg-accent/30 w-3/5" />
                    <div className="h-20 rounded-lg bg-card/80 shadow-card mt-6" />
                    <div className="h-20 rounded-lg bg-card/80 shadow-card" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <motion.div 
              className="rounded-2xl gradient-hero p-8 md:p-12 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Transform Your Marketing?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Join hundreds of businesses already using MarketFlow to grow their brand and reach new customers.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="h-12 px-8 text-base"
                  asChild
                >
                  <Link to={R.REGISTER}>Get Started Free</Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="h-12 px-8 text-base bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to={R.LOGIN}>Sign In</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border backdrop-blur-sm bg-card/30">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-foreground">MarketFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2024 MarketFlow. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;