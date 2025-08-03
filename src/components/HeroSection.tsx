import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { ArrowDown, Sparkles, Zap, Target, Brain, TrendingUp, Users, Lightbulb, CheckCircle, Star } from 'lucide-react';
import TextType from '@/components/ui/texttype';
import MagicBento from '@/components/ui/magicbento';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  onScrollToForm: () => void;
}

export const HeroSection = ({ onScrollToForm }: HeroSectionProps) => {
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    const cta = ctaRef.current;
    const features = featuresRef.current;

    if (!hero || !title || !subtitle || !cta || !features) return;

    // Reset initial states
    gsap.set([title, subtitle, cta, features], { 
      opacity: 0, 
      y: 50 
    });

    // Create timeline for entrance animations
    const tl = gsap.timeline({ delay: 0.2 });

    tl.to(title, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out"
    })
    .to(subtitle, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.5")
    .to(cta, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.3")
    .to(features, {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.3");

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation Header */}
      <nav className="relative z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                StartwiseAI
              </h1>
              <p className="text-xs text-gray-400 font-medium">Startup Intelligence</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-300 hover:text-white transition-colors font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors font-medium">
              How it Works
            </a>
            <a href="#evaluation" className="text-gray-300 hover:text-white transition-colors font-medium">
              Start Evaluation
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative flex items-center justify-center px-6 py-20 overflow-hidden"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-8">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">AI-Powered Startup Evaluation</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>

          {/* Main Headline */}
          <h1 
            ref={titleRef}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
          >
            <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
              Transform Ideas Into
            </span>
            <br />
            <div className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              <TextType 
                text={["Investment-Ready Pitches", "Market Intelligence", "Strategic Success"]}
                typingSpeed={75}
                pauseDuration={1500}
                showCursor={true}
                cursorCharacter="|"
                className="inline-block"
              />
            </div>
          </h1>

          {/* Subtitle */}
          <p 
            ref={subtitleRef}
            className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            Get comprehensive startup evaluations powered by advanced AI. From market analysis to pitch generation, 
            <span className="text-purple-400 font-semibold"> StartwiseAI</span> provides the insights you need to succeed.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">6</div>
              <div className="text-sm text-gray-400">Analysis Sections</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">&lt;3min</div>
              <div className="text-sm text-gray-400">Evaluation Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">99%</div>
              <div className="text-sm text-gray-400">Accuracy Rate</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              onClick={onScrollToForm}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105 group"
            >
              <Lightbulb className="mr-2 h-5 w-5 group-hover:animate-pulse" />
              Evaluate Your Startup Idea
              <ArrowDown className="ml-2 h-5 w-5 group-hover:translate-y-1 transition-transform" />
            </Button>
            <Button 
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 px-8 py-4 rounded-xl backdrop-blur-sm"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              See Demo
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-purple-400/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-purple-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Preview Section */}
      <section id="features" className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">StartwiseAI</span>?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our AI-powered platform provides comprehensive startup evaluation that goes beyond basic analysis
            </p>
          </div>

          {/* Feature Grid with MagicBento */}
          <div ref={featuresRef} className="max-w-7xl mx-auto">
            <MagicBento
              cards={[
                {
                  color: "rgba(76, 29, 149, 0.2)", // #4c1d95 with transparency
                  style: {
                    backdropFilter: "blur(12px)",
                    backgroundColor: "rgba(76, 29, 149, 0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                  title: "AI-Powered Analysis",
                  description:
                    "Advanced RAG technology analyzes your startup idea against real market data, competitor insights, and industry trends.",
                  label: "Real-time Market Data",
                },
                {
                  color: "rgba(12, 74, 110, 0.2)",
                  style: {
                    backdropFilter: "blur(12px)",
                    backgroundColor: "rgba(12, 74, 110, 0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                  title: "6-Section Evaluation",
                  description:
                    "Comprehensive analysis covering uniqueness, tech stack, pitch generation, competitors, improvements, and success probability.",
                  label: "Complete Coverage",
                },
                {
                  color: "rgba(6, 95, 70, 0.2)",
                  style: {
                    backdropFilter: "blur(12px)",
                    backgroundColor: "rgba(6, 95, 70, 0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                  title: "Investment Ready",
                  description:
                    "Generate professional pitches and presentations that investors want to see, backed by market data and insights.",
                  label: "Investor Grade",
                },
                {
                  color: "rgba(146, 64, 14, 0.2)",
                  style: {
                    backdropFilter: "blur(12px)",
                    backgroundColor: "rgba(146, 64, 14, 0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                  title: "Lightning Fast",
                  description:
                    "Get comprehensive startup evaluations in under 3 minutes. No more weeks of manual research and analysis.",
                  label: "Instant Results",
                },
                {
                  color: "rgba(190, 24, 93, 0.2)",
                  style: {
                    backdropFilter: "blur(12px)",
                    backgroundColor: "rgba(190, 24, 93, 0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                  title: "Market Intelligence",
                  description:
                    "Deep competitor analysis and market positioning insights to help you find your unique advantage in the market.",
                  label: "Competitive Edge",
                },
                {
                  color: "rgba(99, 102, 241, 0.2)",
                  style: {
                    backdropFilter: "blur(12px)",
                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                  title: "Smart Recommendations",
                  description:
                    "Get actionable tech stack recommendations, improvement suggestions, and strategic guidance for your startup journey.",
                  label: "Strategic Guidance",
                },
              ]}
              textAutoHide={true}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={true}
              enableMagnetism={true}
              clickEffect={true}
              spotlightRadius={300}
              particleCount={12}
              glowColor="132, 0, 255"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How It <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Simple 3-step process to get comprehensive startup evaluation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/50">
                  <span className="text-2xl font-bold text-white">1</span>
                </div>
                <div className="absolute top-10 right-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 hidden md:block"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Describe Your Idea</h3>
              <p className="text-gray-300">
                Tell us about your startup idea, target industry, and audience. Upload any relevant documents for enhanced analysis.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/50">
                  <span className="text-2xl font-bold text-white">2</span>
                </div>
                <div className="absolute top-10 right-0 w-full h-0.5 bg-gradient-to-r from-cyan-500 to-green-500 hidden md:block"></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">AI Analysis</h3>
              <p className="text-gray-300">
                Our advanced AI analyzes your idea using RAG technology, market data, and competitor intelligence.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/50">
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Get Results</h3>
              <p className="text-gray-300">
                Receive a comprehensive 6-section evaluation with actionable insights and investment-ready pitch materials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-3xl p-12 backdrop-blur-sm border border-white/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Startup Idea?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of entrepreneurs who've used StartwiseAI to validate and refine their startup concepts.
            </p>
            <Button 
              onClick={onScrollToForm}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold px-12 py-6 rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105 group"
            >
              <Lightbulb className="mr-3 h-6 w-6 group-hover:animate-pulse" />
              Start Your Free Evaluation
              <ArrowDown className="ml-3 h-6 w-6 group-hover:translate-y-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};